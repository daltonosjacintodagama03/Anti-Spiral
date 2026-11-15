import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import LandingSite
from app.schemas import SiteInput, SiteRead

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sites", tags=["sites"])


@router.get("", response_model=list[SiteRead])
def list_sites(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[LandingSite]:
    statement = select(LandingSite).order_by(LandingSite.name).offset(offset).limit(limit)
    return list(db.scalars(statement))


@router.post("", response_model=SiteRead, status_code=201)
def create_site(site: SiteInput, db: Session = Depends(get_db)) -> LandingSite:
    record = LandingSite(**site.model_dump())
    db.add(record)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        logger.info("Rejected duplicate landing site: %s", site.name)
        raise HTTPException(status_code=409, detail="A site with this name already exists") from exc
    db.refresh(record)
    return record
