"""Drop the vision_registrations table

The 2026 Vision registration backend had no caller. The /vision page's interest
form never posted to it — it simulated a submission with a timer and then
showed a success message — so the table only ever received rows if someone
called the API directly (Cut List).

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-09-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS vision_registrations CASCADE")


def downgrade() -> None:
    """Recreate the table and its indexes.

    Rows are not recoverable. The partial indexes are reproduced exactly,
    including their WHERE clauses, so a restored table matches the original
    schema rather than an approximation of it.
    """
    op.create_table(
        "vision_registrations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone_number", sa.String(length=20), nullable=False),
        sa.Column("location", sa.String(length=100)),
        sa.Column("interested_in_salon", sa.Boolean(), default=False),
        sa.Column("interested_in_barbershop", sa.Boolean(), default=False),
        sa.Column("interested_in_spa", sa.Boolean(), default=False),
        sa.Column("interested_in_mobile_van", sa.Boolean(), default=False),
        sa.Column("additional_comments", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index(
        "ix_vision_registrations_email", "vision_registrations", ["email"]
    )
    op.create_index(
        "ix_vision_registrations_location", "vision_registrations", ["location"]
    )
    op.create_index(
        "ix_vision_registrations_created_at", "vision_registrations", ["created_at"]
    )

    for interest in ("salon", "barbershop", "spa", "mobile_van"):
        op.create_index(
            f"idx_vision_registrations_{interest}",
            "vision_registrations",
            [f"interested_in_{interest}"],
            postgresql_where=sa.text(f"interested_in_{interest} = TRUE"),
        )
