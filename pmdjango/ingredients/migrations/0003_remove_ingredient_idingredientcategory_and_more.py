from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingredients", "0002_alter_ingredientcategory_primarycategory"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="ingredient",
            name="idIngredientCategory",
        ),
        migrations.AddField(
            model_name="ingredient",
            name="idIngredientCategories",
            field=models.ManyToManyField(related_name="ingredients", to="ingredients.ingredientcategory"),
        ),
    ]
