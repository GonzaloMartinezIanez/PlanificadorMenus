from decimal import Decimal, ROUND_HALF_UP


def package_amount(ingredient):
    """Contenido del envase expresado en la unidad fija del catálogo."""
    unit = (ingredient.reference_format or "").lower()
    size = ingredient.unit_size
    amount = None
    if size is not None and size > 0:
        if unit in ("kg", "l", "m"):
            amount = size
        elif unit in ("dc", "dz"):
            amount = size / Decimal("12")
        elif unit in ("100 g", "100 ml"):
            amount = size * Decimal("10")
    # unit_size puede ser peso incluso cuando el producto se vende por piezas.
    if amount is None and unit in ("ud", "lv"):
        if (
            ingredient.reference_price
            and ingredient.reference_price > 0
            and ingredient.unit_price
            and ingredient.unit_price > 0
        ):
            ratio = ingredient.unit_price / ingredient.reference_price
            if ratio == ratio.to_integral_value():
                amount = ratio
    if amount is None:
        return None
    amount = amount.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
    return amount if amount >= Decimal("0.001") else None
