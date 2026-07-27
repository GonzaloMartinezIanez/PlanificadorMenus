from .models import IngredientCategory, Ingredient
from .serializers import IngredientCategorySerializer, IngredientSerializer
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

# CRUD de Categorías de ingredientes
class IngredientCategoryViewSet(viewsets.ModelViewSet):
  permission_classes = []
  queryset = IngredientCategory.objects.all()
  serializer_class = IngredientCategorySerializer
  lookup_field = 'id_ingredient_category'

  # Permitir insertar múltiples categorías en la misma petición
  def get_serializer(self, *args, **kwargs):
    if isinstance(kwargs.get('data', {}), list):
        kwargs['many'] = True
    return super().get_serializer(*args, **kwargs)

# Endpoint que devuelve los ingredientes de una categoría. Las categorías principales no devuelven nada
class IngredientCategoryIngredientsApiView(APIView):
  permission_classes = []

  def get(self, request, id_ingredient_category):
    if not IngredientCategory.objects.filter(id_ingredient_category = id_ingredient_category).exists():
      return Response({"error": "La categoria no existe."}, status = status.HTTP_404_NOT_FOUND)

    ingredients = Ingredient.objects.filter(id_ingredient_categories__id_ingredient_category = id_ingredient_category)
    serializer = IngredientSerializer(ingredients, many = True)

    return Response(serializer.data, status = status.HTTP_200_OK)

class IngredientViewSet(viewsets.ModelViewSet):
  permission_classes = []
  queryset = Ingredient.objects.all()
  serializer_class = IngredientSerializer
  lookup_field = 'id_ingredient'
  lookup_value_regex = '[^/]+'

  # Permitir insertar múltiples ingredientes en la misma petición
  def get_serializer(self, *args, **kwargs):
    if isinstance(kwargs.get('data', {}), list):
        kwargs['many'] = True
    return super().get_serializer(*args, **kwargs)

# Endpoint para buscar un ingrediente por texto
class IngredientByNameApiView(APIView):
  permission_classes = []

  def get(self, request):
    name = request.GET.get('name', '') # Capta el query param de la url /ingredient_by_name/?name=Jamon
    if not name:
      return Response({"error": "El parámetro 'name' es obligatorio."}, status = status.HTTP_400_BAD_REQUEST)

    ingredients = Ingredient.objects.filter(name__icontains = name) # Con icontains se ignoran mayúsculas y minúsculas
    serializer = IngredientSerializer(ingredients, many = True)

    return Response(serializer.data, status = status.HTTP_200_OK)
