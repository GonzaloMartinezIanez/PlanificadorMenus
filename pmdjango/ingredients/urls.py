from django.urls import path, include
from .views import IngredientCategoryViewSet, IngredientViewSet
from rest_framework.routers import DefaultRouter

ingredient_router = DefaultRouter()
ingredient_router.register(r'', IngredientViewSet, basename='ingredient-viewset')

ingredient_category_router = DefaultRouter()
ingredient_category_router.register(r'', IngredientCategoryViewSet, basename='ingredient-category-viewset')

urlpatterns = [
    path('ingredients/', include(ingredient_router.urls)),
    path('ingredient_categories/', include(ingredient_category_router.urls)),
]

