from django.shortcuts import render
from .models import IngredientCategory, Ingredient
from .serializers import IngredientCategorySerializer, IngredientSerializer
from rest_framework import viewsets

class IngredientCategoryViewSet(viewsets.ModelViewSet):
  queryset = IngredientCategory.objects.all()
  serializer_class = IngredientCategorySerializer
  lookup_field = 'id'

class IngredientViewSet(viewsets.ModelViewSet):
  queryset = Ingredient.objects.all()
  serializer_class = IngredientSerializer
  lookup_field = 'id'
