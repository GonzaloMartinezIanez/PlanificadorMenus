from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

from .models import User
from .serializers import UserSerializer

# El frontend debe pasar un google_id válido, si este usuario no está en el sistema se creará.
# Devuelve un access_token y un refresh token
class GoogleLoginView(APIView):
    permission_classes = []

    def post(self, request):
        token = request.data.get("token") # Token del body
        if not token:
            return Response({"error": "Falta el token de Google"}, status=status.HTTP_400_BAD_REQUEST)

        # Comprobar que es un id válido y obtener información del usuario
        try:
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError:
            return Response({"error": "Token de Google inválido"}, status=status.HTTP_401_UNAUTHORIZED)


        google_id = idinfo["sub"]
        email = idinfo.get("email")
        name = idinfo.get("name") or email.split("@")[0]
        picture = idinfo.get("picture")

        # Insertar el usuario si no está
        user, created = User.objects.get_or_create(
            google_id=google_id,
            defaults={
                "username": self.check_username(name),
                "email": email,
                "profile_picture": picture,
            },
        )

        # Si ya existía pero cambió su foto en Google, la actualizamos
        if not created and user.profile_picture != picture:
            user.profile_picture = picture
            user.save(update_fields=["profile_picture"])

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        })

    def check_username(self, base_name):
        username = base_name
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_name}{counter}"
            counter += 1
        return username
