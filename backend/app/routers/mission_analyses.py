"""Private, resumable site-by-site analyses. Each accepted request is immutable."""
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, StrictInt, model_validator, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MissionAnalysis, User
from app.routers.accounts import current_user
from app.routers.positions import PositionRequest, PositionResult
from app.integrations.horizons import analyze, HorizonsError

router = APIRouter(prefix='/api', tags=['mission requirements'])
SOURCE = 'https://ntrs.nasa.gov/citations/20230007818'


class MissionSite(BaseModel):
    id: str
    name: str
    latitude_deg: float
    longitude_deg: float
    source: str = SOURCE
    reference: str = 'Lunar Surface Data Book Rev A (2023), Table A2-2, pp. 57–58; ponto regional, não aterragem certificada.'


SITES = [
    MissionSite(id='shackleton', name='Shackleton Rim', latitude_deg=-89.7668, longitude_deg=-171.87),
    MissionSite(id='nobile', name='Nobile Rim 1', latitude_deg=-85.4381, longitude_deg=37.36667),
    MissionSite(id='gerlache', name='de Gerlache Rim 1', latitude_deg=-88.6834, longitude_deg=-67.9321),
    MissionSite(id='malapert', name='Malapert Massif', latitude_deg=-85.9948, longitude_deg=-0.23578),
    MissionSite(id='amundsen', name='Amundsen Rim', latitude_deg=-84.2287, longitude_deg=69.44396),
    MissionSite(id='haworth', name='Haworth', latitude_deg=-86.7639, longitude_deg=-22.777),
]
CATALOG = {site.id: site for site in SITES}


class MissionPositionRequest(PositionRequest):
    duration_hours: int = Field(ge=1, le=17520)
    step_minutes: int = Field(ge=1, le=1440)

    @model_validator(mode='after')
    def bounds(self):
        if self.start_utc.year < 2026 or (self.start_utc + timedelta(hours=self.duration_hours)).year > 2028:
            raise ValueError('O intervalo deve estar entre 2026-01-01 e 2028-12-31 UTC.')
        if self.duration_hours*60 // self.step_minutes + 1 + bool(self.duration_hours*60 % self.step_minutes) > 5000:
            raise ValueError('Máximo 5000 amostras por local; aumente explicitamente o passo temporal.')
        return self


class MissionPositionResult(PositionResult):
    request: MissionPositionRequest


class Requirements(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra='forbid')
    name: str = Field(min_length=1, max_length=120)
    objectives: list[Literal['science', 'resources', 'technology', 'astronomy']] = Field(min_length=1, max_length=4)
    duration_value: StrictInt = Field(ge=1, le=730)
    duration_unit: Literal['day', 'week', 'month', 'year'] = 'week'
    start_utc: datetime
    step_minutes: StrictInt = Field(ge=1, le=1440)
    site_ids: list[str] = Field(min_length=2, max_length=4)
    minimum_light_pct: float = Field(ge=0, le=100, default=50)
    minimum_earth_pct: float = Field(ge=0, le=100, default=50)
    maximum_dark_hours: float = Field(ge=0, le=17520, default=72)
    maximum_earth_outage_hours: float = Field(ge=0, le=17520, default=72)

    @field_validator('name')
    @classmethod
    def meaningful_name(cls, value):
        if not value.strip():
            raise ValueError('Indique um nome.')
        return value.strip()

    def hours(self):
        return self.duration_value * {'day':24, 'week':168, 'month':720, 'year':8760}[self.duration_unit]

    def position_request(self, site):
        return MissionPositionRequest(latitude_deg=site.latitude_deg, longitude_deg=site.longitude_deg,
                                      start_utc=self.start_utc, duration_hours=self.hours(), step_minutes=self.step_minutes)

    @model_validator(mode='after')
    def validate_request(self):
        if len(set(self.objectives)) != len(self.objectives) or len(set(self.site_ids)) != len(self.site_ids):
            raise ValueError('Objectivos e locais não podem estar repetidos.')
        if any(site not in CATALOG for site in self.site_ids):
            raise ValueError('Local não consta do catálogo verificado.')
        request = self.position_request(CATALOG[self.site_ids[0]])
        self.start_utc = request.start_utc
        return self


class RequirementCheck(BaseModel):
    name: str
    actual: float
    limit: float
    unit: str
    met: bool


class SiteProgress(BaseModel):
    site: MissionSite
    status: str
    error: str | None = None
    lease_until: datetime | None = None
    analysis: MissionPositionResult | None = None
    checks: list[RequirementCheck] = Field(default_factory=list)


class MissionAnalysisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    requirements: Requirements
    status: str
    results: dict[str, SiteProgress]
    created_at: datetime


class MissionAnalysisIndex(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    status: str
    created_at: datetime


def own(db, user, identifier, lock=False):
    statement = select(MissionAnalysis).where(MissionAnalysis.id == identifier, MissionAnalysis.owner_id == user.id)
    if lock:
        statement = statement.with_for_update().execution_options(populate_existing=True)
    record = db.scalar(statement)
    if record is None:
        raise HTTPException(404, 'Análise inexistente ou não acessível.')
    return record


def checks(requirements, result):
    summary = result['visibility']['summary']
    values = [
        ('Fracção de luz mínima', summary['sun']['visible_fraction_total']*100, requirements.minimum_light_pct, '%', True),
        ('Fracção terrestre mínima', summary['earth']['visible_fraction_total']*100, requirements.minimum_earth_pct, '%', True),
        ('Escuridão máxima', summary['sun']['longest_invisible_seconds']/3600, requirements.maximum_dark_hours, 'h', False),
        ('Interrupção terrestre máxima', summary['earth']['longest_invisible_seconds']/3600, requirements.maximum_earth_outage_hours, 'h', False),
    ]
    complete = all(value['coverage_fraction'] >= 1-1e-10 for value in summary.values())
    return [dict(name=name, actual=actual, limit=limit, unit=unit,
                 met=complete and (actual >= limit if minimum else actual <= limit))
            for name, actual, limit, unit, minimum in values]


@router.get('/mission-sites', response_model=list[MissionSite])
def sites():
    return SITES


@router.post('/mission-analyses', response_model=MissionAnalysisRead, status_code=201)
def create(data: Requirements, db: Session = Depends(get_db), user=Depends(current_user)):
    db.scalar(select(User).where(User.id == user.id).with_for_update())
    count = db.scalar(select(func.count()).select_from(MissionAnalysis).where(MissionAnalysis.owner_id == user.id))
    if count >= 20:
        raise HTTPException(429, 'Limite de 20 análises guardadas por conta.')
    results = {identifier: SiteProgress(site=CATALOG[identifier], status='pending').model_dump(mode='json') for identifier in data.site_ids}
    record = MissionAnalysis(owner_id=user.id, name=data.name.strip(), requirements=data.model_dump(mode='json'), results=results)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get('/mission-analyses', response_model=list[MissionAnalysisIndex])
def history(db: Session = Depends(get_db), user=Depends(current_user)):
    return list(db.execute(select(MissionAnalysis.id, MissionAnalysis.name, MissionAnalysis.status, MissionAnalysis.created_at).where(MissionAnalysis.owner_id == user.id).order_by(MissionAnalysis.created_at.desc()).limit(20)))


@router.get('/mission-analyses/{identifier}', response_model=MissionAnalysisRead)
def read(identifier: str, db: Session = Depends(get_db), user=Depends(current_user)):
    return own(db, user, identifier)


@router.post('/mission-analyses/{identifier}/sites/{site_id}', response_model=MissionAnalysisRead)
async def execute(identifier: str, site_id: str, db: Session = Depends(get_db), user=Depends(current_user)):
    record = own(db, user, identifier, lock=True)
    if site_id not in record.results:
        raise HTTPException(404, 'Local não pertence à análise.')
    previous = record.results[site_id]
    if previous['status'] == 'completed':
        return record
    now = datetime.now(timezone.utc)
    lease = previous.get('lease_until')
    if lease and datetime.fromisoformat(lease.replace('Z','+00:00')) > now:
        raise HTTPException(409, 'Este local está em processamento; aguarde a conclusão ou o fim da lease (90 s).')
    data = Requirements.model_validate(record.requirements)
    running = {**previous, 'status':'running', 'error':None, 'lease_until':(now+timedelta(seconds=90)).isoformat()}
    record.results = {**record.results, site_id:running}
    record.status = 'running'
    db.commit()
    try:
        result = await analyze(data.position_request(CATALOG[site_id]))
        validated = MissionPositionResult.model_validate(result)
        item = {**running, 'status':'completed', 'lease_until':None, 'analysis':validated.model_dump(mode='json'), 'checks':checks(data,result)}
    except HorizonsError as exc:
        item = {**running, 'status':'failed', 'lease_until':None, 'error':str(exc)}
    except Exception:
        # Persist an explicit terminal state, without provider/credential diagnostics.
        item = {**running, 'status':'failed', 'lease_until':None, 'error':'A execução foi interrompida. Tente novamente.'}
    db.expire_all()
    record = own(db, user, identifier, lock=True)
    if record.results[site_id].get('lease_until') != running['lease_until']:
        return record  # A newer claimant owns this item; never overwrite its result.
    record.results = {**record.results, site_id:item}
    statuses = [value['status'] for value in record.results.values()]
    record.status = 'completed' if all(status=='completed' for status in statuses) else 'partial'
    db.commit()
    db.refresh(record)
    return record
