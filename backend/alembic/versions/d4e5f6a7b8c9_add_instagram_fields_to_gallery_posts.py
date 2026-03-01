"""add instagram fields to gallery_posts

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('gallery_posts', sa.Column('external_id', sa.String(100), nullable=True))
    op.add_column('gallery_posts', sa.Column('external_permalink', sa.String(500), nullable=True))
    op.create_unique_constraint('uq_gallery_posts_external_id', 'gallery_posts', ['external_id'])
    op.create_index('idx_gallery_posts_external_id', 'gallery_posts', ['external_id'])


def downgrade() -> None:
    op.drop_index('idx_gallery_posts_external_id', table_name='gallery_posts')
    op.drop_constraint('uq_gallery_posts_external_id', 'gallery_posts', type_='unique')
    op.drop_column('gallery_posts', 'external_permalink')
    op.drop_column('gallery_posts', 'external_id')
