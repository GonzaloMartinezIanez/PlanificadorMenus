from math import ceil
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
  ingredient = serializers.SerializerMethodField()
  packages_needed = serializers.SerializerMethodField()
  purchase_label = serializers.SerializerMethodField()
  
  class Meta:
    model = List
    fields = ["ingredient", "amount", "unit", "bought", "packages_needed", "purchase_label"]

  # Datos del ingrediente
  def get_ingredient(self, obj):
    ingredient = obj.ingredient
    return {
      "id_ingredient": ingredient.id_ingredient,
      "id_ingredient_categories": list(ingredient.id_ingredient_categories.values_list("id_ingredient_category", flat = True)),
      "name": ingredient.name,
      "packaging": ingredient.packaging,
      "reference_format": ingredient.reference_format,
      "reference_price": ingredient.reference_price,
      "unit_price": ingredient.unit_price,
      "unit_size": ingredient.unit_size,
      "image": ingredient.image
    }

  # Todavía falta tener en cuenta unidades como dc o dz, entre otras
  def get_packages_needed(self, obj):
    ingredient = obj.ingredient

    if not ingredient.unit_size or ingredient.unit_size <= 0:
      return None

    if obj.unit.lower() != ingredient.reference_format.lower():
      return None

    return ceil(obj.amount / ingredient.unit_size)

  # Por ejemplo 5 mallas de patatas
  def get_purchase_label(self, obj):
    ingredient = obj.ingredient
    packages_needed = self.get_packages_needed(obj)

    if packages_needed is None:
      return None

    packaging = ingredient.packaging.lower() if ingredient.packaging else "unidad"
    if packages_needed != 1:
      packaging += "s"

    return f"{packages_needed} {packaging} de {ingredient.unit_size} {ingredient.reference_format}"
