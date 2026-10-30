from django.db import models
from ingredients.models import Ingredient
from groups.models import Group
from django.conf import settings
import uuid


class List(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    amount = models.DecimalField(
        max_digits=10, decimal_places=3, blank=False, null=False
    )
    unit = models.CharField(max_length=30, blank=False, null=False)
    bought = models.BooleanField(blank=False, null=False, default=False)

    # Un mismo tipo de ingrediente no puede estar en dos listas de la compra con unidades distintas
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["group", "ingredient"], name="unique_group_ingredient_list_item"
            )
        ]


class RemovedListItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    removed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=3)
    unit = models.CharField(max_length=30)
    bought = models.BooleanField()
    expires_at = models.DateTimeField(db_index=True)
