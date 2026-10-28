import asyncio
import json
import time
from collections import deque

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from groups.models import GroupMember
from rest_framework_simplejwt.authentication import JWTAuthentication


class EventsConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.messages = deque()
        self.user_id = None
        self.group_code = None
        self.expires = 0
        self.expiry_timer = None
        await self.accept()
        self.auth_timer = asyncio.get_running_loop().call_later(
            5, lambda: asyncio.create_task(self.close(code=4401))
        )

    async def disconnect(self, code):
        self.auth_timer.cancel()
        if self.expiry_timer:
            self.expiry_timer.cancel()
        try:
            if self.user_id:
                await self.channel_layer.group_discard(
                    f"user.{self.user_id}", self.channel_name
                )
            if self.group_code:
                await self.channel_layer.group_discard(
                    f"group.{self.group_code}", self.channel_name
                )
        except Exception:
            pass  # Redis puede estar caído durante la desconexión.

    @database_sync_to_async
    def authenticate(self, token):
        auth = JWTAuthentication()
        validated = auth.get_validated_token(token)
        user = auth.get_user(validated)
        return user.pk, validated["exp"]

    @database_sync_to_async
    def has_access(self, code):
        return GroupMember.objects.filter(
            user_id=self.user_id, group__group_code=code, accepted=True
        ).exists()

    async def receive(self, text_data=None, bytes_data=None, **kwargs):
        now = time.monotonic()
        while self.messages and self.messages[0] < now - 10:
            self.messages.popleft()
        if len(self.messages) >= 30:
            await self.close(code=4408)
            return
        self.messages.append(now)
        if not text_data or len(text_data.encode()) > 2048:
            await self.close(code=4400)
            return
        try:
            data = json.loads(text_data)
        except (ValueError, TypeError):
            await self.close(code=4400)
            return
        if not isinstance(data, dict):
            await self.close(code=4400)
            return
        try:
            await self.handle_message(data)
        except Exception:
            await self.close(code=1013)

    async def handle_message(self, data):
        if not self.user_id:
            if data.get("type") != "authenticate" or not isinstance(
                data.get("token"), str
            ):
                await self.close(code=4401)
                return
            try:
                self.user_id, self.expires = await self.authenticate(data["token"])
            except Exception:
                await self.close(code=4401)
                return
            self.auth_timer.cancel()
            self.expiry_timer = asyncio.get_running_loop().call_later(
                max(0, self.expires - time.time()),
                lambda: asyncio.create_task(self.close(code=4401)),
            )
            await self.channel_layer.group_add(
                f"user.{self.user_id}", self.channel_name
            )
            await self.send_json({"type": "ready"})
            return

        if time.time() >= self.expires:
            await self.close(code=4401)
            return
        if data.get("type") == "subscribe":
            code = data.get("group_code")
            if code is not None and (
                not isinstance(code, str)
                or len(code) != 8
                or not code.isascii()
                or not code.isalnum()
            ):
                await self.close(code=4400)
                return
            if self.group_code:
                await self.channel_layer.group_discard(
                    f"group.{self.group_code}", self.channel_name
                )
                self.group_code = None
            if code:
                if not await self.has_access(code):
                    await self.send_json(
                        {"type": "subscription.denied", "group_code": code}
                    )
                    return
                await self.channel_layer.group_add(f"group.{code}", self.channel_name)
                self.group_code = code
            await self.send_json({"type": "subscribed", "group_code": code})
        elif data.get("type") == "ping":
            if self.group_code and not await self.has_access(self.group_code):
                await self.revoke(self.group_code)
            await self.send_json({"type": "pong"})
        else:
            await self.close(code=4400)

    async def revoke(self, code):
        await self.channel_layer.group_discard(f"group.{code}", self.channel_name)
        self.group_code = None
        await self.send_json({"type": "membership.revoked", "group_code": code})

    async def notify(self, message):
        if time.time() >= self.expires:
            await self.close(code=4401)
            return
        event = message["event"]
        code = event["group_code"]
        if not message["personal"]:
            if code != self.group_code:
                return
            if not await self.has_access(code):
                await self.revoke(code)
                return
        elif (
            event["type"] in ("membership.revoked", "group.deleted")
            and code == self.group_code
        ):
            await self.channel_layer.group_discard(f"group.{code}", self.channel_name)
            self.group_code = None
        await self.send_json(event)
