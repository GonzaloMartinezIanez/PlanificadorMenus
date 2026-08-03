from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import MenuSerializer
from .models import Menu
from rest_framework.permissions import IsAuthenticated

class MenuApiView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, group_code):
    return None

  def post(self, request, group_code):
    return None

  def delete(self, request, group_code):
    return None