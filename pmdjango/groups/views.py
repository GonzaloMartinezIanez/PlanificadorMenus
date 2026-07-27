import random, string
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Group, GroupMember
from .serializers import GroupCreateSerializer, GroupMemberSerializer, GroupSerializer, RoleSerializer, JoinSerializer, PatchGroupSerializer

def generate_random_code():
  while True:
    random_code = "".join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8))

    if not Group.objects.filter(group_code = random_code).exists():
      return random_code

class GroupApiView(APIView):
  permission_classes = [IsAuthenticated]

  # Crear grupo y anadir al creador como admin
  def post(self, request):
    serializer = GroupCreateSerializer(data = request.data)
    serializer.is_valid(raise_exception = True)

    code = generate_random_code()

    group = Group.objects.create(
      group_code = code,
      group_name = serializer.validated_data["group_name"],
      group_description = serializer.validated_data.get("group_description"),
    )

    GroupMember.objects.create(
      user = request.user,
      group = group,
      role = "ADMIN",
      accepted = True,
    )

    return Response(GroupSerializer(group).data, status = status.HTTP_201_CREATED)

  # Devolver todos los grupos en los que esta el usuario
  def get(self, request):
    my_groups = Group.objects.filter(groupmember__user = request.user, groupmember__accepted = True)
    serializer = GroupSerializer(my_groups, many = True)

    return Response(serializer.data, status = status.HTTP_200_OK)

class GroupCodeApiView(APIView):
  permission_classes = [IsAuthenticated]

  # Devuelve todos los integrantes de un grupo, los aceptados y los rechazados
  def get(self, request, group_code):
    if not GroupMember.objects.filter(group__group_code = group_code, user = request.user, accepted = True).exists():
      return Response({"error": "No perteneces a este grupo."}, status = status.HTTP_403_FORBIDDEN)

    members = GroupMember.objects.filter(group__group_code = group_code)
    serializer = GroupMemberSerializer(members, many = True)

    return Response(serializer.data, status = status.HTTP_200_OK)

  # Unirse al grupo
  def post(self, request, group_code):
    if not Group.objects.filter(group_code = group_code).exists():
      return Response({"error": "El grupo no existe."}, status = status.HTTP_403_FORBIDDEN)

    if GroupMember.objects.filter(group__group_code = group_code, user = request.user).exists():
      return Response({"error": "Ya perteneces o al menos has solicitado unirte a este grupo. Espera a que el admin te acepte."}, status = status.HTTP_403_FORBIDDEN)

    group = Group.objects.get(group_code = group_code)
    GroupMember.objects.create(
      user = request.user,
      group = group,
      role = "MEMBER",
      accepted = False,
    )

    return Response({"message": "Solicitud de unirse al grupo enviada."}, status = status.HTTP_201_CREATED)

  # Modificar nombre y descripción del grupo
  def patch(self, request, group_code):
    serializer = PatchGroupSerializer(data = request.data)
    serializer.is_valid(raise_exception = True)

    if not GroupMember.objects.filter(group__group_code = group_code, user = request.user, accepted = True).exists():
      return Response({"error": "No perteneces a este grupo."}, status = status.HTTP_403_FORBIDDEN)

    if not GroupMember.objects.filter(group__group_code = group_code, user = request.user, role = "ADMIN", accepted = True).exists():
      return Response({"error": "Solo el admin puede borrar el grupo."}, status = status.HTTP_403_FORBIDDEN)

    group = Group.objects.get(group_code = group_code)
    group.group_name = serializer.validated_data["group_name"]
    group.group_description = serializer.validated_data["group_description"]
    group.save()

    return Response({"message": GroupSerializer(group).data}, status = status.HTTP_200_OK)


  def delete(self, request, group_code):
    if not GroupMember.objects.filter(group__group_code = group_code, user = request.user, accepted = True).exists():
      return Response({"error": "No perteneces a este grupo."}, status = status.HTTP_403_FORBIDDEN)

    if not GroupMember.objects.filter(group__group_code = group_code, user = request.user, role = "ADMIN", accepted = True).exists():
      return Response({"error": "Solo el admin puede borrar el grupo."}, status = status.HTTP_403_FORBIDDEN)

    group = Group.objects.get(group_code = group_code)
    group.delete()

    return Response({"message": "Grupo eliminado."}, status = status.HTTP_200_OK)

class GroupMemberJoinApiView(APIView):
  permission_classes = [IsAuthenticated]

  # Aceptar o rechazar a un miembro del grupo
  def patch(self, request, group_code):
    serializer = JoinSerializer(data = request.data)
    serializer.is_valid(raise_exception = True)

    if not GroupMember.objects.filter(group__group_code = group_code, user = request.user, role = "ADMIN", accepted = True).exists():
      return Response({"error": "No eres admin del grupo."}, status = status.HTTP_403_FORBIDDEN)

    if not GroupMember.objects.filter(group__group_code = group_code, user__id = serializer.validated_data["user_id"], accepted = False).exists():
      return Response({"error": "Este usuario no ha solicitado unirse al grupo."}, status = status.HTTP_403_FORBIDDEN)

    member = GroupMember.objects.get(group__group_code = group_code, user__id = serializer.validated_data["user_id"], accepted = False)
    if serializer.validated_data["accepted"]:
      member.accepted = True
      member.save()
      return Response({"message": "Usuario aceptado en el grupo."}, status = status.HTTP_200_OK)
    else:
      member.delete()
      return Response({"message": "Usuario rechazado del grupo."}, status = status.HTTP_200_OK)

class GroupMemberRoleApiView(APIView):
  permission_classes = [IsAuthenticated]

  # Cambiar el rol de un miembro del grupo
  def patch(self, request, group_code):
    serializer = RoleSerializer(data = request.data)
    serializer.is_valid(raise_exception = True)

    if not GroupMember.objects.filter(group__group_code = group_code, user = request.user, role = "ADMIN", accepted = True).exists():
      return Response({"error": "No eres admin del grupo."}, status = status.HTTP_403_FORBIDDEN)

    if not GroupMember.objects.filter(group__group_code = group_code, user__id = serializer.validated_data["user_id"], accepted = True).exists():
      return Response({"error": "Este usuario no pertenece al grupo."}, status = status.HTTP_403_FORBIDDEN)

    # Debe haber al menos un admin en el grupo
    # Si eres el unico admin y quieres cambiar tu rol a miembro, no se te permite
    if serializer.validated_data["role"] == "MEMBER":
      if GroupMember.objects.filter(group__group_code = group_code, role = "ADMIN", accepted = True).count() == 1:
        if GroupMember.objects.get(group__group_code = group_code, user__id = serializer.validated_data["user_id"], accepted = True).role == "ADMIN":
          return Response({"error": "No se puede dejar el grupo sin admins."}, status = status.HTTP_403_FORBIDDEN)

    member = GroupMember.objects.get(group__group_code = group_code, user__id = serializer.validated_data["user_id"], accepted = True)
    member.role = serializer.validated_data["role"]
    member.save()

    return Response({"message": "Rol del usuario actualizado."}, status = status.HTTP_200_OK)

class GroupLeaveApiView(APIView):
  permission_classes = [IsAuthenticated]

  # Salir del grupo o explusar a un miembro del grupo
  def delete(self, request, group_code, user_id):
    if not GroupMember.objects.filter(group__group_code = group_code, user = request.user, accepted = True).exists():
      return Response({"error": "No perteneces a este grupo."}, status = status.HTTP_403_FORBIDDEN)

    # Si no eres el mismo usuario, debes ser admin para expulsar a otro miembro
    if request.user.id != user_id:      
      if not GroupMember.objects.filter(group__group_code = group_code, user = request.user, role = "ADMIN", accepted = True).exists():
        return Response({"error": "Solo el admin puede expulsar a otros miembros."}, status = status.HTTP_403_FORBIDDEN)

    member_to_remove = GroupMember.objects.filter(group__group_code = group_code, user__id = user_id, accepted = True).first()
    if not member_to_remove:
      return Response({"error": "Este usuario no pertenece al grupo."}, status = status.HTTP_403_FORBIDDEN)

    if member_to_remove.role == "ADMIN" and request.user.id != user_id:
      return Response({"error": "No puedes expulsar a otro admin del grupo."}, status = status.HTTP_403_FORBIDDEN)

    # Debe haber al menos un admin en el grupo
    # Si eres el unico admin y quieres salir del grupo, no se te permite
    if member_to_remove.role == "ADMIN":
      if GroupMember.objects.filter(group__group_code = group_code, role = "ADMIN", accepted = True).count() == 1:
        return Response({"error": "Eres el único admin. Promociona a otro miembro y luego abandona el grupo."}, status = status.HTTP_403_FORBIDDEN)

    member_to_remove.delete()

    return Response({"message": "Usuario eliminado del grupo."}, status = status.HTTP_200_OK)
    
