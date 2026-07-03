"""merge all heads

Revision ID: f032326b26a6
Revises: 4a8df2c1e73e, f3e5d7c9a1b3
Create Date: 2026-07-03 10:17:21.767087

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f032326b26a6'
down_revision: Union[str, None] = ('4a8df2c1e73e', 'f3e5d7c9a1b3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
