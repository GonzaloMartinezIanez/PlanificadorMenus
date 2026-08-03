from rest_framework import serializers
from .models import Menu

class MenuSerializer(serializers.ModelSerializer):
  id_recipe = serializers.CharField(source = "recipe.id", read_only = True)
  
  class Meta:
    model = Menu
    fields = ["id_recipe", "date", "time"]