"""CSV / PDF analyst report endpoints — Step 5 (downloads).

Fulfills Thesis Module 5: Results and Reporting Module.
Downloadable analyst reports in CSV and PDF formats are generated and served here,
with PDF rendering delegated to WeasyPrint in the reporting pipeline.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CommenterResult, DetectionJob
from app.pipeline.reporting import commenters_to_csv, commenters_to_pdf

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _rows_for_job(db: Session, job_id: str) -> tuple[DetectionJob, list[dict]]:
    job = db.get(DetectionJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    commenters = (
        db.query(CommenterResult)
        .filter(CommenterResult.job_id == job_id)
        .order_by(CommenterResult.cib_risk_score.desc())
        .all()
    )
    rows = [
        {
            "commenter_hash": c.commenter_hash,
            "commenting_frequency": c.commenting_frequency,
            "temporal_burst_activity": c.temporal_burst_activity,
            "tfidf_content_repetition": c.tfidf_content_repetition,
            "reply_count": c.reply_count,
            "degree_centrality": c.degree_centrality,
            "clustering_coefficient": c.clustering_coefficient,
            "anomaly_score": c.anomaly_score,
            "cib_risk_score": c.cib_risk_score,
            "classification": c.classification,
        }
        for c in commenters
    ]
    return job, rows


@router.get("/{job_id}/csv")
def download_csv(job_id: str, db: Session = Depends(get_db)) -> Response:
    """Serves the generated CSV analyst report."""
    _job, rows = _rows_for_job(db, job_id)
    data = commenters_to_csv(rows)
    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="cib_report_{job_id}.csv"'},
    )


@router.get("/{job_id}/pdf")
def download_pdf(job_id: str, db: Session = Depends(get_db)) -> Response:
    """Serves the generated PDF analyst report via WeasyPrint."""
    job, rows = _rows_for_job(db, job_id)
    data = commenters_to_pdf(
        rows=rows,
        summary=job.summary or {},
        global_shap=job.global_shap or {},
        job_meta={
            "job_id": job.id,
            "created_at": job.created_at.isoformat() if job.created_at else "",
            "video_id_1": job.video_id_1,
            "video_id_2": job.video_id_2,
            "used_sample_data": job.used_sample_data,
        },
    )
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="cib_report_{job_id}.pdf"'},
    )