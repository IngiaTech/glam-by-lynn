"""relax booking location to address + description only

Bookings no longer require a predefined location_id or full Mapbox
lat/lng/distance. The address (search result) is what we keep; an
optional `location_description` lets the customer add directions or
landmarks. Transport cost is computed manually after the booking is
placed, so the old check constraint that required full coordinates is
replaced with a simpler "address is set" check.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-05-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("location_description", sa.Text(), nullable=True),
    )
    # The legacy constraint may or may not exist depending on how the DB
    # was originally provisioned — drop defensively.
    op.execute(
        "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_location_check"
    )
    op.create_check_constraint(
        "bookings_location_check",
        "bookings",
        "location_id IS NOT NULL OR custom_location_address IS NOT NULL",
    )


def downgrade() -> None:
    op.drop_constraint("bookings_location_check", "bookings", type_="check")
    op.create_check_constraint(
        "bookings_location_check",
        "bookings",
        """
        location_id IS NOT NULL OR
        (custom_location_address IS NOT NULL AND
         custom_location_latitude IS NOT NULL AND
         custom_location_longitude IS NOT NULL AND
         custom_location_distance_km IS NOT NULL)
        """,
    )
    op.drop_column("bookings", "location_description")
