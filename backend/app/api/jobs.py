"""Job submission and status endpoints — Step 1 of the System Architecture."""

import uuid

# 1. IMPORT Body from fastapi
from fastapi import APIRouter, Depends, HTTPException, Request, Body 
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import DetectionJob, JobStatus
from app.pipeline.collector import extract_video_id
from app.schemas import JobStatusOut, JobSubmitRequest, JobSubmitResponse
from app.tasks import run_detection

# Fetch settings to dynamically assign the Redis URL
settings = get_settings()

# Initialize Route-Level Rate Limiter (MODIFIED: removed hardcoded localhost)
limiter = Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("", response_model=JobSubmitResponse, status_code=202)
@limiter.limit("5/minute") 
def submit_job(
    request: Request, 
    # 2. FORCE FastAPI to look in the JSON body for this payload
    payload: JobSubmitRequest = Body(...), 
    db: Session = Depends(get_db)
) -> JobSubmitResponse:
    # Settings are loaded globally, but re-fetching here relies on lru_cache (instant)
    settings = get_settings()
    
    # Extract video IDs
    try:
        vid_1 = extract_video_id(payload.video_url_1)
        vid_2 = extract_video_id(payload.video_url_2)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    # Validate API Keys / Mode
    use_sample = payload.use_sample_data if payload.use_sample_data is not None else settings.use_sample_data
    if not use_sample and not settings.youtube_api_key:
        raise HTTPException(
            status_code=400,
            detail="YOUTUBE_API_KEY is not configured; enable sample-data mode or set the key.",
        )

    # ─── DATABASE SAFETY & JOB QUEUING ───
    try:
        # Create the Job Record
        job_id = uuid.uuid4().hex
        job = DetectionJob(
            id=job_id,
            video_url_1=payload.video_url_1,
            video_url_2=payload.video_url_2,
            video_id_1=vid_1,
            video_id_2=vid_2,
            status=JobStatus.PENDING.value,
            progress=0,
            message="Job queued.",
            used_sample_data=use_sample,
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        run_detection.delay(job_id)

        return JobSubmitResponse(job_id=job_id, status=job.status)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit detection job: {str(e)}")


@router.get("/{job_id}", response_model=JobStatusOut)
@limiter.limit("60/minute") # Higher limit allowed for status polling if WebSockets fall back to HTTP
def get_job(request: Request, job_id: str, db: Session = Depends(get_db)) -> JobStatusOut:
    job = db.get(DetectionJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return JobStatusOut.model_validate(job)


@router.get("", response_model=list[JobStatusOut])
@limiter.limit("30/minute")
def list_jobs(request: Request, db: Session = Depends(get_db)) -> list[JobStatusOut]:
    jobs = db.query(DetectionJob).order_by(DetectionJob.created_at.desc()).limit(50).all()
    return [JobStatusOut.model_validate(j) for j in jobs]