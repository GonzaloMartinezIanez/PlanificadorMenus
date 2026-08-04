from rest_framework import serializers
from .models import List

class ListInputSerializer(serializers.ModelSerializer):
  id_ingredient = serializers.CharField(write_only = True)

  class Meta:
    model = List
    fields = ["id_ingredient", "amount", "unit"]

class ListPatchSerializer(serializers.ModelSerializer):
  class Meta:
    model = List
    fields = ["amount", "unit", "bought"]

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
      "image": ingredient.image
    }