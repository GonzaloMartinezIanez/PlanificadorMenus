from rest_framework import serializers
from .models import List
from ingredients.models import Ingredient

class ListInputSerializer(serializers.ModelSerializer):
  group_code = serializers.CharField(source = "group.group_code", read_only = True)
  id_ingredient = serializers.CharField(source = "ingredient.id_ingredient", read_only = True)
  
  class Meta:
    model = List
    fields = ["id_ingredient", "amount", "unit"]

class ListOutputSerializer(serializers.ModelSerializer):
  group_code = serializers.CharField(source = "group.group_code", read_only = True)
  ingredient = serializers.SerializerMethodField()
  
  class Meta:
    model = List
    fields = ["group_code", "ingredient", "amount", "unit", "bought"]

  def get_ingredient(self, obj):
    ingredient = obj.ingredient
    return {
      "id_ingredient": ingredient.id_ingredient,
      "name": ingredient.name,
      "description": ingredient.description,
      "image": ingredient.image.url if ingredient.image else None
    }