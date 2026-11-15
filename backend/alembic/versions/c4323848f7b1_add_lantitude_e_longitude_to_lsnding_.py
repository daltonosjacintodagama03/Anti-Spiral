"""add lunar coordinates and image reference to landing sites

Revision ID: c4323848f7b1
Revises: 821b1b9d8827
Create Date: 2026-11-15 12:05:10.014758

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4323848f7b1'
down_revision: Union[str, Sequence[str], None] = '821b1b9d8827'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing sites have no known lunar coordinates or image reference. Keep
    # these nullable instead of fabricating (0, 0) or making this migration fail
    # when the table already contains rows.
    op.add_column("landing_sites", sa.Column("latitude_deg", sa.Float(), nullable=True))
    op.add_column("landing_sites", sa.Column("longitude_deg", sa.Float(), nullable=True))
    op.add_column("landing_sites", sa.Column("image_url", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("landing_sites", "image_url")
    op.drop_column("landing_sites", "longitude_deg")
    op.drop_column("landing_sites", "latitude_deg")
