from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase
from groups.models import Group, GroupMember
from ingredients.models import Ingredient, IngredientCategory
from .models import List, RemovedListItem


class ProductInteractionTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="first")
        self.other = get_user_model().objects.create_user(username="second")
        self.group = Group.objects.create(group_code="SHOPPING", group_name="Casa")
        for user in [self.user, self.other]:
            GroupMember.objects.create(user=user, group=self.group, accepted=True)
        self.ingredient = Ingredient.objects.create(
            id_ingredient="egg",
            name="Huevos",
            reference_format="ud",
            unit_size=Decimal("1"),
            unit_price=Decimal("3.75"),
            reference_price=Decimal("1.875"),
        )
        List.objects.create(
            group=self.group,
            ingredient=self.ingredient,
            amount=Decimal("2.000"),
            unit="ud",
            bought=True,
        )
        self.url = "/api/lists/SHOPPING/egg/"
        self.client.force_authenticate(self.user)

    def remove(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 200)
        return response.data["undo_id"]

    def restore(self, undo_id):
        return self.client.post(
            self.url + "restore/", {"undo_id": undo_id}, format="json"
        )

    def test_undo_preserves_original_state_and_is_single_use(self):
        token = self.remove()
        self.assertEqual(self.restore(token).status_code, 201)
        item = List.objects.get()
        self.assertEqual(item.amount, Decimal("2.000"))
        self.assertTrue(item.bought)
        self.assertEqual(self.restore(token).status_code, 404)

    def test_undo_never_overwrites_another_members_product(self):
        token = self.remove()
        List.objects.create(
            group=self.group, ingredient=self.ingredient, amount=9, unit="ud"
        )
        self.assertEqual(self.restore(token).status_code, 409)
        self.assertEqual(List.objects.get().amount, 9)

    def test_undo_is_personal_and_respects_current_membership(self):
        token = self.remove()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.restore(token).status_code, 404)
        self.client.force_authenticate(self.user)
        GroupMember.objects.filter(user=self.user).update(accepted=False)
        self.assertEqual(self.restore(token).status_code, 403)

    def test_undo_cannot_be_used_in_another_group_or_after_unit_change(self):
        token = self.remove()
        other_group = Group.objects.create(group_code="OTHERGRP", group_name="Otro")
        GroupMember.objects.create(user=self.user, group=other_group, accepted=True)
        response = self.client.post(
            "/api/lists/OTHERGRP/egg/restore/", {"undo_id": token}, format="json"
        )
        self.assertEqual(response.status_code, 404)
        Ingredient.objects.filter(pk=self.ingredient.pk).update(reference_format="kg")
        self.assertEqual(self.restore(token).status_code, 409)
        self.assertFalse(List.objects.exists())

    def test_expired_and_cleared_tickets_cannot_restore(self):
        token = self.remove()
        RemovedListItem.objects.filter(pk=token).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        self.assertEqual(self.restore(token).status_code, 404)
        self.client.delete("/api/lists/SHOPPING/")
        self.assertFalse(RemovedListItem.objects.exists())

    def test_stale_amount_edit_returns_conflict_without_changing_current_quantity(self):
        response = self.client.patch(
            self.url, {"amount": 5, "expected_amount": 1}, format="json"
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(List.objects.get().amount, 2)
        self.assertEqual(
            self.client.patch(
                self.url, {"amount": 5, "expected_amount": 2}, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(List.objects.get().amount, 5)

    def test_search_combines_main_category_and_text_before_paginating(self):
        main = IngredientCategory.objects.create(
            id_ingredient_category=1, name="Comida"
        )
        sub = IngredientCategory.objects.create(
            id_ingredient_category=2, name="Huevos", primary_category=1
        )
        self.ingredient.id_ingredient_categories.set([main, sub])
        Ingredient.objects.create(
            id_ingredient="other",
            name="Huevos de otra categoría",
            reference_format="ud",
        )
        response = self.client.get(
            "/api/ingredient_by_name/", {"name": "huevo", "category": 1, "page_size": 1}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["package_amount"], Decimal("2.000")
        )
        self.assertEqual(
            self.client.get(
                "/api/ingredient_by_name/", {"category": "invalid"}
            ).status_code,
            400,
        )
