import asyncio
import json
import socket
from unittest.mock import AsyncMock, patch

from asgiref.testing import ApplicationCommunicator
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db import transaction
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from groups.models import Group, GroupMember
from .events import publish

MEMORY_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}


@override_settings(CHANNEL_LAYERS=MEMORY_LAYERS)
class EventCommitTests(TestCase):
    def setUp(self):
        self.retry_patch = patch("config.realtime.events._retry_after", 0)
        self.retry_patch.start()
        self.addCleanup(self.retry_patch.stop)

    def test_events_are_sent_only_after_commit(self):
        with patch("config.realtime.events.get_channel_layer") as layer:
            layer.return_value.group_send = AsyncMock()
            with self.captureOnCommitCallbacks(execute=True):
                publish("group.GROUP001", "menu.changed", "GROUP001")
                layer.return_value.group_send.assert_not_called()
            layer.return_value.group_send.assert_awaited_once()

    def test_rollback_does_not_publish(self):
        with patch("config.realtime.events.get_channel_layer") as layer:
            with self.captureOnCommitCallbacks(execute=True):
                try:
                    with transaction.atomic():
                        publish("group.GROUP001", "menu.changed", "GROUP001")
                        raise ValueError("rollback")
                except ValueError:
                    pass
            layer.assert_not_called()

    def test_redis_failure_does_not_fail_committed_write(self):
        with patch("config.realtime.events.get_channel_layer") as layer:
            layer.return_value.group_send = AsyncMock(side_effect=ConnectionError())
            with self.assertLogs("config.realtime.events", level="WARNING"):
                with self.captureOnCommitCallbacks(execute=True):
                    publish("group.GROUP001", "menu.changed", "GROUP001")
            with self.captureOnCommitCallbacks(execute=True):
                publish("group.GROUP001", "shopping_list.changed", "GROUP001")
            layer.return_value.group_send.assert_awaited_once()


@override_settings(
    CHANNEL_LAYERS=MEMORY_LAYERS, CORS_ALLOWED_ORIGINS=["http://localhost:4200"]
)
class WebsocketTests(TransactionTestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="member")
        self.pending = get_user_model().objects.create_user(username="pending")
        self.group = Group.objects.create(group_code="GROUP001", group_name="Casa")
        self.membership = GroupMember.objects.create(
            user=self.user, group=self.group, accepted=True, role="ADMIN"
        )
        self.pending_membership = GroupMember.objects.create(
            user=self.pending, group=self.group, accepted=False
        )
        self.token = str(AccessToken.for_user(self.user))
        self.pending_token = str(AccessToken.for_user(self.pending))

    async def connect(self, token=None, origin="http://localhost:4200"):
        from config.asgi import application

        client = ApplicationCommunicator(
            application,
            {
                "type": "websocket",
                "path": "/ws/events/",
                "headers": [(b"origin", origin.encode())],
                "query_string": b"",
                "subprotocols": [],
            },
        )
        await client.send_input({"type": "websocket.connect"})
        response = await client.receive_output()
        if token:
            self.assertEqual(response["type"], "websocket.accept")
            await self.send(client, {"type": "authenticate", "token": token})
            self.assertEqual(await self.read(client), {"type": "ready"})
        return client, response

    async def send(self, client, data):
        await client.send_input({"type": "websocket.receive", "text": json.dumps(data)})

    async def read(self, client):
        message = await client.receive_output(timeout=2)
        self.assertEqual(message["type"], "websocket.send")
        return json.loads(message["text"])

    async def disconnect(self, client):
        await client.send_input({"type": "websocket.disconnect", "code": 1000})
        await client.wait()

    async def test_invalid_origin_is_rejected(self):
        client, response = await self.connect(origin="https://untrusted.example")
        self.assertEqual(response["type"], "websocket.close")
        await self.disconnect(client)

    async def test_authentication_required_and_invalid_token_rejected(self):
        for message in [
            {"type": "subscribe", "group_code": "GROUP001"},
            {"type": "authenticate", "token": "invalid"},
        ]:
            client, _ = await self.connect()
            await self.send(client, message)
            self.assertEqual((await client.receive_output())["code"], 4401)
            await self.disconnect(client)

    async def test_pending_user_cannot_subscribe_to_private_group(self):
        client, _ = await self.connect(self.pending_token)
        await self.send(client, {"type": "subscribe", "group_code": "GROUP001"})
        self.assertEqual((await self.read(client))["type"], "subscription.denied")
        await self.disconnect(client)

    async def test_connection_closes_when_client_floods_messages(self):
        client, _ = await self.connect(self.token)
        for _ in range(29):
            await self.send(client, {"type": "ping"})
            await self.read(client)
        await self.send(client, {"type": "ping"})
        self.assertEqual((await client.receive_output())["code"], 4408)
        await self.disconnect(client)

    async def test_group_isolation_and_switching_subscriptions(self):
        client, _ = await self.connect(self.token)
        await self.send(client, {"type": "subscribe", "group_code": "GROUP001"})
        self.assertEqual((await self.read(client))["type"], "subscribed")
        layer = get_channel_layer()
        await layer.group_send(
            "group.OTHER001",
            {
                "type": "notify",
                "personal": False,
                "event": {"type": "shopping_list.changed", "group_code": "OTHER001"},
            },
        )
        self.assertTrue(await client.receive_nothing(timeout=0.05))
        await layer.group_send(
            "group.GROUP001",
            {
                "type": "notify",
                "personal": False,
                "event": {"type": "shopping_list.changed", "group_code": "GROUP001"},
            },
        )
        self.assertEqual((await self.read(client))["type"], "shopping_list.changed")
        await self.send(client, {"type": "subscribe", "group_code": None})
        await self.read(client)
        await layer.group_send(
            "group.GROUP001",
            {
                "type": "notify",
                "personal": False,
                "event": {"type": "menu.changed", "group_code": "GROUP001"},
            },
        )
        self.assertTrue(await client.receive_nothing(timeout=0.05))
        await self.disconnect(client)

    async def test_acceptance_delivered_to_personal_channel(self):
        client, _ = await self.connect(self.pending_token)

        @database_sync_to_async
        def accept():
            self.pending_membership.accepted = True
            self.pending_membership.save()

        await accept()
        self.assertEqual(
            await self.read(client),
            {
                "type": "membership.decided",
                "group_code": "GROUP001",
                "status": "accepted",
            },
        )
        await self.disconnect(client)

    async def test_rejection_and_group_deletion_notify_waiting_user(self):
        client, _ = await self.connect(self.pending_token)
        await database_sync_to_async(self.pending_membership.delete)()
        self.assertEqual((await self.read(client))["status"], "rejected")
        await self.disconnect(client)
        client, _ = await self.connect(self.token)
        await database_sync_to_async(self.group.delete)()
        self.assertEqual((await self.read(client))["type"], "group.deleted")
        await self.disconnect(client)

    async def test_permission_is_rechecked_even_when_revocation_event_is_missed(self):
        client, _ = await self.connect(self.token)
        await self.send(client, {"type": "subscribe", "group_code": "GROUP001"})
        await self.read(client)
        await database_sync_to_async(
            GroupMember.objects.filter(pk=self.membership.pk).update
        )(accepted=False)
        await get_channel_layer().group_send(
            "group.GROUP001",
            {
                "type": "notify",
                "personal": False,
                "event": {"type": "menu.changed", "group_code": "GROUP001"},
            },
        )
        self.assertEqual((await self.read(client))["type"], "membership.revoked")
        await self.send(client, {"type": "ping"})
        self.assertEqual((await self.read(client))["type"], "pong")
        await self.disconnect(client)

    async def test_malformed_message_and_expired_connection_are_closed(self):
        client, _ = await self.connect(self.token)
        await client.send_input({"type": "websocket.receive", "text": "["})
        self.assertEqual((await client.receive_output())["code"], 4400)
        await self.disconnect(client)
        with patch("config.realtime.consumer.time.time", return_value=10**12):
            client, _ = await self.connect(self.token)
            self.assertEqual((await client.receive_output())["code"], 4401)
            await self.disconnect(client)

    def test_membership_endpoint_is_personal_and_requires_authentication(self):
        client = APIClient()
        self.assertEqual(
            client.get("/api/groups/GROUP001/membership/").status_code, 401
        )
        client.force_authenticate(self.pending)
        self.assertEqual(
            client.get("/api/groups/GROUP001/membership/").data, {"status": "pending"}
        )
        client.force_authenticate(self.user)
        self.assertEqual(
            client.get("/api/groups/GROUP001/membership/").data, {"status": "accepted"}
        )
        self.assertEqual(
            client.get("/api/groups/OTHER001/membership/").data, {"status": "none"}
        )

    async def test_real_uvicorn_socket_receives_http_menu_and_list_changes(self):
        import requests
        import uvicorn
        from websockets.asyncio.client import connect
        from config.asgi import application
        from ingredients.models import Ingredient
        from recipes.models import Recipe, IngredientInRecipe

        @database_sync_to_async
        def recipe_fixture():
            ingredient = Ingredient.objects.create(
                id_ingredient="test-egg", name="Huevo", reference_format="ud"
            )
            recipe = Recipe.objects.create(
                user=self.user, name="Receta", description="", visibility="PUBLIC"
            )
            IngredientInRecipe.objects.create(
                recipe=recipe, ingredient=ingredient, amount="2.000", unit="ud"
            )
            return recipe.pk

        recipe_id = await recipe_fixture()
        listener = socket.socket()
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
        config = uvicorn.Config(
            application,
            host="127.0.0.1",
            port=port,
            lifespan="off",
            ws="websockets-sansio",
            ws_max_size=2048,
            log_level="error",
        )
        server = uvicorn.Server(config)
        running = asyncio.create_task(server.serve(sockets=[listener]))
        try:
            async with asyncio.timeout(5):
                while not server.started:
                    if running.done():
                        await running
                    await asyncio.sleep(0.01)
            async with connect(
                f"ws://127.0.0.1:{port}/ws/events/", origin="http://localhost:4200"
            ) as client:
                await client.send(
                    json.dumps({"type": "authenticate", "token": self.token})
                )
                self.assertEqual(json.loads(await client.recv())["type"], "ready")
                await client.send(
                    json.dumps({"type": "subscribe", "group_code": "GROUP001"})
                )
                self.assertEqual(json.loads(await client.recv())["type"], "subscribed")
                url = f"http://127.0.0.1:{port}/api/menus/GROUP001/"
                headers = {"Authorization": f"Bearer {self.token}"}
                body = {
                    "id_recipe": recipe_id,
                    "date": timezone.localdate().isoformat(),
                    "time": "LUNCH",
                }
                response = await asyncio.to_thread(
                    requests.post, url, json=body, headers=headers, timeout=5
                )
                self.assertEqual(response.status_code, 201, response.text)
                events = [
                    json.loads(await asyncio.wait_for(client.recv(), 2))
                    for _ in range(2)
                ]
                self.assertEqual(
                    {event["type"] for event in events},
                    {"menu.changed", "shopping_list.changed"},
                )
                response = await asyncio.to_thread(
                    requests.delete, url, json=body, headers=headers, timeout=5
                )
                self.assertEqual(response.status_code, 200, response.text)
                events = [
                    json.loads(await asyncio.wait_for(client.recv(), 2))
                    for _ in range(2)
                ]
                self.assertEqual(
                    {event["type"] for event in events},
                    {"menu.changed", "shopping_list.changed"},
                )
        finally:
            server.should_exit = True
            await asyncio.wait_for(running, 5)
            listener.close()
