from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import MenuInputSerializer, MenuOutputSerializer
from .models import Menu
from rest_framework.permissions import IsAuthenticated
from groups.models import Group, GroupMember
from recipes.models import IngredientInRecipe
from recipes.utils import get_my_visible_recipes
from groups.utils import get_my_group
from lists.models import List
from django.db import transaction
from django.utils import timezone

# Recorre la lista de ingredientes de la receta y los añade a la lista del grupo
def add_recipe_ingredients_to_list(group, recipe):
  ingredients = IngredientInRecipe.objects.filter(recipe = recipe)

  for ingredient_in_recipe in ingredients:
    list_item = List.objects.filter(
      group = group,
      ingredient = ingredient_in_recipe.ingredient
    ).first()

    # Ya está este ingrediente, por tanto se suma la cantidad
    if list_item:
      list_item.amount += ingredient_in_recipe.amount
      list_item.unit = ingredient_in_recipe.unit
      list_item.bought = False # Vuelve a estar pendiente incluso si ya se había tachado
      list_item.save()
    else:
      # Añadir el ingrediente a la lista
      List.objects.create(
        group = group,
        ingredient = ingredient_in_recipe.ingredient,
        amount = ingredient_in_recipe.amount,
        unit = ingredient_in_recipe.unit,
        bought = False
      )

# Elimina o resta los productos de la receta en la lista del grupo
def remove_recipe_ingredients_from_list(group, recipe):
  ingredients = IngredientInRecipe.objects.filter(recipe = recipe)

  for ingredient_in_recipe in ingredients:
    list_item = List.objects.filter(
      group = group,
      ingredient = ingredient_in_recipe.ingredient
    ).first()

    # El item debería existir, pero se confirma
    if not list_item:
      continue

    list_item.amount -= ingredient_in_recipe.amount

    if list_item.amount <= 0:
      list_item.delete()
    else:
      list_item.save()

class MenuApiView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, group_code):
    group, error = get_my_group(request, group_code)
    if error:
      return error

    today = timezone.localdate()
    menus = Menu.objects.filter(group = group, date__gte = today)
    serializer = MenuOutputSerializer(menus, many = True)

    return Response(serializer.data, status = status.HTTP_200_OK)

  def post(self, request, group_code):
    group, error = get_my_group(request, group_code)
    if error:
      return error

    serializer = MenuInputSerializer(data = request.data)
    serializer.is_valid(raise_exception = True)

    today = timezone.localdate()
    if serializer.validated_data["date"] < today:
      return Response({"error": "La fecha no puede ser anterior a hoy."}, status = status.HTTP_400_BAD_REQUEST)

    recipe = get_my_visible_recipes(request).filter(id = serializer.validated_data["id_recipe"]).first()
    if not recipe:
      return Response({"error": "La receta no existe o no tienes permiso para verla."}, status = status.HTTP_404_NOT_FOUND)

    # Si falla al agregar los ingredientes a la lista, no se introduce la receta al menú
    with transaction.atomic():
      menu = Menu.objects.create(
        group = group,
        recipe = recipe,
        date = serializer.validated_data["date"],
        time = serializer.validated_data["time"]
      )
      add_recipe_ingredients_to_list(group, recipe)

    output_serializer = MenuOutputSerializer(menu)
    return Response(output_serializer.data, status = status.HTTP_201_CREATED)

  # Se elimina el menú pasado en el body junto sus ingredientes en la lista
  def delete(self, request, group_code):
    group, error = get_my_group(request, group_code)
    if error:
      return error

    serializer = MenuInputSerializer(data = request.data)
    serializer.is_valid(raise_exception = True)

    date = serializer.validated_data.get("date")
    time = serializer.validated_data.get("time")
    id_recipe = serializer.validated_data.get("id_recipe")

    today = timezone.localdate()
    if date < today:
      return Response({"error": "No puedes eliminar menus de fechas pasadas."}, status = status.HTTP_400_BAD_REQUEST)

    recipe = get_my_visible_recipes(request).filter(id = id_recipe).first()
    if not recipe:
      return Response({"error": "La receta no existe o no tienes permiso para verla."}, status = status.HTTP_404_NOT_FOUND)

    # Se puede tener la misma receta duplicada el mismo día a la misma hora
    # Entonces solo se elige la primera que devuelve
    menu = Menu.objects.filter(
      group = group,
      recipe = recipe,
      date = date,
      time = time
    ).first()

    if not menu:
      return Response({"error": f"Esta receta no está planificada para el {date} - {time}"}, status = status.HTTP_404_NOT_FOUND)

    # Antes de eliminar hay que verificar que se quitan los ingredientes de la lista
    with transaction.atomic():
      remove_recipe_ingredients_from_list(group, menu.recipe)
      menu.delete()

    return Response({"message": "Menu eliminado correctamente."}, status = status.HTTP_200_OK)
