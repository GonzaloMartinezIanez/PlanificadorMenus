from math import ceil
from decimal import Decimal, ROUND_HALF_UP
from rest_framework import serializers
from .models import List
from ingredients.models import Ingredient

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
  amount = serializers.DecimalField(max_digits = 10, decimal_places = 3, coerce_to_string = False) # Eliminar decimales a la derecha y limitar a 3
  calculated_price = serializers.SerializerMethodField() # Nuevo campo con el precio de cada ingrediente teniendo en cuenta la cantidad y unidad
  
  class Meta:
    model = List
    fields = ["ingredient", "amount", "unit", "bought", "packages_needed", "purchase_label", "calculated_price"]

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

  # Cuanto contiene el envase del producto en su unidad de referencia
  def get_package_reference_amount(self, ingredient):
    reference_format = ingredient.reference_format

    if ingredient.unit_size is not None and ingredient.unit_size > 0:
      if reference_format in ["kg", "l", "m"]:
        return ingredient.unit_size

      # dc y dz son ambos docenas
      if reference_format in ["dc", "dz"]:
        return ingredient.unit_size / Decimal("12")

      # Si el envase es de 100 g o 100ml se tiene que multiplicar por 10
      # para pasar al sistema internacional
      if reference_format in ["100 g", "100 ml"]:
        return ingredient.unit_size * Decimal("10")

    # Faltan datos
    if (
      ingredient.reference_price is None or
      ingredient.unit_price is None
    ):
      return None

    return ingredient.unit_price / ingredient.reference_price

  # Cuantos envases completos hay que comprar para comprar la cantidad de la lsita
  def get_packages_needed(self, obj):
    ingredient = obj.ingredient
    package_reference_amount = self.get_package_reference_amount(ingredient)

    if package_reference_amount is None:
      return None

    # Devuelve el siguiente entero en caso de decimales
    if obj.unit == ingredient.reference_format:
      return ceil(obj.amount / package_reference_amount)

    return None

  # Redondea a 3 decimales si hace falta y elimina los decimales si es necesario
  # además de los ceros a la cerecha del último número los decimales
  def format_amount(self, amount):
    rounded_amount = Decimal(amount).quantize(Decimal("0.001"), rounding = ROUND_HALF_UP)
    return format(rounded_amount, "f").rstrip("0").rstrip(".")

  # Cambiar el formato a texto normal para las unidades y decenas
  def format_unit(self, unit, amount):
    if unit == "ud":
      return "unidad" if amount == 1 else "unidades"

    if unit in ["dc", "dz"]:
      return "docena" if amount == 1 else "docenas"

    return unit

  # Devuel un string con lo que hay que comprar del producto
  # Por ejemplo 5 mallas de patatas
  def get_purchase_label(self, obj):
    ingredient = obj.ingredient
    packages_needed = self.get_packages_needed(obj)

    # Si hay un problema solo se escribe la cantidad y la unidad
    if packages_needed is None:
      return f"{self.format_amount(obj.amount)} {self.format_unit(obj.unit, obj.amount)}"

    # Hay muchos packaging vacíos
    packaging = ingredient.packaging.lower() if ingredient.packaging else "unidad"
    if packages_needed != 1:
      packaging += "s"

    package_reference_amount = self.get_package_reference_amount(ingredient)
    return f"{packages_needed} {packaging} de {self.format_amount(package_reference_amount)} {self.format_unit(ingredient.reference_format, package_reference_amount)}"

  # Precio del producto teniendo en cuenta el formato del prodcuto
  # Por ejemplo, no se puede comprar 0.3kg de arroz. Hay que comprar el kg entero
  def get_calculated_price(self, obj):
    packages_needed = self.get_packages_needed(obj)

    if packages_needed is None or obj.ingredient.unit_price is None:
      return None

    return round(packages_needed * obj.ingredient.unit_price, 2)
