from django.db.models import BooleanField, Exists, OuterRef, Value
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class FavoriteFilterSerializer(serializers.Serializer):
    favorites = serializers.BooleanField(required=False, default=False)


def with_favorite_status(queryset, request):
    if not request.user.is_authenticated:
        return queryset.annotate(is_favorite=Value(False, output_field=BooleanField()))
    favorites = queryset.model.objects.filter(
        pk=OuterRef("pk"), favorite_users=request.user
    )
    return queryset.annotate(is_favorite=Exists(favorites))


def filter_favorites(queryset, request):
    query = FavoriteFilterSerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    if query.validated_data["favorites"]:
        if not request.user.is_authenticated:
            raise NotAuthenticated("Inicia sesión para ver tus favoritos.")
        return queryset.filter(is_favorite=True)
    return queryset


def favorite_status(obj, request):
    if not request or not request.user.is_authenticated:
        return False
    if hasattr(obj, "is_favorite"):
        return obj.is_favorite
    return obj.favorite_users.filter(pk=request.user.pk).exists()


class FavoriteApiView(APIView):
    """Idempotent operations on the authenticated user's own favorites."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self, request):
        raise NotImplementedError

    def put(self, request, pk):
        obj = get_object_or_404(self.get_queryset(request), pk=pk)
        obj.favorite_users.add(request.user)
        return Response({"is_favorite": True})

    def delete(self, request, pk):
        obj = get_object_or_404(self.get_queryset(request), pk=pk)
        obj.favorite_users.remove(request.user)
        return Response({"is_favorite": False})
