"""Collapse admin roles to admin and super_admin

The granular roles (product_manager, booking_manager, content_editor, artist)
were assignable but enforced nothing — no router ever depended on their guards,
so anyone holding one had full admin access anyway. Mapping them to 'admin'
therefore preserves every user's real access exactly; it only stops the UI
implying a restriction that was never applied.

Revision ID: b1c2d3e4f5a6
Revises: a3b4c5d6e7f8
Create Date: 2026-09-19

"""
from typing import Sequence, Union

from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CONSTRAINT = "users_admin_role_values"
OLD_ROLES = "'super_admin', 'product_manager', 'booking_manager', 'content_editor', 'artist'"
NEW_ROLES = "'super_admin', 'admin'"


def upgrade() -> None:
    # Drop the constraint first: the rows can't be rewritten while it still
    # forbids the value we're rewriting them to.
    op.execute(f"ALTER TABLE users DROP CONSTRAINT IF EXISTS {CONSTRAINT}")

    op.execute(
        """
        UPDATE users
        SET admin_role = 'admin'
        WHERE admin_role IS NOT NULL
          AND admin_role <> 'super_admin'
        """
    )

    op.execute(
        f"ALTER TABLE users ADD CONSTRAINT {CONSTRAINT} "
        f"CHECK (admin_role IN ({NEW_ROLES}))"
    )


def downgrade() -> None:
    """Restore the old constraint.

    The original per-user roles are not recoverable — they were collapsed into
    'admin' and nothing recorded which one each user held. Downgrading widens
    the constraint again and leaves everyone as 'admin', which remains valid
    under the old check only after it is re-added, so the rows are rewritten to
    a role that exists in the old set.
    """
    op.execute(f"ALTER TABLE users DROP CONSTRAINT IF EXISTS {CONSTRAINT}")

    # 'admin' is not a member of the old role set, so park these users on
    # product_manager — historically the default the UI offered.
    op.execute(
        """
        UPDATE users
        SET admin_role = 'product_manager'
        WHERE admin_role = 'admin'
        """
    )

    op.execute(
        f"ALTER TABLE users ADD CONSTRAINT {CONSTRAINT} "
        f"CHECK (admin_role IN ({OLD_ROLES}))"
    )
