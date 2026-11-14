"""Create landing sites and analysis jobs.

Revision ID: 0001_create_sites_and_jobs
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_create_sites_and_jobs"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "landing_sites",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("x_km", sa.Float(), nullable=False),
        sa.Column("y_km", sa.Float(), nullable=False),
        sa.Column("slope_deg", sa.Float(), nullable=False),
        sa.Column("illumination_pct", sa.Float(), nullable=False),
        sa.Column("earth_visibility_pct", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_landing_sites_name", "landing_sites", ["name"], unique=False)

    op.create_table(
        "analysis_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("kind", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("analysis_jobs")
    op.drop_index("ix_landing_sites_name", table_name="landing_sites")
    op.drop_table("landing_sites")
