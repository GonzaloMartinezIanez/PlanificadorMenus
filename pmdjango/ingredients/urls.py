from django.urls import path, include
from .views import IngredientByNameApiView, IngredientCategoryViewSet, IngredientViewSet, IngredientCategoryIngredientsApiView
from rest_framework.routers import DefaultRouter

ingredient_router = DefaultRouter()
ingredient_router.register(r'', IngredientViewSet, basename='ingredient-viewset')

ingredient_category_router = DefaultRouter()
ingredient_category_router.register(r'', IngredientCategoryViewSet, basename='ingredient-category-viewset')

urlpatterns = [
    path('ingredient_by_name/', IngredientByNameApiView.as_view(), name='ingredient-by-name-apiview'),
    path('ingredients/', include(ingredient_router.urls)),
    path('ingredient_categories/', include(ingredient_category_router.urls)),
    path('ingredient_categories/<int:id_ingredient_category>/ingredients/', IngredientCategoryIngredientsApiView.as_view(), name='ingredient-category-ingredients-apiview'),
]

