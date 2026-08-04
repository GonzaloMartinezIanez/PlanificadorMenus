from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from groups.models import Group, GroupMember
from ingredients.models import Ingredient, IngredientCategory
from .models import List

User = get_user_model()

class ListApiTests(APITestCase):
  def setUp(self):
    self.owner = User.objects.create_user(username = "owner", password = "ownerpass123")
    self.member = User.objects.create_user(username = "member", password = "memberpass123")
    self.outsider = User.objects.create_user(username = "outsider", password = "outsiderpass123")

    self.group = Group.objects.create(
      group_code = "LISTTEST",
      group_name = "Grupo lista",
      group_description = "Descripcion lista",
    )
    GroupMember.objects.create(
      user = self.owner,
      group = self.group,
      role = "ADMIN",
      accepted = True,
    )
    GroupMember.objects.create(
      user = self.member,
      group = self.group,
      role = "MEMBER",
      accepted = True,
    )

    self.category = IngredientCategory.objects.create(
      id_ingredient_category = 1,
      name = "General",
      primary_category = None,
      icon = None,
    )
    self.ingredient_milk = Ingredient.objects.create(
      id_ingredient = "2001",
      name = "Leche",
      packaging = "Brick",
      reference_format = "l",
      reference_price = "1.150",
      unit_price = "1.15",
      unit_size = "1.00000",
      image = "milk.jpg",
    )
    self.ingredient_milk.id_ingredient_categories.set([self.category])
    self.ingredient_bread = Ingredient.objects.create(
      id_ingredient = "2002",
      name = "Pan",
      packaging = "Barra",
      reference_format = "ud",
      reference_price = "0.900",
      unit_price = "0.90",
      unit_size = "1.00000",
      image = "bread.jpg",
    )
    self.ingredient_bread.id_ingredient_categories.set([self.category])

  def test_get_list_requires_authentication(self):
    response = self.client.get(f"/api/lists/{self.group.group_code}/")

    self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

  def test_get_list_returns_group_items(self):
    List.objects.create(
      group = self.group,
      ingredient = self.ingredient_milk,
      amount = "2.000",
      unit = "l",
      bought = False,
    )
    List.objects.create(
      group = self.group,
      ingredient = self.ingredient_bread,
      amount = "1.000",
      unit = "ud",
      bought = True,
    )
    self.client.force_authenticate(user = self.member)

    response = self.client.get(f"/api/lists/{self.group.group_code}/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 2)

  def test_non_member_cannot_get_list(self):
    self.client.force_authenticate(user = self.outsider)

    response = self.client.get(f"/api/lists/{self.group.group_code}/")

    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

  def test_post_list_creates_new_item(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.post(f"/api/lists/{self.group.group_code}/", {
      "id_ingredient": self.ingredient_milk.id_ingredient,
      "amount": "2.000",
      "unit": "l",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertTrue(List.objects.filter(group = self.group, ingredient = self.ingredient_milk).exists())

  def test_post_list_sums_existing_item_and_resets_bought(self):
    List.objects.create(
      group = self.group,
      ingredient = self.ingredient_milk,
      amount = "1.000",
      unit = "l",
      bought = True,
    )
    self.client.force_authenticate(user = self.owner)

    response = self.client.post(f"/api/lists/{self.group.group_code}/", {
      "id_ingredient": self.ingredient_milk.id_ingredient,
      "amount": "2.000",
      "unit": "l",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    list_item = List.objects.get(group = self.group, ingredient = self.ingredient_milk)
    self.assertEqual(float(list_item.amount), 3.0)
    self.assertFalse(list_item.bought)

  def test_post_list_returns_404_for_missing_ingredient(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.post(f"/api/lists/{self.group.group_code}/", {
      "id_ingredient": "9999",
      "amount": "1.000",
      "unit": "ud",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    self.assertEqual(response.data["error"], "El producto no existe.")

  def test_patch_list_updates_amount_unit_and_bought(self):
    List.objects.create(
      group = self.group,
      ingredient = self.ingredient_bread,
      amount = "1.000",
      unit = "ud",
      bought = False,
    )
    self.client.force_authenticate(user = self.member)

    response = self.client.patch(f"/api/lists/{self.group.group_code}/{self.ingredient_bread.id_ingredient}/", {
      "amount": "3.500",
      "unit": "kg",
      "bought": True,
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    list_item = List.objects.get(group = self.group, ingredient = self.ingredient_bread)
    self.assertEqual(float(list_item.amount), 3.5)
    self.assertEqual(list_item.unit, "kg")
    self.assertTrue(list_item.bought)

  def test_patch_list_returns_404_when_item_does_not_exist(self):
    self.client.force_authenticate(user = self.member)

    response = self.client.patch(f"/api/lists/{self.group.group_code}/{self.ingredient_bread.id_ingredient}/", {
      "bought": True,
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    self.assertEqual(response.data["error"], "El producto no existe en la lista.")

  def test_delete_list_removes_all_group_items(self):
    List.objects.create(
      group = self.group,
      ingredient = self.ingredient_milk,
      amount = "2.000",
      unit = "l",
      bought = False,
    )
    List.objects.create(
      group = self.group,
      ingredient = self.ingredient_bread,
      amount = "1.000",
      unit = "ud",
      bought = False,
    )
    self.client.force_authenticate(user = self.owner)

    response = self.client.delete(f"/api/lists/{self.group.group_code}/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(List.objects.filter(group = self.group).count(), 0)

  def test_non_member_cannot_delete_list(self):
    self.client.force_authenticate(user = self.outsider)

    response = self.client.delete(f"/api/lists/{self.group.group_code}/")

    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
