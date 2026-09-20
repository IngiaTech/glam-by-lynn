"""Order numbers survive a collision instead of 500ing (readiness L4).

Generation used to SELECT to check the number was free, then INSERT later —
a check-then-insert race. Two concurrent orders could both find the same
number unused, and the loser hit the unique constraint at commit.
"""
from unittest.mock import MagicMock, patch

from sqlalchemy.exc import IntegrityError

from app.services import order_service


def _integrity_error():
    return IntegrityError("INSERT ...", {}, Exception("duplicate key"))


class TestGeneration:
    def test_format_is_unchanged(self):
        number = order_service.generate_order_number()
        assert number.startswith("ORD-")
        prefix, date_part, suffix = number.split("-")
        assert len(date_part) == 8 and date_part.isdigit()
        assert len(suffix) == 5 and suffix.isalnum()

    def test_generation_does_not_query_the_database(self):
        """The pre-check SELECT was the race; it should be gone."""
        db = MagicMock()
        order_service.generate_order_number(db)
        db.query.assert_not_called()

    def test_numbers_differ_across_calls(self):
        numbers = {order_service.generate_order_number() for _ in range(50)}
        assert len(numbers) > 45, "suffix should be random, not sequential"


class TestRetry:
    def test_collision_is_retried_rather_than_raised(self):
        db = MagicMock()
        sentinel = (True, "Order created successfully", object())

        with patch.object(
            order_service, "_create_order_once", side_effect=[_integrity_error(), sentinel]
        ) as impl:
            result = order_service.create_order(
                db=db,
                user=None,
                guest_info=None,
                delivery_info=None,
                promo_code=None,
                payment_method=None,
            )

        assert result == sentinel
        assert impl.call_count == 2
        db.rollback.assert_called_once()

    def test_a_second_collision_gives_up(self):
        """Retrying forever would hide a genuine constraint problem."""
        db = MagicMock()

        with patch.object(
            order_service,
            "_create_order_once",
            side_effect=[_integrity_error(), _integrity_error()],
        ) as impl:
            try:
                order_service.create_order(
                    db=db,
                    user=None,
                    guest_info=None,
                    delivery_info=None,
                    promo_code=None,
                    payment_method=None,
                )
            except IntegrityError:
                pass
            else:  # pragma: no cover
                raise AssertionError("second IntegrityError should propagate")

        assert impl.call_count == 2
        assert db.rollback.call_count == 2

    def test_success_first_time_does_not_retry(self):
        db = MagicMock()
        sentinel = (True, "Order created successfully", object())

        with patch.object(
            order_service, "_create_order_once", return_value=sentinel
        ) as impl:
            result = order_service.create_order(
                db=db,
                user=None,
                guest_info=None,
                delivery_info=None,
                promo_code=None,
                payment_method=None,
            )

        assert result == sentinel
        assert impl.call_count == 1
        db.rollback.assert_not_called()
