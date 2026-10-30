from .models import IngredientCategory, Ingredient
from .serializers import IngredientCategorySerializer, IngredientSerializer
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from .serializers import IngredientSearchSerializer
from config.permissions import IsEmailAuthorizedOrReadOnly
from config.pagination import IngredientPagination, paginated_response
from config.favorites import FavoriteApiView, filter_favorites, with_favorite_status


class IngredientFavoriteApiView(FavoriteApiView):
    def get_queryset(self, request):
        return Ingredient.objects.all()


# CRUD de Categorías de ingredientes
class IngredientCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsEmailAuthorizedOrReadOnly]
    queryset = IngredientCategory.objects.all()
    serializer_class = IngredientCategorySerializer
    lookup_field = "id_ingredient_category"

    # Permitir insertar múltiples categorías en la misma petición
    def get_serializer(self, *args, **kwargs):
        if isinstance(kwargs.get("data", {}), list):
            kwargs["many"] = True
        return super().get_serializer(*args, **kwargs)


# Endpoint que devuelve los ingredientes de una categoría. Las categorías principales no devuelven nada
class IngredientCategoryIngredientsApiView(APIView):
    permission_classes = []

    def get(self, request, id_ingredient_category):
        if not IngredientCategory.objects.filter(
            id_ingredient_category=id_ingredient_category
        ).exists():
            return Response(
                {"error": "La categoria no existe."}, status=status.HTTP_404_NOT_FOUND
            )

        ingredients = Ingredient.objects.filter(
            id_ingredient_categories__id_ingredient_category=id_ingredient_category
        )
        ingredients = filter_favorites(
            with_favorite_status(ingredients, request), request
        )
        return paginated_response(
            ingredients.order_by("name", "pk"),
            request,
            IngredientSerializer,
            IngredientPagination,
        )


class IngredientViewSet(viewsets.ModelViewSet):
    pagination_class = IngredientPagination
    permission_classes = [IsEmailAuthorizedOrReadOnly]
    queryset = Ingredient.objects.order_by("name", "pk")
    serializer_class = IngredientSerializer
    lookup_field = "id_ingredient"
    lookup_value_regex = "[^/]+"

    def get_queryset(self):
        return filter_favorites(
            with_favorite_status(super().get_queryset(), self.request), self.request
        )

    # Permitir insertar múltiples ingredientes en la misma petición
    def get_serializer(self, *args, **kwargs):
        if isinstance(kwargs.get("data", {}), list):
            kwargs["many"] = True
        return super().get_serializer(*args, **kwargs)


# Endpoint para buscar un ingrediente por texto
class IngredientByNameApiView(APIView):
    permission_classes = []

    def get(self, request):
        if (
            not request.GET.get("name", "").strip()
            and "category" not in request.GET
            and "favorites" not in request.GET
        ):
            return Response(
                {"error": "El parámetro 'name' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        query = IngredientSearchSerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        ingredients = Ingredient.objects.filter(
            name__icontains=query.validated_data["name"]
        )
        category = query.validated_data.get("category")
        if category is not None:
            categories = IngredientCategory.objects.filter(
                Q(pk=category) | Q(primary_category=category)
            )
            ingredients = ingredients.filter(
                id_ingredient_categories__in=categories
            ).distinct()
        ingredients = filter_favorites(
            with_favorite_status(ingredients, request), request
        )
        return paginated_response(
            ingredients.order_by("name", "pk"),
            request,
            IngredientSerializer,
            IngredientPagination,
        )
