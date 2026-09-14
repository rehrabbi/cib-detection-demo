from datetime import datetime
from enum import Enum

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class JobStatus(str, Enum):
    PENDING = "pending"
    COLLECTING = "collecting"
    PREPROCESSING = "preprocessing"
    EXTRACTING = "extracting"
    SCORING = "scoring"
    EXPLAINING = "explaining"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DetectionJob(Base):
    __tablename__ = "detection_jobs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    video_url_1: Mapped[str] = mapped_column(String(512))
    video_url_2: Mapped[str] = mapped_column(String(512))
    video_id_1: Mapped[str] = mapped_column(String(64))
    video_id_2: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default=JobStatus.PENDING.value)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(Text, default="")
    used_sample_data: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    global_shap: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    network_graph: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    commenters: Mapped[list["CommenterResult"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )


class CommenterResult(Base):
    __tablename__ = "commenter_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("detection_jobs.id", ondelete="CASCADE"))
    commenter_hash: Mapped[str] = mapped_column(String(64), index=True)

    commenting_frequency: Mapped[float] = mapped_column(Float)
    temporal_burst_activity: Mapped[float] = mapped_column(Float)
    tfidf_content_repetition: Mapped[float] = mapped_column(Float)
    reply_count: Mapped[float] = mapped_column(Float)
    degree_centrality: Mapped[float] = mapped_column(Float)
    clustering_coefficient: Mapped[float] = mapped_column(Float)

    anomaly_score: Mapped[float] = mapped_column(Float)
    cib_risk_score: Mapped[float] = mapped_column(Float)
    classification: Mapped[str] = mapped_column(String(16))  # "Anomalous" | "Organic"

    shap_values: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    job: Mapped[DetectionJob] = relationship(back_populates="commenters")
