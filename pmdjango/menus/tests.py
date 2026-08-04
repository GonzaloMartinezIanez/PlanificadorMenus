from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from groups.models import Group, GroupMember
from ingredients.models import Ingredient, IngredientCategory
from recipes.models import Recipe, IngredientInRecipe
from lists.models import List
from .models import Menu

User = get_user_model()

class MenuApiTests(APITestCase):
  def setUp(self):
    self.owner = User.objects.create_user(username = "owner", password = "ownerpass123")
    self.member = User.objects.create_user(username = "member", password = "memberpass123")
    self.outsider = User.objects.create_user(username = "outsider", password = "outsiderpass123")

    self.group = Group.objects.create(
      group_code = "MENUTEST",
      group_name = "Grupo menu",
      group_description = "Descripcion menu",
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

    self.ingredient_category = IngredientCategory.objects.create(
      id_ingredient_category = 1,
      name = "Huevos",
      primary_category = None,
      icon = None,
    )
    self.ingredient_egg = Ingredient.objects.create(
      id_ingredient = "1001",
      name = "Huevo",
      packaging = "Docena",
      reference_format = "ud",
      reference_price = "2.400",
      unit_price = "0.20",
      unit_size = "12.00000",
      image = "egg.jpg",
    )
    self.ingredient_egg.id_ingredient_categories.set([self.ingredient_category])
    self.ingredient_potato = Ingredient.objects.create(
      id_ingredient = "1002",
      name = "Patata",
      packaging = "Malla",
      reference_format = "kg",
      reference_price = "3.500",
      unit_price = "1.75",
      unit_size = "2.00000",
      image = "potato.jpg",
    )
    self.ingredient_potato.id_ingredient_categories.set([self.ingredient_category])

    self.public_recipe = Recipe.objects.create(
      user = self.owner,
      name = "Tortilla publica",
      description = "Receta publica",
      preparation_time = 20,
      steps = ["Batir", "Cocinar"],
      visibility = "PUBLIC",
    )
    IngredientInRecipe.objects.create(
      recipe = self.public_recipe,
      ingredient = self.ingredient_egg,
      amount = "6.000",
      unit = "ud",
    )
    IngredientInRecipe.objects.create(
      recipe = self.public_recipe,
      ingredient = self.ingredient_potato,
      amount = "1.000",
      unit = "kg",
    )

    self.private_outsider_recipe = Recipe.objects.create(
      user = self.outsider,
      name = "Receta privada externa",
      description = "Privada",
      preparation_time = 10,
      steps = ["Paso 1"],
      visibility = "PRIVATE",
    )

    self.today = timezone.localdate()
    self.future_date = self.today + timedelta(days = 2)
    self.other_future_date = self.today + timedelta(days = 3)
    self.past_date = self.today - timedelta(days = 1)

  def test_get_menus_requires_authentication(self):
    response = self.client.get(f"/api/menus/{self.group.group_code}/")

    self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

  def test_get_menus_returns_only_today_and_future_group_menus(self):
    Menu.objects.create(
      group = self.group,
      recipe = self.public_recipe,
      date = self.past_date,
      time = "LUNCH",
    )
    Menu.objects.create(
      group = self.group,
      recipe = self.public_recipe,
      date = self.future_date,
      time = "DINNER",
    )
    self.client.force_authenticate(user = self.member)

    response = self.client.get(f"/api/menus/{self.group.group_code}/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 1)
    self.assertEqual(response.data[0]["date"], str(self.future_date))

  def test_non_member_cannot_get_menus(self):
    self.client.force_authenticate(user = self.outsider)

    response = self.client.get(f"/api/menus/{self.group.group_code}/")

    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

  def test_post_menu_creates_menu_and_adds_ingredients_to_list(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.post(f"/api/menus/{self.group.group_code}/", {
      "id_recipe": self.public_recipe.id,
      "date": str(self.future_date),
      "time": "LUNCH",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertTrue(Menu.objects.filter(group = self.group, recipe = self.public_recipe, date = self.future_date, time = "LUNCH").exists())
    self.assertEqual(List.objects.filter(group = self.group).count(), 2)

    egg_item = List.objects.get(group = self.group, ingredient = self.ingredient_egg)
    potato_item = List.objects.get(group = self.group, ingredient = self.ingredient_potato)
    self.assertEqual(float(egg_item.amount), 6.0)
    self.assertEqual(float(potato_item.amount), 1.0)

  def test_post_menu_allows_same_recipe_twice_same_slot(self):
    self.client.force_authenticate(user = self.owner)

    first_response = self.client.post(f"/api/menus/{self.group.group_code}/", {
      "id_recipe": self.public_recipe.id,
      "date": str(self.future_date),
      "time": "LUNCH",
    }, format = "json")
    second_response = self.client.post(f"/api/menus/{self.group.group_code}/", {
      "id_recipe": self.public_recipe.id,
      "date": str(self.future_date),
      "time": "LUNCH",
    }, format = "json")

    self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
    self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
    self.assertEqual(Menu.objects.filter(group = self.group, recipe = self.public_recipe, date = self.future_date, time = "LUNCH").count(), 2)

    egg_item = List.objects.get(group = self.group, ingredient = self.ingredient_egg)
    self.assertEqual(float(egg_item.amount), 12.0)

  def test_post_menu_returns_400_for_past_date(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.post(f"/api/menus/{self.group.group_code}/", {
      "id_recipe": self.public_recipe.id,
      "date": str(self.past_date),
      "time": "DINNER",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertEqual(response.data["error"], "La fecha no puede ser anterior a hoy.")

  def test_post_menu_returns_404_for_recipe_not_visible(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.post(f"/api/menus/{self.group.group_code}/", {
      "id_recipe": self.private_outsider_recipe.id,
      "date": str(self.future_date),
      "time": "DINNER",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

  def test_delete_menu_removes_first_matching_menu_and_subtracts_ingredients(self):
    Menu.objects.create(
      group = self.group,
      recipe = self.public_recipe,
      date = self.future_date,
      time = "LUNCH",
    )
    Menu.objects.create(
      group = self.group,
      recipe = self.public_recipe,
      date = self.future_date,
      time = "LUNCH",
    )
    List.objects.create(
      group = self.group,
      ingredient = self.ingredient_egg,
      amount = "12.000",
      unit = "ud",
      bought = False,
    )
    List.objects.create(
      group = self.group,
      ingredient = self.ingredient_potato,
      amount = "2.000",
      unit = "kg",
      bought = False,
    )
    self.client.force_authenticate(user = self.owner)

    response = self.client.delete(f"/api/menus/{self.group.group_code}/", {
      "id_recipe": self.public_recipe.id,
      "date": str(self.future_date),
      "time": "LUNCH",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(Menu.objects.filter(group = self.group, recipe = self.public_recipe, date = self.future_date, time = "LUNCH").count(), 1)

    egg_item = List.objects.get(group = self.group, ingredient = self.ingredient_egg)
    potato_item = List.objects.get(group = self.group, ingredient = self.ingredient_potato)
    self.assertEqual(float(egg_item.amount), 6.0)
    self.assertEqual(float(potato_item.amount), 1.0)

  def test_delete_menu_removes_list_item_when_amount_reaches_zero(self):
    Menu.objects.create(
      group = self.group,
      recipe = self.public_recipe,
      date = self.other_future_date,
      time = "DINNER",
    )
    List.objects.create(
      group = self.group,
      ingredient = self.ingredient_egg,
      amount = "6.000",
      unit = "ud",
      bought = False,
    )
    List.objects.create(
      group = self.group,
      ingredient = self.ingredient_potato,
      amount = "1.000",
      unit = "kg",
      bought = False,
    )
    self.client.force_authenticate(user = self.owner)

    response = self.client.delete(f"/api/menus/{self.group.group_code}/", {
      "id_recipe": self.public_recipe.id,
      "date": str(self.other_future_date),
      "time": "DINNER",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertFalse(List.objects.filter(group = self.group, ingredient = self.ingredient_egg).exists())
    self.assertFalse(List.objects.filter(group = self.group, ingredient = self.ingredient_potato).exists())

  def test_delete_menu_returns_404_when_recipe_is_not_planned(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.delete(f"/api/menus/{self.group.group_code}/", {
      "id_recipe": self.public_recipe.id,
      "date": str(self.future_date),
      "time": "BREAKFAST",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

  def test_delete_menu_returns_400_for_past_date(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.delete(f"/api/menus/{self.group.group_code}/", {
      "id_recipe": self.public_recipe.id,
      "date": str(self.past_date),
      "time": "LUNCH",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
