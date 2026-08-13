from django.urls import path, include
from .views import RecipeCategoryViewSet, RecipeCategoryRecipesApiView, RecipeApiView, RecipeSearchApiView, RecipeTopApiView, RecipeIdApiView
from .comment_views import CommentApiView, MyCommentApiView, CommentDeleteApiView
from rest_framework.routers import DefaultRouter

recipe_category_router = DefaultRouter()
recipe_category_router.register(r"", RecipeCategoryViewSet, basename = "recipe-category-viewset")

urlpatterns = [
    path("recipe_category/", include(recipe_category_router.urls)),
    path("recipe_category/<int:id_recipe_category>/recipes/", RecipeCategoryRecipesApiView.as_view(), name = "recipe-category-recipes-apiview"),
    path("recipes/", RecipeApiView.as_view(), name = "recipe-apiview"),
    path("recipes/search/", RecipeSearchApiView.as_view(), name = "recipe-search-apiview"),
    path("recipes/top/", RecipeTopApiView.as_view(), name = "recipe-top-apiview"),
    path("recipes/<int:id>/", RecipeIdApiView.as_view(), name = "recipe-id-apiview"),
    path("comments/<int:id>/", CommentApiView.as_view(), name = "comment-apiview"),
    path("comments/<int:id>/mine/", MyCommentApiView.as_view(), name = "my-comment-apiview"),
    path("comments/<int:id_recipe>/<int:id_user>/", CommentDeleteApiView.as_view(), name = "comment-delete-apiview")
]
