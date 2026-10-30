from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase

from groups.models import Group, GroupMember
from ingredients.models import Ingredient, IngredientCategory
from .models import Recipe, RecipeCategory


@override_settings(AUTHORIZED_EMAIL=["admin@example.com"])
class FavoriteApiTests(APITestCase):
    def setUp(self):
        users = get_user_model()
        self.user = users.objects.create_user(username="reader")
        self.other = users.objects.create_user(username="other")
        self.ingredient = Ingredient.objects.create(pk="100.1", name="Manzana")
        self.second = Ingredient.objects.create(pk="200", name="Pera")
        self.recipe = Recipe.objects.create(
            user=self.other, name="Tarta", visibility="PUBLIC"
        )
        self.private = Recipe.objects.create(
            user=self.other, name="Privada", visibility="PRIVATE"
        )
        self.client.force_authenticate(self.user)

    def test_favorites_are_personal_and_operations_are_idempotent(self):
        for kind, obj, listing in [
            ("ingredients", self.ingredient, "/api/ingredients/"),
            ("recipes", self.recipe, "/api/recipes/search/"),
        ]:
            with self.subTest(kind=kind):
                url = f"/api/{kind}/{obj.pk}/favorite/"
                for _ in range(2):
                    response = self.client.put(
                        url, {"user": self.other.pk}, format="json"
                    )
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.data, {"is_favorite": True})
                self.assertEqual(obj.favorite_users.count(), 1)
                self.assertTrue(obj.favorite_users.filter(pk=self.user.pk).exists())
                result = self.client.get(listing, {"favorites": "true"})
                self.assertEqual(result.data["count"], 1)
                self.assertTrue(result.data["results"][0]["is_favorite"])
                self.client.force_authenticate(self.other)
                self.assertEqual(
                    self.client.get(listing, {"favorites": "true"}).data["count"], 0
                )
                self.client.delete(url)
                self.assertTrue(obj.favorite_users.filter(pk=self.user.pk).exists())
                self.client.force_authenticate(self.user)
                for _ in range(2):
                    self.assertEqual(
                        self.client.delete(url).data, {"is_favorite": False}
                    )
                self.assertEqual(
                    self.client.get(listing, {"favorites": "true"}).data["count"], 0
                )

    def test_authentication_and_missing_objects(self):
        for kind in ["ingredients", "recipes"]:
            self.assertEqual(
                self.client.put(f"/api/{kind}/999/favorite/").status_code, 404
            )
        self.client.force_authenticate(None)
        for kind, obj in [("ingredients", self.ingredient), ("recipes", self.recipe)]:
            url = f"/api/{kind}/{obj.pk}/favorite/"
            self.assertEqual(self.client.put(url).status_code, 401)
            self.assertEqual(self.client.delete(url).status_code, 401)
            self.assertEqual(
                self.client.get(f"/api/{kind}/", {"favorites": "true"}).status_code, 401
            )
        public = self.client.get("/api/recipes/")
        self.assertFalse(public.data["results"][0]["is_favorite"])
        self.assertFalse(
            self.client.get("/api/ingredients/").data["results"][0]["is_favorite"]
        )

    def test_favorite_never_grants_visibility_to_a_private_recipe(self):
        url = f"/api/recipes/{self.private.pk}/favorite/"
        self.assertEqual(self.client.put(url).status_code, 404)
        group = Group.objects.create(group_code="FAVTEST1", group_name="Casa")
        GroupMember.objects.create(group=group, user=self.other, accepted=True)
        member = GroupMember.objects.create(group=group, user=self.user, accepted=False)
        self.assertEqual(self.client.put(url).status_code, 404)
        member.accepted = True
        member.save()
        self.assertEqual(self.client.put(url).status_code, 200)
        self.assertTrue(
            self.client.get(f"/api/recipes/{self.private.pk}/").data["is_favorite"]
        )
        member.delete()
        self.assertEqual(
            self.client.get("/api/recipes/search/?favorites=true").data["count"], 0
        )
        self.assertEqual(
            self.client.get(f"/api/recipes/{self.private.pk}/").status_code, 404
        )
        self.assertEqual(self.client.put(url).status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)

    def test_product_filters_combine_and_paginate_before_serializing(self):
        category = IngredientCategory.objects.create(pk=1, name="Fruta")
        self.ingredient.id_ingredient_categories.add(category)
        self.ingredient.favorite_users.add(self.user)
        self.second.favorite_users.add(self.user)
        for endpoint in ["/api/ingredients/", "/api/ingredient_by_name/"]:
            response = self.client.get(endpoint, {"favorites": "true", "page_size": 1})
            self.assertEqual(response.data["count"], 2)
            self.assertIsNotNone(response.data["next"])
            response = self.client.get(response.data["next"])
            self.assertTrue(response.data["results"][0]["is_favorite"])
        result = self.client.get(
            "/api/ingredient_by_name/?favorites=true&name=Man&category=1"
        )
        self.assertEqual(result.data["count"], 1)
        result = self.client.get(
            "/api/ingredient_categories/1/ingredients/?favorites=true"
        )
        self.assertEqual(result.data["count"], 1)
        self.assertTrue(result.data["results"][0]["is_favorite"])
        self.assertEqual(
            self.client.get(
                "/api/ingredient_by_name/?favorites=true&name=Pera&category=1"
            ).data["count"],
            0,
        )

    def test_recipe_filters_combine_and_paginate(self):
        category = RecipeCategory.objects.create(name="Postres")
        self.recipe.recipe_categories.add(category)
        self.recipe.favorite_users.add(self.user)
        another = Recipe.objects.create(
            user=self.other, name="Tarta de pera", visibility="PUBLIC"
        )
        another.favorite_users.add(self.user)
        response = self.client.get("/api/recipes/search/?favorites=true&page_size=1")
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNotNone(response.data["next"])
        response = self.client.get(
            f"/api/recipes/search/?favorites=true&name=Tarta&categories={category.pk}"
        )
        self.assertEqual(response.data["count"], 1)
        response = self.client.get(
            f"/api/recipe_category/{category.pk}/recipes/?favorites=true"
        )
        self.assertEqual(response.data["count"], 1)

    def test_invalid_filter_is_rejected_and_favorite_users_are_not_exposed(self):
        for endpoint in ["/api/ingredients/", "/api/recipes/search/"]:
            self.assertEqual(
                self.client.get(endpoint, {"favorites": "invalid"}).status_code, 400
            )
            result = self.client.get(endpoint).data["results"][0]
            self.assertNotIn("favorite_users", result)
        self.ingredient.favorite_users.add(self.other)
        result = self.client.get(f"/api/ingredients/{self.ingredient.pk}/")
        self.assertFalse(result.data["is_favorite"])
        # Annotation avoids one favorites query per catalog item.
        from config.favorites import with_favorite_status
        from rest_framework.request import Request
        from rest_framework.test import APIRequestFactory, force_authenticate
        from ingredients.serializers import IngredientSerializer

        raw = APIRequestFactory().get("/")
        force_authenticate(raw, self.user)
        request = Request(raw)
        items = with_favorite_status(
            Ingredient.objects.all(), request
        ).prefetch_related("id_ingredient_categories")
        with self.assertNumQueries(2):
            self.assertEqual(
                len(
                    IngredientSerializer(
                        items, many=True, context={"request": request}
                    ).data
                ),
                2,
            )
