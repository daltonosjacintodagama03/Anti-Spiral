import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class SiteInput(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        allow_inf_nan=False,
        populate_by_name=True,
    )

    name: str = Field(min_length=1, max_length=120)
    x_km: float = Field(ge=-1000, le=1000)
    y_km: float = Field(ge=-1000, le=1000)
    slope_deg: float = Field(ge=0, le=90)
    illumination_pct: float = Field(ge=0, le=100)
    earth_visibility_pct: float = Field(ge=0, le=100)


class SiteRead(SiteInput):
    model_config = ConfigDict(
        alias_generator=to_camel,
        from_attributes=True,
        populate_by_name=True,
    )

    id: str


class JobCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    kind: str = Field(min_length=1, max_length=80)
    payload: dict[str, Any]


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    kind: str
    status: str
    payload: dict[str, Any]
    result: dict[str, Any] | None
    error: str | None
    created_at: datetime
    updated_at: datetime


def is_valid_identifier(value: str) -> bool:
    return bool(re.fullmatch(r"[a-zA-Z0-9_-]+", value))
