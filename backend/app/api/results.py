"""Result retrieval endpoint — Step 5 of the System Architecture."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CommenterResult, DetectionJob
from app.schemas import CommenterResultOut, JobResultOut, JobStatusOut

router = APIRouter(prefix="/api/results", tags=["results"])


@router.get("/{job_id}", response_model=JobResultOut)
def get_results(job_id: str, db: Session = Depends(get_db)) -> JobResultOut:
    job = db.get(DetectionJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    commenters = (
        db.query(CommenterResult)
        .filter(CommenterResult.job_id == job_id)
        .order_by(CommenterResult.cib_risk_score.desc())
        .all()
    )
    return JobResultOut(
        job=JobStatusOut.model_validate(job),
        summary=job.summary,
        global_shap=job.global_shap,
        network_graph=job.network_graph,
        commenters=[CommenterResultOut.model_validate(c) for c in commenters],
    )
