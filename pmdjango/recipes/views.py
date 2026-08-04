from .models import Recipe, RecipeCategory, IngredientInRecipe
from .serializers import RecipeCategorySerializer, RecipeOutputSerializer, RecipeInputSerializer
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from ingredients.models import Ingredient
from .utils import get_my_visible_recipes


# CRUD de Categorias de recetas
class RecipeCategoryViewSet(viewsets.ModelViewSet):
  permission_classes = []
  queryset = RecipeCategory.objects.all()
  serializer_class = RecipeCategorySerializer

# GET recetas por categoría
class RecipeCategoryRecipesApiView(APIView):
  permission_classes = []

  def get(self, request, id_recipe_category):
    if not RecipeCategory.objects.filter(id = id_recipe_category).exists():
      return Response({"error": "La categoría no existe."}, status = status.HTTP_404_NOT_FOUND)

    recipes = get_my_visible_recipes(request).filter(recipe_categories__id = id_recipe_category)

    serializer = RecipeOutputSerializer(recipes, many = True)

    return Response(serializer.data, status = status.HTTP_200_OK)

# GET todas y añadir nueva
class RecipeApiView(APIView):
  permission_classes = []

  def get(self, request):
    recipes = get_my_visible_recipes(request)
    serializer = RecipeOutputSerializer(recipes, many = True)

    return Response(serializer.data, status = status.HTTP_200_OK)

  def post(self, request):
    if not request.user.is_authenticated:
      return Response({"error": "Necesitas autenticación."}, status = status.HTTP_401_UNAUTHORIZED)

    serializer = RecipeInputSerializer(data = request.data)
    serializer.is_valid(raise_exception = True)

    # Si un paso falla, se deshacen todos los cambios en la base de datos
    try:
      with transaction.atomic():
        # Crear la receta (num_valorations y avg_score default = 0)
        recipe = Recipe.objects.create(
          user = request.user,
          name = serializer.validated_data["name"],
          description = serializer.validated_data.get("description", ""),
          preparation_time = serializer.validated_data.get("preparation_time"),
          steps = serializer.validated_data.get("steps"),
          visibility = serializer.validated_data["visibility"],
        )

        # Añadir las categorías
        recipe.recipe_categories.set(serializer.validated_data["recipe_categories"])

        # Recorrer los ingredientes y guardarlos en la tabla
        for ingredient_data in serializer.validated_data.get("ingredients", []):
          ingredient = Ingredient.objects.get(id_ingredient = ingredient_data["id_ingredient"])
          IngredientInRecipe.objects.create(
            recipe = recipe,
            ingredient = ingredient,
            amount = ingredient_data["amount"],
            unit = ingredient_data["unit"],
          )
    except Exception as e:
      return Response({"error": str(e)}, status = status.HTTP_400_BAD_REQUEST)

    output_serializer = RecipeOutputSerializer(recipe)
    return Response(output_serializer.data, status = status.HTTP_201_CREATED)

# GET, PUT, PATCH, DELETE receta por id
class RecipeIdApiView(APIView):
  permission_classes = []

  def get(self, request, id):
    recipe = get_my_visible_recipes(request).filter(id = id).first()
    if not recipe:
      return Response({"error": "Receta no encontrada."}, status = status.HTTP_404_NOT_FOUND)

    serializer = RecipeOutputSerializer(recipe)
    return Response(serializer.data, status = status.HTTP_200_OK)

  def put(self, request, id):
    if not request.user.is_authenticated:
      return Response({"error": "Necesitas autenticación."}, status = status.HTTP_401_UNAUTHORIZED)
    
    recipe = get_my_visible_recipes(request).filter(id = id).first()

    if not recipe:
      return Response({"error": "Receta no encontrada."}, status = status.HTTP_404_NOT_FOUND)

    if recipe.user != request.user:
      return Response({"error": "No tienes permiso para modificar esta receta."}, status = status.HTTP_403_FORBIDDEN)

    serializer = RecipeInputSerializer(data = request.data)
    serializer.is_valid(raise_exception = True)

    # Si un paso falla, se deshacen todos los cambios en la base de datos
    try:  
      with transaction.atomic():
        # Actualizar los campos de la receta
        recipe.name = serializer.validated_data["name"]
        recipe.description = serializer.validated_data.get("description", "")
        recipe.preparation_time = serializer.validated_data.get("preparation_time")
        recipe.steps = serializer.validated_data.get("steps")
        recipe.visibility = serializer.validated_data["visibility"]
        recipe.save()

        # Actualizar las categorías
        recipe.recipe_categories.set(serializer.validated_data["recipe_categories"])

        # Actualizar los ingredientes
        # Primero se eliminan los antiguos
        IngredientInRecipe.objects.filter(recipe = recipe).delete()
        # Luego se añaden los nuevos
        for ingredient_data in serializer.validated_data.get("ingredients", []):
          ingredient = Ingredient.objects.get(id_ingredient = ingredient_data["id_ingredient"])
          IngredientInRecipe.objects.create(
            recipe = recipe,
            ingredient = ingredient,
            amount = ingredient_data["amount"],
            unit = ingredient_data["unit"],
          )
    except Exception as e:
      return Response({"error": str(e)}, status = status.HTTP_400_BAD_REQUEST)

    output_serializer = RecipeOutputSerializer(recipe)
    return Response(output_serializer.data, status = status.HTTP_200_OK)

  def patch(self, request, id):
    if not request.user.is_authenticated:
      return Response({"error": "Necesitas autenticación."}, status = status.HTTP_401_UNAUTHORIZED)

    recipe = get_my_visible_recipes(request).filter(id = id).first()

    if not recipe:
      return Response({"error": "Receta no encontrada."}, status = status.HTTP_404_NOT_FOUND)

    if recipe.user != request.user:
      return Response({"error": "No tienes permiso para modificar esta receta."}, status = status.HTTP_403_FORBIDDEN)

    serializer = RecipeInputSerializer(data = request.data, partial = True)
    serializer.is_valid(raise_exception = True)

    # Si un paso falla, se deshacen todos los cambios en la base de datos
    try:
      with transaction.atomic():
        # Actualizar los campos de la receta
        for field, value in serializer.validated_data.items():
          if field in ["recipe_categories", "ingredients"]:
            continue # Como son relaciones, se manejan aparte
          setattr(recipe, field, value)
        recipe.save()

        # Actualizar las categorías si se proporcionan
        if "recipe_categories" in serializer.validated_data:
          recipe.recipe_categories.set(serializer.validated_data["recipe_categories"])

        # Actualizar los ingredientes si se proporcionan
        if "ingredients" in serializer.validated_data:
          # Primero se eliminan los antiguos
          IngredientInRecipe.objects.filter(recipe = recipe).delete()
          # Luego se añaden los nuevos
          for ingredient_data in serializer.validated_data.get("ingredients", []):
            ingredient = Ingredient.objects.get(id_ingredient = ingredient_data["id_ingredient"])
            IngredientInRecipe.objects.create(
              recipe = recipe,
              ingredient = ingredient,
              amount = ingredient_data["amount"],
              unit = ingredient_data["unit"],
            )
    except Exception as e:
      return Response({"error": str(e)}, status = status.HTTP_400_BAD_REQUEST)

    output_serializer = RecipeOutputSerializer(recipe)
    return Response(output_serializer.data, status = status.HTTP_200_OK)

  def delete(self, request, id):
    if not request.user.is_authenticated:
      return Response({"error": "Necesitas autenticación."}, status = status.HTTP_401_UNAUTHORIZED)

    recipe = get_my_visible_recipes(request).filter(id = id).first()

    if not recipe:
      return Response({"error": "Receta no encontrada."}, status = status.HTTP_404_NOT_FOUND)

    if recipe.user != request.user:
      return Response({"error": "No tienes permiso para eliminar esta receta."}, status = status.HTTP_403_FORBIDDEN)

    recipe.delete()
    return Response({"message": "Receta eliminada."}, status = status.HTTP_200_OK)
