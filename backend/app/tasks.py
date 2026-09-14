"""Celery task that executes the full 5-step System Architecture for one job.

Step 1 happens in FastAPI (URL submission + job dispatch). This task runs Steps 2-5:
collection → preprocessing → feature extraction + scoring + SHAP → result persistence.
"""

from __future__ import annotations

import logging
import traceback
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from app.celery_app import celery_app
from app.config import BASE_DIR, get_settings
from app.database import SessionLocal
from app.models import CommenterResult, DetectionJob, JobStatus
from app.pipeline.collector import YouTubeCommentCollector, extract_video_id
from app.pipeline.explainer import compute_shap
from app.pipeline.features import compute_behavioral_features
from app.pipeline.model import HYBRID_FEATURES, HybridModelBundle
from app.pipeline.network import (
    build_cocommenter_graph,
    compute_network_features,
    graph_to_cytoscape,
)
from app.pipeline.preprocessor import preprocess
from app.progress import publish
from app.seed.generator import generate_sample_dataset

logger = logging.getLogger(__name__)


def _update(
    job: DetectionJob,
    db,
    *,
    status: JobStatus | None = None,
    progress: int | None = None,
    message: str | None = None,
) -> None:
    """Helper to update database state and broadcast progress via Redis."""
    if status is not None:
        job.status = status.value
    if progress is not None:
        job.progress = progress
    if message is not None:
        job.message = message
    
    db.commit()
    
    publish(
        job.id,
        {
            "job_id": job.id,
            "status": job.status,
            "progress": job.progress,
            "message": job.message,
        },
    )


@celery_app.task(name="cib.run_detection")
def run_detection(job_id: str) -> dict:
    settings = get_settings()
    db = SessionLocal()
    job: DetectionJob | None = db.get(DetectionJob, job_id)
    
    if job is None:
        logger.error("Detection job %s not found.", job_id)
        return {"error": "job_not_found"}

    try:
        _update(job, db, status=JobStatus.COLLECTING, progress=5, message="Collecting comments via YouTube Data API v3...")

        # Step 2: Comment collection
        if job.used_sample_data:
            raw_records = generate_sample_dataset(
                video_id_1=job.video_id_1,
                video_id_2=job.video_id_2,
                seed=settings.random_state,
            )
        else:
            collector = YouTubeCommentCollector(api_key=settings.youtube_api_key)
            raw_records = []
            for vid in (job.video_id_1, job.video_id_2):
                meta = collector.fetch_video_metadata(vid)
                for rec in collector.iter_comments(
                    video_id=vid,
                    channel_name=meta["channel_name"],
                    video_post_time=meta["video_post_time"],
                ):
                    raw_records.append(rec)
            
            if not raw_records:
                raise RuntimeError("No comments retrieved from YouTube Data API v3.")

        _update(job, db, status=JobStatus.PREPROCESSING, progress=25, message="Preprocessing and SHA-256 anonymizing...")

        # Step 3: Preprocessing
        df = preprocess(raw_records)
        if df.empty:
            raise RuntimeError("Preprocessing returned 0 valid comment records.")

        # THESIS CONSTRAINT: Minimum 30 unique commenters
        unique_commenters = df["commenter_hash"].nunique()
        if unique_commenters < 30:
            err_msg = f"Insufficient data: Minimum 30 unique commenters required, found {unique_commenters}."
            logger.warning(f"Job {job_id} aborted: {err_msg}")
            _update(job, db, status=JobStatus.FAILED, progress=100, message=err_msg)
            return {"job_id": job.id, "status": job.status, "error": "insufficient_data"}

        _update(job, db, status=JobStatus.EXTRACTING, progress=45, message="Computing behavioral and network features...")

        # Step 4: Behavioral + network feature extraction
        behavioral = compute_behavioral_features(df, burst_window_seconds=settings.burst_window_seconds)
        
        # THESIS CONSTRAINT: Network graph pruning (ensure edge_min_cocommented_videos >= 2 in settings)
        graph = build_cocommenter_graph(df, edge_min_cocommented_videos=max(2, settings.edge_min_cocommented_videos))
        network = compute_network_features(graph)
        
        features = behavioral.merge(network, on="commenter_hash", how="left").fillna(0.0)
        features = features[["commenter_hash"] + HYBRID_FEATURES]

        _update(job, db, status=JobStatus.SCORING, progress=65, message="Scoring with the pre-fitted Isolation Forest...")

        bundle = HybridModelBundle.load(
            scaler_path=(BASE_DIR / Path(settings.scaler_path)).resolve(),
            model_path=(BASE_DIR / Path(settings.model_path)).resolve(),
        )
        scored = bundle.score(features)

        _update(job, db, status=JobStatus.EXPLAINING, progress=80, message="Computing SHAP feature attribution...")

        # THESIS CONSTRAINT: Cap SHAP computation at the Top 100 flagged commenters
        top_100_anomalies = scored.sort_values(by="cib_risk_score", ascending=False).head(100)
        per_commenter_shap, global_shap = compute_shap(bundle, top_100_anomalies)
        
        # Map SHAP values back to their specific commenters (Others will remain None/null in DB)
        shap_mapping = dict(zip(top_100_anomalies["commenter_hash"], per_commenter_shap))

        # Step 5: Persist results (Optimized for PostgreSQL Bulk Insert)
        db.query(CommenterResult).filter(CommenterResult.job_id == job.id).delete()
        
        results_to_insert = []
        for _, row in scored.iterrows():
            c_hash = row["commenter_hash"]
            results_to_insert.append(
                CommenterResult(
                    job_id=job.id,
                    commenter_hash=c_hash,
                    commenting_frequency=float(row["commenting_frequency"]),
                    temporal_burst_activity=float(row["temporal_burst_activity"]),
                    tfidf_content_repetition=float(row["tfidf_content_repetition"]),
                    reply_count=float(row["reply_count"]),
                    degree_centrality=float(row["degree_centrality"]),
                    clustering_coefficient=float(row["clustering_coefficient"]),
                    anomaly_score=float(row["anomaly_score"]),
                    cib_risk_score=float(row["cib_risk_score"]),
                    classification=str(row["classification"]),
                    shap_values=shap_mapping.get(c_hash, None), # Attaches SHAP only to Top 100
                )
            )
            
        # Bulk save prevents DB locking/timeout on large datasets
        db.bulk_save_objects(results_to_insert)

        classifications = dict(zip(scored["commenter_hash"], scored["classification"]))
        anomalous_count = int((scored["classification"] == "Anomalous").sum())
        organic_count = int((scored["classification"] == "Organic").sum())
        total = anomalous_count + organic_count

        job.summary = {
            "total_commenters": total,
            "anomalous": anomalous_count,
            "organic": organic_count,
            "anomaly_detection_rate": (anomalous_count / total) if total else 0.0,
            "mean_cib_risk_score": float(scored["cib_risk_score"].mean()) if total else 0.0,
        }
        job.global_shap = global_shap
        job.network_graph = graph_to_cytoscape(graph, classifications)
        
        # Using timezone-aware UTC instead of deprecated utcnow()
        job.completed_at = datetime.now(timezone.utc)
        
        _update(job, db, status=JobStatus.COMPLETED, progress=100, message="Done.")
        return {"job_id": job.id, "status": job.status}

    except Exception as e:  # noqa: BLE001
        logger.exception("Detection job %s failed.", job_id)
        # A failure during flush leaves the session unusable, so recording the
        # failure would itself raise PendingRollbackError and the job would sit
        # in its last running state forever. Roll back and re-load first.
        try:
            db.rollback()
            job = db.get(DetectionJob, job_id)
        except Exception:  # noqa: BLE001
            logger.exception("Could not roll back session for job %s.", job_id)
            return {"job_id": job_id, "status": "failed", "error": str(e)}
        if job is None:
            return {"job_id": job_id, "status": "failed", "error": str(e)}
        job.error = f"{e}\n{traceback.format_exc()}"
        _update(job, db, status=JobStatus.FAILED, progress=100, message=f"Failed: {e}")
        return {"job_id": job.id, "status": job.status, "error": str(e)}
    finally:
        db.close()


# Re-export so callers can do `from app.tasks import extract_video_id`.
__all__ = ["run_detection", "extract_video_id"]