from rest_framework import serializers
from .models import Ingredient, IngredientCategory

class IngredientCategorySerializer(serializers.ModelSerializer):
  class Meta:
    model = IngredientCategory
    fields = "__all__"

class IngredientSerializer(serializers.ModelSerializer):
  class Meta:
    model = Ingredient
    fields = "__all__"