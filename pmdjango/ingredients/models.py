from django.db import models

# Modelo de categoría de ingrediente
class IngredientCategory(models.Model):
  name = models.CharField(max_length=100, null=False, blank=False)
  icon = models.TextField(null=True, blank=True)

  def __str__(self):
    return self.name
  
# Modelo de ingrediente
class Ingredient(models.Model):
  name = models.CharField(max_length=100, null=False, blank=False)
  id_ingredient_category = models.ForeignKey(IngredientCategory, on_delete=models.CASCADE, null=True, blank=True)
