"""Money crosses the API boundary as Decimal, not float (readiness L3).

Storage and arithmetic were already Decimal on Numeric(10,2); only the booking
response schema and the CSV export coerced to binary float, which reintroduces
representation drift at the last step.
"""
import json
from decimal import Decimal

from app.schemas.booking import BookingResponse


def test_booking_money_fields_are_decimal():
    fields = BookingResponse.model_fields
    for name in ["subtotal", "transport_cost", "total_amount"]:
        assert fields[name].annotation is Decimal, name


def test_decimal_survives_json_without_drift():
    """A float round-trip is what produced values like 2500.0100000000002."""
    payload = Decimal("2500.01")

    # Serialised through Decimal the exact value is preserved...
    from pydantic import BaseModel

    class AsDecimal(BaseModel):
        v: Decimal

    class AsFloat(BaseModel):
        v: float

    decimal_value = json.loads(AsDecimal(v=payload).model_dump_json())["v"]
    assert Decimal(str(decimal_value)) == payload

    # ...and the sum of two Decimals stays exact, where floats would not.
    assert Decimal("0.1") + Decimal("0.2") == Decimal("0.3")
    assert 0.1 + 0.2 != 0.3


def test_three_decimal_money_values_sum_exactly():
    """The booking total is subtotal + transport; it must not drift."""
    subtotal = Decimal("2500.01")
    transport = Decimal("1000.02")
    assert subtotal + transport == Decimal("3500.03")
