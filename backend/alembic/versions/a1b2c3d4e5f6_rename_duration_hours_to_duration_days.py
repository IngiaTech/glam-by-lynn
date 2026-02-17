"""rename duration_hours to duration_days

Revision ID: a1b2c3d4e5f6
Revises: cdc731822407
Create Date: 2026-02-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'cdc731822407'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('makeup_classes', 'duration_hours', new_column_name='duration_days')
    op.drop_constraint('makeup_classes_duration_check', 'makeup_classes', type_='check')
    op.create_check_constraint('makeup_classes_duration_check', 'makeup_classes', 'duration_days > 0')


def downgrade() -> None:
    op.alter_column('makeup_classes', 'duration_days', new_column_name='duration_hours')
    op.drop_constraint('makeup_classes_duration_check', 'makeup_classes', type_='check')
    op.create_check_constraint('makeup_classes_duration_check', 'makeup_classes', 'duration_hours > 0')
