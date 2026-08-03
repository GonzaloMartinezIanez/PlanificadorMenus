from django.db import models
from ingredients.models import Ingredient
from groups.models import Group

class List(models.Model):
  group = models.ForeignKey(Group, on_delete = models.CASCADE)
  ingredient = models.ForeignKey(Ingredient, on_delete = models.CASCADE)
  amount = models.DecimalField(max_digits = 10, decimal_places = 3, blank = False, null = False)
  unit = models.CharField(max_length = 30, blank = False, null = False)
  bought = models.BooleanField(blank = False, null = False, default = False)