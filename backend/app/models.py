from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class LandingSite(Base):
    __tablename__ = "landing_sites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    x_km: Mapped[float] = mapped_column(Float)
    y_km: Mapped[float] = mapped_column(Float)
    latitude_deg: Mapped[float] = mapped_column(Float, nullable=False)
    longitude_deg: Mapped[float] = mapped_column(Float, nullable=False)
    image_url: Mapped[str] = mapped_column(String(255))
    slope_deg: Mapped[float] = mapped_column(Float)
    illumination_pct: Mapped[float] = mapped_column(Float)
    earth_visibility_pct: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    mission_links: Mapped[list["MissionSite"]] = relationship(
        back_populates="site", cascade="all, delete-orphan"
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    # Store a password hash here, never the plain-text password.
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    access: Mapped[str] = mapped_column(String(20), nullable=False, default="explore")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    missions: Mapped[list["Mission"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    analysis_jobs: Mapped[list["AnalysisJob"]] = relationship(back_populates="user")


class Mission(Base):
    __tablename__ = "missions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    objective: Mapped[str] = mapped_column(String(255), nullable=False)
    duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="missions")
    requirements: Mapped["MissionRequirement | None"] = relationship(
        back_populates="mission", cascade="all, delete-orphan", uselist=False
    )
    site_links: Mapped[list["MissionSite"]] = relationship(
        back_populates="mission", cascade="all, delete-orphan"
    )
    analysis_jobs: Mapped[list["AnalysisJob"]] = relationship(back_populates="mission")


class MissionRequirement(Base):
    __tablename__ = "mission_requirements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mission_id: Mapped[str] = mapped_column(
        ForeignKey("missions.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    preferred_duration: Mapped[str | None] = mapped_column(String(80), nullable=True)
    energy_level: Mapped[str | None] = mapped_column(String(40), nullable=True)
    communication_level: Mapped[str | None] = mapped_column(String(40), nullable=True)
    energy_weight: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    mission: Mapped["Mission"] = relationship(back_populates="requirements")


class MissionSite(Base):
    __tablename__ = "mission_sites"
    __table_args__ = (UniqueConstraint("mission_id", "site_id", name="uq_mission_site"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mission_id: Mapped[str] = mapped_column(
        ForeignKey("missions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    site_id: Mapped[str] = mapped_column(
        ForeignKey("landing_sites.id", ondelete="CASCADE"), index=True, nullable=False
    )
    is_selected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    mission: Mapped["Mission"] = relationship(back_populates="site_links")
    site: Mapped["LandingSite"] = relationship(back_populates="mission_links")


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    mission_id: Mapped[str | None] = mapped_column(
        ForeignKey("missions.id", ondelete="SET NULL"), index=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(JSON)
    result: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    user: Mapped["User | None"] = relationship(back_populates="analysis_jobs")
    mission: Mapped["Mission | None"] = relationship(back_populates="analysis_jobs")
