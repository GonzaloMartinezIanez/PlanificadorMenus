from django.apps import AppConfig


class RealtimeConfig(AppConfig):
    name = "config.realtime"

    def ready(self):
        from . import signals  # noqa: F401
