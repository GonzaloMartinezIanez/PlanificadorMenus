from rest_framework import serializers
from .models import Recipe, RecipeCategory, RecipeComment, IngredientInRecipe

class RecipeCategorySerializer(serializers.ModelSerializer):
  class Meta:
    model = RecipeCategory
    fields = "__all__"

class RecipeIngredientInputSerializer(serializers.Serializer):
  id_ingredient = serializers.CharField()
  amount = serializers.DecimalField(max_digits = 10, decimal_places = 3)
  unit = serializers.CharField(max_length = 30)

class RecipeInputSerializer(serializers.ModelSerializer):
  recipe_categories = serializers.PrimaryKeyRelatedField(many = True, queryset = RecipeCategory.objects.all()) # Lista de categoría
  ingredients = RecipeIngredientInputSerializer(many = True, required = False) # Lista de ingredientes {id, cantidad, unidad}
                                                                               # Con required = False se permite que no se mande siempre (para PUT o PATCH)

  class Meta:
    model = Recipe
    fields = ["name", "description", "preparation_time", "steps", "visibility", "recipe_categories", "ingredients"]

class RecipeIngredientOutputSerializer(serializers.ModelSerializer):
  id_ingredient = serializers.CharField(source = "ingredient.id_ingredient", read_only = True)
  name = serializers.CharField(source = "ingredient.name", read_only = True)

  class Meta:
    model = IngredientInRecipe
    fields = ["id_ingredient", "name", "amount", "unit"]

class RecipeOutputSerializer(serializers.ModelSerializer):
  author = serializers.CharField(source = "user.username", read_only = True)
  recipe_categories = RecipeCategorySerializer(many = True, read_only = True)
  ingredients = serializers.SerializerMethodField() # get_ingredients()

  class Meta:
    model = Recipe
    fields = ["id", "author", "name", "description", "preparation_time", "steps", "visibility", "recipe_categories", "num_valorations", "avg_score", "ingredients"]

  def get_ingredients(self, obj):
    ingredients = IngredientInRecipe.objects.filter(recipe = obj)
    return RecipeIngredientOutputSerializer(ingredients, many = True).data

class CommentInputSerializer(serializers.ModelSerializer):
  class Meta:
    model = RecipeComment
    fields = ["score", "comment"]

class CommentOutputSerializer(serializers.ModelSerializer):
  user = serializers.CharField(source = "user.username", read_only = True)
  user_id = serializers.CharField(source = "user.id", read_only = True)
  recipe = serializers.CharField(source = "recipe.id", read_only = True)

  class Meta:
    model = RecipeComment
    fields = ["recipe", "user", "user_id", "score", "comment"]