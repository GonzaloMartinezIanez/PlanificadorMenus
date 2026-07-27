from rest_framework import status
from rest_framework.test import APITestCase
from .models import Ingredient, IngredientCategory

class IngredientApiTests(APITestCase):
  def setUp(self):
    self.category_main = IngredientCategory.objects.create(
      id_ingredient_category = 1,
      name = "Fruta y verdura",
      primary_category = None,
      icon = "icons/fruta-y-verdura.svg",
    )
    self.category_secondary = IngredientCategory.objects.create(
      id_ingredient_category = 27,
      name = "Fruta",
      primary_category = 1,
      icon = None,
    )
    self.category_other = IngredientCategory.objects.create(
      id_ingredient_category = 37,
      name = "Cerdo",
      primary_category = 3,
      icon = None,
    )
    self.ingredient_apple = Ingredient.objects.create(
      id_ingredient = "1001",
      name = "Manzana",
      packaging = "Bolsa",
      reference_format = "kg",
      reference_price = 2.350,
      unit_price = 2.35,
      unit_size = 1.00000,
      image = "apple.jpg",
    )
    self.ingredient_apple.id_ingredient_categories.set([self.category_secondary])
    self.ingredient_ham = Ingredient.objects.create(
      id_ingredient = "2001.1",
      name = "Jamon cocido",
      packaging = "Paquete",
      reference_format = "kg",
      reference_price = 8.900,
      unit_price = 1.78,
      unit_size = 0.20000,
      image = "ham.jpg",
    )
    self.ingredient_ham.id_ingredient_categories.set([self.category_other])

  def test_get_ingredient_categories_returns_all_categories(self):
    response = self.client.get("/api/ingredient_categories/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 3)

  def test_get_single_ingredient_category_returns_category(self):
    response = self.client.get(f"/api/ingredient_categories/{self.category_main.id_ingredient_category}/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(response.data["name"], "Fruta y verdura")

  def test_create_single_ingredient_category(self):
    response = self.client.post("/api/ingredient_categories/", {
      "id_ingredient_category": 99,
      "name": "Nueva categoria",
      "primary_category": None,
      "icon": None,
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertTrue(IngredientCategory.objects.filter(id_ingredient_category = 99).exists())

  def test_create_multiple_ingredient_categories(self):
    response = self.client.post("/api/ingredient_categories/", [
      {
        "id_ingredient_category": 100,
        "name": "Categoria 100",
        "primary_category": None,
        "icon": None,
      },
      {
        "id_ingredient_category": 101,
        "name": "Categoria 101",
        "primary_category": 100,
        "icon": None,
      },
    ], format = "json")

    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertEqual(len(response.data), 2)
    self.assertTrue(IngredientCategory.objects.filter(id_ingredient_category = 100).exists())
    self.assertTrue(IngredientCategory.objects.filter(id_ingredient_category = 101).exists())

  def test_update_ingredient_category(self):
    response = self.client.patch(f"/api/ingredient_categories/{self.category_secondary.id_ingredient_category}/", {
      "name": "Fruta fresca",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.category_secondary.refresh_from_db()
    self.assertEqual(self.category_secondary.name, "Fruta fresca")

  def test_delete_ingredient_category(self):
    response = self.client.delete(f"/api/ingredient_categories/{self.category_other.id_ingredient_category}/")

    self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    self.assertFalse(IngredientCategory.objects.filter(id_ingredient_category = self.category_other.id_ingredient_category).exists())

  def test_get_ingredients_returns_all_ingredients(self):
    response = self.client.get("/api/ingredients/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 2)

  def test_get_single_ingredient_returns_ingredient(self):
    response = self.client.get(f"/api/ingredients/{self.ingredient_ham.id_ingredient}/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(response.data["name"], "Jamon cocido")

  def test_create_single_ingredient(self):
    response = self.client.post("/api/ingredients/", {
      "id_ingredient": "3001",
      "id_ingredient_categories": [self.category_secondary.id_ingredient_category, self.category_other.id_ingredient_category],
      "name": "Pera",
      "packaging": "Bolsa",
      "reference_format": "kg",
      "reference_price": "2.500",
      "unit_price": "2.50",
      "unit_size": "1.00000",
      "image": "pear.jpg",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertTrue(Ingredient.objects.filter(id_ingredient = "3001").exists())
    ingredient = Ingredient.objects.get(id_ingredient = "3001")
    self.assertEqual(ingredient.id_ingredient_categories.count(), 2)

  def test_create_multiple_ingredients(self):
    response = self.client.post("/api/ingredients/", [
      {
        "id_ingredient": "3002",
        "id_ingredient_categories": [self.category_secondary.id_ingredient_category],
        "name": "Platano",
        "packaging": "Bolsa",
        "reference_format": "kg",
        "reference_price": "1.950",
        "unit_price": "1.95",
        "unit_size": "1.00000",
        "image": "banana.jpg",
      },
      {
        "id_ingredient": "3003",
        "id_ingredient_categories": [self.category_other.id_ingredient_category],
        "name": "Lomo",
        "packaging": "Bandeja",
        "reference_format": "kg",
        "reference_price": "6.250",
        "unit_price": "3.12",
        "unit_size": "0.50000",
        "image": "loin.jpg",
      },
    ], format = "json")

    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertEqual(len(response.data), 2)
    self.assertTrue(Ingredient.objects.filter(id_ingredient = "3002").exists())
    self.assertTrue(Ingredient.objects.filter(id_ingredient = "3003").exists())

  def test_update_ingredient(self):
    response = self.client.patch(f"/api/ingredients/{self.ingredient_apple.id_ingredient}/", {
      "name": "Manzana roja",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.ingredient_apple.refresh_from_db()
    self.assertEqual(self.ingredient_apple.name, "Manzana roja")

  def test_delete_ingredient(self):
    response = self.client.delete(f"/api/ingredients/{self.ingredient_apple.id_ingredient}/")

    self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    self.assertFalse(Ingredient.objects.filter(id_ingredient = self.ingredient_apple.id_ingredient).exists())

  def test_get_ingredients_by_category_returns_matching_ingredients(self):
    response = self.client.get(f"/api/ingredient_categories/{self.category_secondary.id_ingredient_category}/ingredients/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 1)
    self.assertEqual(response.data[0]["id_ingredient"], "1001")

  def test_get_ingredients_by_category_returns_404_when_category_does_not_exist(self):
    response = self.client.get("/api/ingredient_categories/9999/ingredients/")

    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    self.assertEqual(response.data["error"], "La categoria no existe.")

  def test_get_ingredient_by_name_returns_matching_ingredients(self):
    response = self.client.get("/api/ingredient_by_name/?name=jamon")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 1)
    self.assertEqual(response.data[0]["id_ingredient"], "2001.1")

  def test_get_ingredient_by_name_returns_empty_list_when_no_match(self):
    response = self.client.get("/api/ingredient_by_name/?name=kiwi")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(response.data, [])

  def test_get_ingredient_by_name_returns_400_when_name_is_missing(self):
    response = self.client.get("/api/ingredient_by_name/")

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertEqual(response.data["error"], "El parámetro 'name' es obligatorio.")

  def test_create_ingredient_category_without_name_returns_400(self):
    response = self.client.post("/api/ingredient_categories/", {
      "id_ingredient_category": 500,
      "primary_category": None,
      "icon": None,
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

  def test_create_ingredient_without_categories_returns_400(self):
    response = self.client.post("/api/ingredients/", {
      "id_ingredient": "9999",
      "name": "Ingrediente sin categorias",
      "packaging": "Unidad",
      "reference_format": "ud",
      "reference_price": "1.000",
      "unit_price": "1.00",
      "unit_size": "1.00000",
      "image": "none.jpg",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
