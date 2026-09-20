"""Drop the admin_activity_logs table

The audit log was never written to: no code path created an AdminActivityLog,
so the table has always been empty (Cut List). The router that read it, its
schema, service and model are removed in the same change.

Unlike most drops this one loses nothing, because there was never anything in
it — but downgrade() recreates the table exactly, so the schema is
reconstructible even though rows are not.

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-09-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS admin_activity_logs CASCADE")


def downgrade() -> None:
    """Recreate the table and its indexes.

    Rows are not recoverable, which is academic here: nothing ever wrote one.
    """
    op.create_table(
        "admin_activity_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "admin_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=50)),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("details", postgresql.JSONB()),
        sa.Column("ip_address", sa.String(length=45)),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index(
        "ix_admin_activity_logs_admin_user_id", "admin_activity_logs", ["admin_user_id"]
    )
    op.create_index("ix_admin_activity_logs_action", "admin_activity_logs", ["action"])
    op.create_index(
        "ix_admin_activity_logs_created_at", "admin_activity_logs", ["created_at"]
    )
    op.create_index(
        "idx_admin_activity_logs_entity",
        "admin_activity_logs",
        ["entity_type", "entity_id"],
    )
    op.create_index(
        "idx_admin_activity_logs_details",
        "admin_activity_logs",
        ["details"],
        postgresql_using="gin",
    )
