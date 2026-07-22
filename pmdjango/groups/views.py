import random, string
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Group, GroupMember
from .serializers import GroupSerializer, GroupSimpleSerializer

def generate_random_code():
  while True:
    random_code = "".join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8))

    if not Group.objects.filter(group_code=random_code).exists():
      return random_code

class GroupApiView(APIView):
  permission_classes = [IsAuthenticated]

  # Crear grupo y anadir al creador como admin
  def post(self, request):
    serializer = GroupSimpleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    code = generate_random_code()

    group = Group.objects.create(
      group_code = code,
      group_name = serializer.validated_data["group_name"],
      group_description = serializer.validated_data.get("group_description"),
    )

    GroupMember.objects.create(
      user_id = request.user,
      group_code = group,
      role = "ADMIN",
      accepted = True,
    )

    return Response(GroupSerializer(group).data, status = status.HTTP_201_CREATED)
