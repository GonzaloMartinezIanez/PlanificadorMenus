from rest_framework import serializers
from decimal import Decimal
from .models import Recipe, RecipeCategory, RecipeComment, IngredientInRecipe
from config.favorites import favorite_status


class RecipeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RecipeCategory
        fields = "__all__"


class RecipeIngredientInputSerializer(serializers.Serializer):
    id_ingredient = serializers.CharField()
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=3, min_value=Decimal("0.001")
    )
    unit = serializers.CharField(max_length=30)


class RecipeInputSerializer(serializers.ModelSerializer):
    recipe_categories = serializers.PrimaryKeyRelatedField(
        many=True, queryset=RecipeCategory.objects.all()
    )  # Lista de categoría
    ingredients = RecipeIngredientInputSerializer(
        many=True, required=False
    )  # Lista de ingredientes {id, cantidad, unidad}
    # Con required = False se permite que no se mande siempre (para PUT o PATCH)

    class Meta:
        model = Recipe
        fields = [
            "name",
            "description",
            "preparation_time",
            "steps",
            "visibility",
            "recipe_categories",
            "ingredients",
        ]


class RecipeIngredientOutputSerializer(serializers.ModelSerializer):
    package_amount = serializers.SerializerMethodField()

    def get_package_amount(self, obj):
        from ingredients.quantities import package_amount

        return package_amount(obj.ingredient)

    id_ingredient = serializers.CharField(
        source="ingredient.id_ingredient", read_only=True
    )
    name = serializers.CharField(source="ingredient.name", read_only=True)
    image = serializers.CharField(source="ingredient.image", read_only=True)
    reference_format = serializers.CharField(
        source="ingredient.reference_format", read_only=True
    )
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=3, coerce_to_string=False
    )  # Eliminar los 0 a la derecha y limita a 3 decimales

    class Meta:
        model = IngredientInRecipe
        fields = [
            "id_ingredient",
            "name",
            "image",
            "reference_format",
            "package_amount",
            "amount",
            "unit",
        ]


class RecipeOutputSerializer(serializers.ModelSerializer):
    is_favorite = serializers.SerializerMethodField()

    def get_is_favorite(self, obj):
        return favorite_status(obj, self.context.get("request"))

    author = serializers.CharField(source="user.username", read_only=True)
    recipe_categories = RecipeCategorySerializer(many=True, read_only=True)
    ingredients = serializers.SerializerMethodField()  # get_ingredients()
    is_author = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = [
            "id",
            "author",
            "is_author",
            "is_favorite",
            "creation_date",
            "name",
            "description",
            "preparation_time",
            "steps",
            "visibility",
            "recipe_categories",
            "num_valorations",
            "avg_score",
            "ingredients",
        ]

        read_only_fields = ["creation_date"]

    def get_ingredients(self, obj):
        ingredients = IngredientInRecipe.objects.filter(recipe=obj)
        return RecipeIngredientOutputSerializer(ingredients, many=True).data

    def get_is_author(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return obj.user_id == request.user.id


class CommentInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecipeComment
        fields = ["score", "comment"]


class CommentFilterSerializer(serializers.Serializer):
    order = serializers.ChoiceField(choices=["newest", "oldest"], default="newest")
    scores = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=5), default=list
    )


class CommentOutputSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source="user.username", read_only=True)
    user_id = serializers.CharField(source="user.id", read_only=True)
    recipe = serializers.CharField(source="recipe.id", read_only=True)

    class Meta:
        model = RecipeComment
        fields = ["recipe", "user", "user_id", "score", "comment", "created_at"]
        read_only_fields = ["created_at"]
