from rest_framework import serializers
from .models import Menu
from recipes.serializers import RecipeOutputSerializer

class MenuInputSerializer(serializers.ModelSerializer):
  id_recipe = serializers.IntegerField(write_only = True)

  class Meta:
    model = Menu
    fields = ["id_recipe", "date", "time"]

class MenuOutputSerializer(serializers.ModelSerializer):
  recipe = RecipeOutputSerializer(read_only = True)

  class Meta:
    model = Menu
    fields = ["recipe", "date", "time"]
