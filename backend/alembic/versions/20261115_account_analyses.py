"""Account sessions and private mission requirement analyses."""
from alembic import op
import sqlalchemy as sa
revision = '20261115_accounts'
down_revision = '821b1b9d8827'
branch_labels = depends_on = None


def upgrade():
    op.create_table('account_sessions',
        sa.Column('token_hash', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False))
    op.create_index('ix_account_sessions_user_id', 'account_sessions', ['user_id'])
    op.create_table('mission_analyses',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('owner_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('requirements', sa.JSON(), nullable=False),
        sa.Column('results', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False))
    op.create_index('ix_mission_analyses_owner_id', 'mission_analyses', ['owner_id'])


def downgrade():
    op.drop_table('mission_analyses')
    op.drop_table('account_sessions')
