from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.integrations.horizons import HorizonsError, analyze

router = APIRouter(prefix='/api/positions', tags=['positions'])


class PositionRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra='forbid')
    latitude_deg: float = Field(gt=-90, lt=90)
    longitude_deg: float = Field(ge=-360, le=360)
    start_utc: datetime
    duration_hours: int = Field(ge=1, le=168)
    step_minutes: int = Field(ge=1, le=60)

    @field_validator('longitude_deg')
    @classmethod
    def normalize_longitude(cls, value):
        return (value + 180) % 360 - 180

    @field_validator('start_utc')
    @classmethod
    def utc(cls, value):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError('Indique timezone, por exemplo Z para UTC.')
        value = value.astimezone(timezone.utc)
        if value.second or value.microsecond:
            raise ValueError('Use um início com precisão de minuto.')
        return value

    @model_validator(mode='after')
    def bounds(self):
        if self.start_utc.year != 2026 or self.grid()[-1].year != 2026:
            raise ValueError('O intervalo deve estar inteiramente em 2026.')
        if len(self.grid()) > 200:
            raise ValueError('Máximo de 200 amostras; aumente o passo ou reduza a duração.')
        return self

    def grid(self):
        end = self.start_utc + timedelta(hours=self.duration_hours)
        count = self.duration_hours * 60 // self.step_minutes
        times = [self.start_utc + timedelta(minutes=i * self.step_minutes) for i in range(count + 1)]
        if times[-1] != end:
            times.append(end)
        return times


class Angles(BaseModel):
    azimuth_deg: float
    elevation_deg: float


class PositionSample(BaseModel):
    timestamp_utc: datetime
    sun: Angles
    earth: Angles


class PositionSource(BaseModel):
    body: str
    url: str
    parameters: dict[str, str]
    retrieved_at: datetime
    response_sha256: str


class VisibilitySummary(BaseModel):
    visible_seconds: float
    invisible_seconds: float
    known_seconds: float
    unknown_seconds: float
    visible_fraction_total: float
    coverage_fraction: float
    longest_visible_seconds: float
    longest_invisible_seconds: float


class VisibilityEvent(BaseModel):
    event_type: str
    time_utc: datetime
    bracket_start_utc: datetime
    bracket_end_utc: datetime
    method: str


class VisibilityWindow(BaseModel):
    condition: str
    state: str
    start_utc: datetime
    end_utc: datetime
    duration_seconds: float


class VisibilityResult(BaseModel):
    duration_seconds: float
    summary: dict[str, VisibilitySummary]
    max_sun_elevation_deg: float | None
    events: list[VisibilityEvent]
    windows: list[VisibilityWindow]
    event_absence: dict[str, str]


class PositionResult(BaseModel):
    run_id: str
    engine_version: str
    visibility_rule: str
    visibility: VisibilityResult
    request: PositionRequest
    model: str
    coordinate_frame: str
    reference_surface_assumption: str
    samples: list[PositionSample]
    sources: list[PositionSource]
    limitations: list[str]


@router.post('', response_model=PositionResult)
async def positions(request: PositionRequest):
    try:
        return await analyze(request)
    except HorizonsError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
