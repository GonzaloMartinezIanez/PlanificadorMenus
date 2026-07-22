from django.shortcuts import render
from .models import IngredientCategory, Ingredient
from .serializers import IngredientCategorySerializer, IngredientSerializer
from rest_framework import viewsets

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

class IngredientViewSet(viewsets.ModelViewSet):
  permission_classes = []
  queryset = Ingredient.objects.all()
  serializer_class = IngredientSerializer
  lookup_field = 'id_ingredient'

  # Permitir insertar múltiples ingredientes en la misma petición
  def get_serializer(self, *args, **kwargs):
    if isinstance(kwargs.get('data', {}), list):
        kwargs['many'] = True
    return super().get_serializer(*args, **kwargs)