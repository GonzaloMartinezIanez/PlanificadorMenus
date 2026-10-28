import asyncio
import logging
import time

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

logger = logging.getLogger(__name__)
_retry_after = 0


def publish(audience, event_type, group_code, **details):
    """Los eventos son avisos recuperables: nunca deshacen una escritura confirmada."""
    event = {"type": event_type, "group_code": group_code, **details}

    async def send():
        await asyncio.wait_for(
            get_channel_layer().group_send(
                audience,
                {
                    "type": "notify",
                    "event": event,
                    "personal": audience.startswith("user."),
                },
            ),
            timeout=1,
        )

    def committed():
        global _retry_after
        if time.monotonic() < _retry_after:
            return
        try:
            async_to_sync(send)()
        except Exception:
            # Evita esperar un timeout por cada producto de una operación masiva.
            _retry_after = time.monotonic() + 5
            logger.warning("No se pudo publicar el aviso %s", event_type, exc_info=True)

    transaction.on_commit(committed)
