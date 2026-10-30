from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import ListInputSerializer, ListOutputSerializer, ListPatchSerializer
from .models import List, RemovedListItem
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from ingredients.models import Ingredient
from groups.utils import get_my_group


class ListApiView(APIView):
    permission_classes = [IsAuthenticated]

    # Devuelve todos los productos de la lista
    def get(self, request, group_code):
        group, error = get_my_group(request, group_code)
        if error:
            return error

        list_items = List.objects.filter(group=group)
        serializer = ListOutputSerializer(list_items, many=True)
        total_price = 0

        for item in serializer.data:
            if item["calculated_price"] is not None:
                total_price += item["calculated_price"]

        return Response(
            {
                "items": serializer.data,
                "total_price": round(total_price, 2),
            },
            status=status.HTTP_200_OK,
        )

    # Añade un producto independiente a la lista
    @transaction.atomic
    def post(self, request, group_code):
        group, error = get_my_group(request, group_code, lock=True)
        if error:
            return error

        serializer = ListInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ingredient = Ingredient.objects.filter(
            id_ingredient=serializer.validated_data["id_ingredient"]
        ).first()
        if not ingredient:
            return Response(
                {"error": "El producto no existe."}, status=status.HTTP_404_NOT_FOUND
            )

        list_item = List.objects.filter(group=group, ingredient=ingredient).first()

        # Sumar la cantidad si ya existe o crear uno nuevo
        if list_item:
            list_item.amount += serializer.validated_data["amount"]
            list_item.unit = serializer.validated_data["unit"]
            list_item.bought = False
            list_item.save()
        else:
            list_item = List.objects.create(
                group=group,
                ingredient=ingredient,
                amount=serializer.validated_data["amount"],
                unit=serializer.validated_data["unit"],
                bought=False,
            )

        output_serializer = ListOutputSerializer(list_item)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    # Borrar todos los productos de la lista del grupo
    @transaction.atomic
    def delete(self, request, group_code):
        group, error = get_my_group(request, group_code, lock=True)
        if error:
            return error

        RemovedListItem.objects.filter(group=group).delete()
        List.objects.filter(group=group).delete()
        return Response(
            {"message": "Se ha eliminado la lista de la compra correctamente."},
            status=status.HTTP_200_OK,
        )


class ListPatchApiView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def delete(self, request, group_code, id_ingredient):
        group, error = get_my_group(request, group_code, lock=True)
        if error:
            return error
        item = List.objects.filter(group=group, ingredient_id=id_ingredient).first()
        if not item:
            return Response(
                {"error": "El producto no existe en la lista."},
                status=status.HTTP_404_NOT_FOUND,
            )
        RemovedListItem.objects.filter(expires_at__lte=timezone.now()).delete()
        removed = RemovedListItem.objects.create(
            group=group,
            ingredient=item.ingredient,
            removed_by=request.user,
            amount=item.amount,
            unit=item.unit,
            bought=item.bought,
            expires_at=timezone.now() + timedelta(seconds=30),
        )
        item.delete()
        return Response(
            {
                "message": "Producto eliminado de la lista de la compra.",
                "undo_id": str(removed.pk),
            },
            status=status.HTTP_200_OK,
        )

    # Endpoint para cambiar la cantidad, la unidad o el estado de "comprado" de un producto
    @transaction.atomic
    def patch(self, request, group_code, id_ingredient):
        group, error = get_my_group(request, group_code, lock=True)
        if error:
            return error

        list_item = List.objects.filter(
            group=group, ingredient_id=id_ingredient
        ).first()
        if not list_item:
            return Response(
                {"error": "El producto no existe en la lista."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ListPatchSerializer(list_item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        expected = serializer.validated_data.pop("expected_amount", None)
        if expected is not None and expected != list_item.amount:
            return Response(
                {
                    "error": "Otro miembro ha cambiado la cantidad. Revisa el valor actual antes de guardar."
                },
                status=409,
            )
        serializer.save()

        output_serializer = ListOutputSerializer(list_item)
        return Response(output_serializer.data, status=status.HTTP_200_OK)


class RestoreInputSerializer(serializers.Serializer):
    undo_id = serializers.UUIDField()


class ListRestoreApiView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, group_code, id_ingredient):
        group, error = get_my_group(request, group_code, lock=True)
        if error:
            return error
        data = RestoreInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        removed = RemovedListItem.objects.filter(
            pk=data.validated_data["undo_id"],
            group=group,
            ingredient_id=id_ingredient,
            removed_by=request.user,
            expires_at__gt=timezone.now(),
        ).first()
        if not removed:
            return Response(
                {"error": "Ya no se puede deshacer esta eliminación."}, status=404
            )
        if removed.unit != removed.ingredient.reference_format:
            removed.delete()
            return Response(
                {
                    "error": "La unidad del producto ha cambiado y no se puede restaurar esta cantidad."
                },
                status=409,
            )
        if List.objects.filter(group=group, ingredient_id=id_ingredient).exists():
            removed.delete()
            return Response(
                {
                    "error": "El producto ya se ha añadido de nuevo. Se ha conservado su cantidad actual."
                },
                status=409,
            )
        item = List.objects.create(
            group=group,
            ingredient=removed.ingredient,
            amount=removed.amount,
            unit=removed.unit,
            bought=removed.bought,
        )
        removed.delete()
        return Response(ListOutputSerializer(item).data, status=201)
