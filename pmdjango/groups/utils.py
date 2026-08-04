from .models import GroupMember, Group
from rest_framework.response import Response
from rest_framework import status

# Comrpueba que el grupo existe y el usuario pertenece a él
def get_my_group(request, group_code):
  group = Group.objects.filter(group_code = group_code).first()
  if not group:
    return None, Response({"error": "El grupo no existe."}, status = status.HTTP_404_NOT_FOUND)

  membership = GroupMember.objects.filter(
    user = request.user,
    group = group,
    accepted = True
  ).first()

  if not membership:
    return None, Response({"error": "No perteneces a este grupo."}, status = status.HTTP_403_FORBIDDEN)

  return group, None