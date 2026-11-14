from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnalysisJob
from app.schemas import JobCreate, JobRead

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("", response_model=list[JobRead])
def list_jobs(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[AnalysisJob]:
    statement = (
        select(AnalysisJob)
        .order_by(AnalysisJob.created_at.desc(), AnalysisJob.id.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(db.scalars(statement))


@router.post("", response_model=JobRead, status_code=201)
def create_job(job: JobCreate, db: Session = Depends(get_db)) -> AnalysisJob:
    record = AnalysisJob(**job.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
