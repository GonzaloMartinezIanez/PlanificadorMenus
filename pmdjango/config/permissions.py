from django.conf import settings
from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsEmailAuthorizedOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        # Permitir siempre para GET/HEAD/OPTIONS
        if request.method in SAFE_METHODS: 
            return True

        # Hace falta estar autenticado
        if not request.user.is_authenticated:
            return False

        # Solo los usuarios con email en .env pueden usar el endpoint
        return request.user.email in settings.AUTHORIZED_EMAIL
