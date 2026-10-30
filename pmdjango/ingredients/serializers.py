from rest_framework import serializers

from .models import Ingredient, IngredientCategory
from .quantities import package_amount
from config.favorites import favorite_status


class IngredientCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = IngredientCategory
        fields = "__all__"


class IngredientSerializer(serializers.ModelSerializer):
    is_favorite = serializers.SerializerMethodField()

    def get_is_favorite(self, obj):
        return favorite_status(obj, self.context.get("request"))

    package_amount = serializers.SerializerMethodField()

    def get_package_amount(self, obj):
        return package_amount(obj)

    id_ingredient_categories = serializers.PrimaryKeyRelatedField(
        many=True, queryset=IngredientCategory.objects.all()
    )

    class Meta:
        model = Ingredient
        exclude = ["favorite_users"]


class IngredientSearchSerializer(serializers.Serializer):
    favorites = serializers.BooleanField(required=False, default=False)
    name = serializers.CharField(required=False, allow_blank=True, default="")
    category = serializers.IntegerField(required=False, min_value=1)

    def validate(self, data):
        if not data["name"] and "category" not in data and not data["favorites"]:
            raise serializers.ValidationError(
                "Introduce un nombre o selecciona una categoría."
            )
        return data
