from django.db import models
from groups.models import Group
from recipes.models import Recipe

class Menu(models.Model):
  TIME_CHOICES = [
    ("BREAKFAST", "BREAKFAST"),
    ("LUNCH", "LUNCH"),
    ("DINNER", "DINNER")
  ]

  group = models.ForeignKey(Group, on_delete = models.CASCADE)
  recipe = models.ForeignKey(Recipe, on_delete = models.CASCADE)
  date = models.DateField(blank=False, null=False)
  time = models.CharField(max_length = 10, choices = TIME_CHOICES, blank=False, null=False)

  def __str__(self):
    return f'{self.group.group_code} - {self.recipe.name} - {self.date} - {self.time}'