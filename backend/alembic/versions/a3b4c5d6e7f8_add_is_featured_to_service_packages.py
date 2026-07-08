"""add is_featured to service_packages

Revision ID: a3b4c5d6e7f8
Revises: f7a8b9c0d1e2
Create Date: 2026-07-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "service_packages",
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index(
        "ix_service_packages_is_featured", "service_packages", ["is_featured"]
    )


def downgrade() -> None:
    op.drop_index("ix_service_packages_is_featured", table_name="service_packages")
    op.drop_column("service_packages", "is_featured")
