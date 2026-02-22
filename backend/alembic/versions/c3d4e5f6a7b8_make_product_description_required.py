"""make product description required

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-02-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Populate null descriptions with the product title
    op.execute("UPDATE products SET description = title WHERE description IS NULL")
    # Make description NOT NULL
    op.alter_column('products', 'description', existing_type=sa.Text(), nullable=False)


def downgrade() -> None:
    op.alter_column('products', 'description', existing_type=sa.Text(), nullable=True)
