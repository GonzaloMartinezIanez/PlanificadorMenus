from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import ListInputSerializer, ListOutputSerializer
from .models import List
from rest_framework.permissions import IsAuthenticated

class ListApiView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, group_code):
    return None

  def post(self, request, group_code):
    return None

  def patch(self, request, group_code):
    return None

  def delete(self, request, group_code):
    return None

class ListDeleteAllApiView(APIView):
  permission_classes = [IsAuthenticated]

  def delete(self, request, group_code):
    return None