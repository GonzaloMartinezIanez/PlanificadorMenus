from django.db import models
from django.conf import settings
from ingredients.models import Ingredient

class RecipeCategory(models.Model):
  name = models.CharField(max_length=100, blank=False, null=False)
  icon = models.TextField(blank=True, null=True)

  def __str__(self):
    return self.name
  
class Recipe(models.Model):
  VISIBILITY_CHOICES = [
    ("PUBLIC", "PUBLIC"),
    ("PRIVATE", "PRIVATE"),
  ]
  
  name = models.CharField(max_length=150, blank=False, null=False)
  description = models.TextField(blank=True, null=False)
  preparation_time = models.PositiveIntegerField(blank=True, null=True)
  steps = models.JSONField(blank=True, null=True)
  visibility = models.CharField(max_length=7, choices=VISIBILITY_CHOICES, blank=False, null=False)
  recipe_category = models.ForeignKey(RecipeCategory, on_delete=models.PROTECT)
  num_valorations = models.IntegerField(default=0, blank=False, null=False)
  avg_score = models.FloatField(default=0, blank=False, null=False)  
  
  def __str__(self):
    return self.name

class IngredientInRecipe(models.Model):
  recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
  ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT)
  amount = models.DecimalField(blank=False, null=False)
  unit = models.CharField(max_length=30, blank=False, null=False)

  class Meta:
    unique_together = ("recipe", "ingredient")

class RecipeComment(models.Model):
  user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
  recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
  score = models.PositiveIntegerField(validators=[models.MinValueValidator(0), models.MaxValueValidator(5)], blank=False, null=False)
  comment = models.TextField(blank=True, null=True)

  class Meta:
    unique_together = ("user", "recipe")

  def __str__(self):
    return f"{self.recipe.name} - User: {self.user} - Score: {self.score} - Comment: {self.comment}"