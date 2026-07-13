from django.db import models


class IngredientCategory(models.Model):
  idIngredientCategory = models.IntegerField(primary_key=True)
  name = models.CharField(max_length=100, null=False, blank=False)
  primaryCategory = models.IntegerField(null=True, blank=False)
  icon = models.TextField(null=True, blank=True)

  def __str__(self):
    return self.name


class Ingredient(models.Model):
  idIngredient = models.CharField(primary_key=True) # Algunos ingredientes ids tienen decimales
  idIngredientCategories = models.ManyToManyField(IngredientCategory, related_name="ingredients", blank=False)
  name = models.TextField(null=False, blank=False)
  packaging = models.CharField(max_length=50, null=True, blank=True)
  reference_format = models.CharField(max_length=20, null=True, blank=True)
  reference_price = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
  unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
  unit_size = models.DecimalField(max_digits=10, decimal_places=5, null=True, blank=True)
  image = models.TextField(null=True, blank=True)

  def __str__(self):
    return self.name
