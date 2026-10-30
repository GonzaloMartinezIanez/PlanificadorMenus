from decimal import Decimal
from django.test import SimpleTestCase
from .models import Ingredient
from .quantities import package_amount


class PackageAmountTests(SimpleTestCase):
    def test_catalog_units_and_pack_sizes(self):
        for unit, size, price, reference, expected in [
            ("kg", ".5", "2", "4", ".500"),
            ("L", "1.5", "3", "2", "1.500"),
            ("dc", "12", "3", "3", "1.000"),
            ("dz", "24", "6", "3", "2.000"),
            ("100 g", ".024", "1.05", "4.375", ".240"),
            ("100 ml", ".045", "2.5", "5.556", ".450"),
            ("ud", "1", "3.75", "1.875", "2.000"),
        ]:
            with self.subTest(unit=unit):
                ingredient = Ingredient(
                    reference_format=unit,
                    unit_size=Decimal(size),
                    unit_price=Decimal(price),
                    reference_price=Decimal(reference),
                )
                self.assertEqual(package_amount(ingredient), Decimal(expected))

    def test_does_not_invent_pack_count_from_weight_or_rounded_prices(self):
        ingredient = Ingredient(
            reference_format="ud",
            unit_size=Decimal(".0039"),
            unit_price=Decimal("5"),
            reference_price=Decimal(".167"),
        )
        self.assertIsNone(package_amount(ingredient))
        ingredient.reference_price = Decimal("0")
        self.assertIsNone(package_amount(ingredient))
        self.assertIsNone(package_amount(Ingredient(reference_format="kg")))
