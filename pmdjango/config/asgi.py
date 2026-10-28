"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_application = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.conf import settings
from django.urls import path
from config.realtime.consumer import EventsConsumer

application = ProtocolTypeRouter(
    {
        "http": django_application,
        "websocket": OriginValidator(
            URLRouter([path("ws/events/", EventsConsumer.as_asgi())]),
            settings.CORS_ALLOWED_ORIGINS,
        ),
    }
)
