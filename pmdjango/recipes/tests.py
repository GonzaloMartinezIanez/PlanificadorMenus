from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from ingredients.models import Ingredient, IngredientCategory
from groups.models import Group, GroupMember
from .models import RecipeCategory, Recipe, IngredientInRecipe, RecipeComment

User = get_user_model()

class RecipeAndCommentApiTests(APITestCase):
  def setUp(self):
    self.owner = User.objects.create_user(username = "owner", password = "ownerpass123")
    self.groupmate = User.objects.create_user(username = "groupmate", password = "groupmatepass123")
    self.outsider = User.objects.create_user(username = "outsider", password = "outsiderpass123")

    self.group = Group.objects.create(
      group_code = "GRPTEST1",
      group_name = "Grupo recetas",
      group_description = "Grupo para compartir recetas",
    )
    GroupMember.objects.create(
      user = self.owner,
      group = self.group,
      role = "ADMIN",
      accepted = True,
    )
    GroupMember.objects.create(
      user = self.groupmate,
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
    self.recipe_category_main = RecipeCategory.objects.create(
      name = "Comida española",
      icon = "icons/comida-espanola.svg",
    )
    self.recipe_category_other = RecipeCategory.objects.create(
      name = "Cena rápida",
      icon = "icons/cena-rapida.svg",
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
    self.public_recipe.recipe_categories.set([self.recipe_category_main])
    IngredientInRecipe.objects.create(
      recipe = self.public_recipe,
      ingredient = self.ingredient_egg,
      amount = "6.000",
      unit = "ud",
    )

    self.private_recipe = Recipe.objects.create(
      user = self.owner,
      name = "Tortilla privada",
      description = "Receta privada",
      preparation_time = 25,
      steps = ["Pelar", "Freir"],
      visibility = "PRIVATE",
    )
    self.private_recipe.recipe_categories.set([self.recipe_category_main])

    self.groupmate_private_recipe = Recipe.objects.create(
      user = self.groupmate,
      name = "Receta del companero",
      description = "Privada del grupo",
      preparation_time = 15,
      steps = ["Paso 1"],
      visibility = "PRIVATE",
    )
    self.groupmate_private_recipe.recipe_categories.set([self.recipe_category_other])

  def test_get_recipe_categories_returns_all_categories(self):
    response = self.client.get("/api/recipe_category/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 2)

  def test_get_recipes_returns_only_public_recipes_for_anonymous_user(self):
    response = self.client.get("/api/recipes/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 1)
    self.assertEqual(response.data[0]["name"], "Tortilla publica")

  def test_get_recipes_returns_private_recipes_visible_to_authenticated_user(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.get("/api/recipes/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 3)

  def test_get_recipe_by_id_returns_404_when_private_recipe_is_not_visible(self):
    self.client.force_authenticate(user = self.outsider)

    response = self.client.get(f"/api/recipes/{self.private_recipe.id}/")

    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

  def test_get_recipes_by_category_returns_only_visible_recipes(self):
    response = self.client.get(f"/api/recipe_category/{self.recipe_category_main.id}/recipes/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 1)
    self.assertEqual(response.data[0]["name"], "Tortilla publica")

  def test_get_recipes_by_category_returns_owner_private_recipe_when_authenticated(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.get(f"/api/recipe_category/{self.recipe_category_main.id}/recipes/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 2)

  def test_get_recipes_by_category_returns_404_when_category_does_not_exist(self):
    response = self.client.get("/api/recipe_category/9999/recipes/")

    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    self.assertEqual(response.data["error"], "La categoría no existe.")

  def test_create_recipe_requires_authentication(self):
    response = self.client.post("/api/recipes/", {
      "name": "Nueva receta",
      "description": "Descripcion",
      "visibility": "PUBLIC",
      "recipe_categories": [self.recipe_category_main.id],
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

  def test_create_recipe_creates_categories_and_ingredients(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.post("/api/recipes/", {
      "name": "Tortilla nueva",
      "description": "Con cebolla",
      "preparation_time": 30,
      "steps": ["Cortar", "Batir", "Cocinar"],
      "visibility": "PRIVATE",
      "recipe_categories": [self.recipe_category_main.id, self.recipe_category_other.id],
      "ingredients": [
        {
          "id_ingredient": self.ingredient_egg.id_ingredient,
          "amount": "4.000",
          "unit": "ud",
        },
        {
          "id_ingredient": self.ingredient_potato.id_ingredient,
          "amount": "0.500",
          "unit": "kg",
        }
      ],
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertTrue(Recipe.objects.filter(name = "Tortilla nueva").exists())

    recipe = Recipe.objects.get(name = "Tortilla nueva")
    self.assertEqual(recipe.recipe_categories.count(), 2)
    self.assertEqual(IngredientInRecipe.objects.filter(recipe = recipe).count(), 2)

  def test_create_recipe_with_invalid_ingredient_returns_400_and_rolls_back(self):
    self.client.force_authenticate(user = self.owner)
    initial_count = Recipe.objects.count()

    response = self.client.post("/api/recipes/", {
      "name": "Receta invalida",
      "description": "Falla",
      "visibility": "PUBLIC",
      "recipe_categories": [self.recipe_category_main.id],
      "ingredients": [
        {
          "id_ingredient": "9999",
          "amount": "1.000",
          "unit": "ud",
        }
      ],
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertEqual(Recipe.objects.count(), initial_count)
    self.assertFalse(Recipe.objects.filter(name = "Receta invalida").exists())

  def test_put_recipe_updates_recipe_completely(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.put(f"/api/recipes/{self.public_recipe.id}/", {
      "name": "Tortilla actualizada",
      "description": "Nueva descripcion",
      "preparation_time": 35,
      "steps": ["Paso nuevo 1", "Paso nuevo 2"],
      "visibility": "PRIVATE",
      "recipe_categories": [self.recipe_category_other.id],
      "ingredients": [
        {
          "id_ingredient": self.ingredient_potato.id_ingredient,
          "amount": "1.000",
          "unit": "kg",
        }
      ],
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.public_recipe.refresh_from_db()
    self.assertEqual(self.public_recipe.name, "Tortilla actualizada")
    self.assertEqual(self.public_recipe.visibility, "PRIVATE")
    self.assertEqual(self.public_recipe.recipe_categories.first().id, self.recipe_category_other.id)
    self.assertEqual(IngredientInRecipe.objects.filter(recipe = self.public_recipe).count(), 1)

  def test_patch_recipe_updates_only_sent_fields(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.patch(f"/api/recipes/{self.private_recipe.id}/", {
      "steps": ["Paso 1", "Paso 2", "Paso 3"],
      "recipe_categories": [self.recipe_category_other.id],
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.private_recipe.refresh_from_db()
    self.assertEqual(self.private_recipe.steps, ["Paso 1", "Paso 2", "Paso 3"])
    self.assertEqual(self.private_recipe.recipe_categories.first().id, self.recipe_category_other.id)
    self.assertEqual(self.private_recipe.name, "Tortilla privada")

  def test_patch_recipe_forbidden_for_non_owner(self):
    self.client.force_authenticate(user = self.groupmate)

    response = self.client.patch(f"/api/recipes/{self.private_recipe.id}/", {
      "name": "No permitido",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

  def test_delete_recipe_removes_recipe(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.delete(f"/api/recipes/{self.private_recipe.id}/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertFalse(Recipe.objects.filter(id = self.private_recipe.id).exists())

  def test_get_comments_requires_authentication(self):
    response = self.client.get(f"/api/comments/{self.public_recipe.id}/")

    self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

  def test_create_comment_creates_rating_and_updates_recipe_score(self):
    self.client.force_authenticate(user = self.groupmate)

    response = self.client.post(f"/api/comments/{self.public_recipe.id}/", {
      "score": 4,
      "comment": "Muy buena receta",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertTrue(RecipeComment.objects.filter(recipe = self.public_recipe, user = self.groupmate).exists())

    self.public_recipe.refresh_from_db()
    self.assertEqual(self.public_recipe.num_valorations, 1)
    self.assertEqual(float(self.public_recipe.avg_score), 4.0)

  def test_create_comment_without_text_saves_null(self):
    self.client.force_authenticate(user = self.groupmate)

    response = self.client.post(f"/api/comments/{self.public_recipe.id}/", {
      "score": 5,
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    comment = RecipeComment.objects.get(recipe = self.public_recipe, user = self.groupmate)
    self.assertIsNone(comment.comment)

  def test_create_comment_twice_returns_400(self):
    RecipeComment.objects.create(
      user = self.groupmate,
      recipe = self.public_recipe,
      score = 4,
      comment = "Primero",
    )
    self.client.force_authenticate(user = self.groupmate)

    response = self.client.post(f"/api/comments/{self.public_recipe.id}/", {
      "score": 5,
      "comment": "Segundo",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertEqual(response.data["error"], "Ya has valorado esta receta.")

  def test_get_comments_returns_only_comments_with_text(self):
    RecipeComment.objects.create(
      user = self.owner,
      recipe = self.public_recipe,
      score = 5,
      comment = "Comentario visible",
    )
    RecipeComment.objects.create(
      user = self.groupmate,
      recipe = self.public_recipe,
      score = 4,
      comment = None,
    )
    self.client.force_authenticate(user = self.owner)

    response = self.client.get(f"/api/comments/{self.public_recipe.id}/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 1)
    self.assertEqual(response.data[0]["comment"], "Comentario visible")

  def test_put_comment_updates_existing_comment(self):
    RecipeComment.objects.create(
      user = self.groupmate,
      recipe = self.public_recipe,
      score = 3,
      comment = "Normal",
    )
    self.client.force_authenticate(user = self.groupmate)

    response = self.client.put(f"/api/comments/{self.public_recipe.id}/", {
      "score": 5,
      "comment": "Excelente",
    }, format = "json")

    self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
    comment = RecipeComment.objects.get(recipe = self.public_recipe, user = self.groupmate)
    self.assertEqual(comment.score, 5)
    self.assertEqual(comment.comment, "Excelente")

  def test_put_comment_returns_404_when_comment_does_not_exist(self):
    self.client.force_authenticate(user = self.groupmate)

    response = self.client.put(f"/api/comments/{self.public_recipe.id}/", {
      "score": 2,
      "comment": "No existe",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    self.assertEqual(response.data["error"], "No has valorado esta receta.")

  def test_comment_author_can_delete_comment_and_rating(self):
    RecipeComment.objects.create(
      user = self.groupmate,
      recipe = self.public_recipe,
      score = 4,
      comment = "Borrar entero",
    )
    self.client.force_authenticate(user = self.groupmate)

    response = self.client.delete(f"/api/comments/{self.public_recipe.id}/{self.groupmate.id}/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertFalse(RecipeComment.objects.filter(recipe = self.public_recipe, user = self.groupmate).exists())

  def test_recipe_owner_can_delete_only_comment_text_of_other_user(self):
    RecipeComment.objects.create(
      user = self.groupmate,
      recipe = self.public_recipe,
      score = 4,
      comment = "Texto a eliminar",
    )
    self.client.force_authenticate(user = self.owner)

    response = self.client.delete(f"/api/comments/{self.public_recipe.id}/{self.groupmate.id}/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    comment = RecipeComment.objects.get(recipe = self.public_recipe, user = self.groupmate)
    self.assertIsNone(comment.comment)
    self.assertEqual(comment.score, 4)

  def test_non_owner_cannot_delete_other_user_comment(self):
    another_user = User.objects.create_user(username = "another", password = "anotherpass123")
    RecipeComment.objects.create(
      user = another_user,
      recipe = self.public_recipe,
      score = 4,
      comment = "No deberia borrarse",
    )
    self.client.force_authenticate(user = self.groupmate)

    response = self.client.delete(f"/api/comments/{self.public_recipe.id}/{another_user.id}/")

    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

  def test_delete_comment_returns_404_when_comment_does_not_exist(self):
    self.client.force_authenticate(user = self.owner)

    response = self.client.delete(f"/api/comments/{self.public_recipe.id}/{self.outsider.id}/")

    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    self.assertEqual(response.data["error"], "El comentario no existe.")
