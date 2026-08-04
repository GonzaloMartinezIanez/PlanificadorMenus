from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import ListInputSerializer, ListOutputSerializer, ListPatchSerializer
from .models import List
from rest_framework.permissions import IsAuthenticated
from groups.models import Group, GroupMember
from ingredients.models import Ingredient
from groups.utils import get_my_group

class ListApiView(APIView):
  permission_classes = [IsAuthenticated]

  # Devuelve todos los productos de la lista
  def get(self, request, group_code):
    group, error = get_my_group(request, group_code)
    if error:
      return error

    list_items = List.objects.filter(group = group)
    serializer = ListOutputSerializer(list_items, many = True)

    return Response(serializer.data, status = status.HTTP_200_OK)

  # Añade un producto independiente a la lista
  def post(self, request, group_code):
    group, error = get_my_group(request, group_code)
    if error:
      return error

    serializer = ListInputSerializer(data = request.data)
    serializer.is_valid(raise_exception = True)

    ingredient = Ingredient.objects.filter(id_ingredient = serializer.validated_data["id_ingredient"]).first()
    if not ingredient:
      return Response({"error": "El producto no existe."}, status = status.HTTP_404_NOT_FOUND)

    list_item = List.objects.filter(group = group, ingredient = ingredient).first()

    # Sumar la cantidad si ya existe o crear uno nuevo
    if list_item:
      list_item.amount += serializer.validated_data["amount"]
      list_item.unit = serializer.validated_data["unit"]
      list_item.bought = False
      list_item.save()
    else:
      list_item = List.objects.create(
        group = group,
        ingredient = ingredient,
        amount = serializer.validated_data["amount"],
        unit = serializer.validated_data["unit"],
        bought = False
      )

    output_serializer = ListOutputSerializer(list_item)
    return Response(output_serializer.data, status = status.HTTP_201_CREATED)

  # Borrar todos los productos de la lista del grupo
  def delete(self, request, group_code):
    group, error = get_my_group(request, group_code)
    if error:
      return error

    List.objects.filter(group = group).delete()
    return Response({"message": "Se ha eliminado la lista de la compra correctamente."}, status = status.HTTP_200_OK)

class ListPatchApiView(APIView):
  permission_classes = [IsAuthenticated]

  # Endpoint para cambiar la cantidad, la unidad o el estado de "comprado" de un producto
  def patch(self, request, group_code, id_ingredient):
    group, error = get_my_group(request, group_code)
    if error:
      return error

    list_item = List.objects.filter(group = group, ingredient_id = id_ingredient).first()
    if not list_item:
      return Response({"error": "El producto no existe en la lista."}, status = status.HTTP_404_NOT_FOUND)

    serializer = ListPatchSerializer(list_item, data = request.data, partial = True)
    serializer.is_valid(raise_exception = True)
    serializer.save()

    output_serializer = ListOutputSerializer(list_item)
    return Response(output_serializer.data, status = status.HTTP_200_OK)
