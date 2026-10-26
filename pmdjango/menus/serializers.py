from rest_framework import serializers
from .models import Menu
from recipes.serializers import RecipeOutputSerializer
from datetime import timedelta


class MenuRangeSerializer(serializers.Serializer):
    start = serializers.DateField(input_formats=["%Y-%m-%d"])
    end = serializers.DateField(input_formats=["%Y-%m-%d"], required=False)

    def validate(self, attrs):
        try:
            end = attrs.get("end")
            if end is None:
                end = attrs["start"] + timedelta(days=6)
            if not 0 <= (end - attrs["start"]).days < 31:
                raise serializers.ValidationError(
                    "El intervalo debe contener entre 1 y 31 días."
                )
        except OverflowError:
            raise serializers.ValidationError("El intervalo de fechas no es válido.")
        attrs["end"] = end
        return attrs


class MenuInputSerializer(serializers.ModelSerializer):
    id_recipe = serializers.IntegerField(write_only=True)

    class Meta:
        model = Menu
        fields = ["id_recipe", "date", "time"]


class MenuOutputSerializer(serializers.ModelSerializer):
    recipe = RecipeOutputSerializer(read_only=True)

    class Meta:
        model = Menu
        fields = ["recipe", "date", "time"]
