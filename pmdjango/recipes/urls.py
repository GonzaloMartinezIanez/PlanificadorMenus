from django.urls import path, include
from .views import RecipeCategoryViewSet, RecipeCategoryRecipesApiView, RecipeApiView, RecipeIdApiView
from .comment_views import CommentApiView, CommentDeleteApiView
from rest_framework.routers import DefaultRouter

recipe_category_router = DefaultRouter()
recipe_category_router.register(r"", RecipeCategoryViewSet, basename = "recipe-category-viewset")

urlpatterns = [
    path("recipe_category/", include(recipe_category_router.urls)),
    path("recipe_category/<int:id_recipe_category>/recipes/", RecipeCategoryRecipesApiView.as_view(), name = "recipe-category-recipes-apiview"),
    path("recipes/", RecipeApiView.as_view(), name = "recipe-apiview"),
    path("recipes/<int:id>/", RecipeIdApiView.as_view(), name = "recipe-id-apiview"),
    path("comments/<int:id>/", CommentApiView.as_view(), name = "comment-apiview"),
    path("comments/<int:id_recipe>/<int:id_user>/", CommentDeleteApiView.as_view(), name = "comment-delete-apiview")
]
