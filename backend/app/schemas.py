from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class JobSubmitRequest(BaseModel):
    """Step 1 input: two YouTube video URLs."""

    video_url_1: str = Field(..., description="First YouTube video URL")
    video_url_2: str = Field(..., description="Second YouTube video URL")
    use_sample_data: bool | None = Field(
        default=None,
        description="Override server default; if True, run pipeline on the bundled synthetic dataset.",
    )

    @field_validator("video_url_1", "video_url_2")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()


class JobSubmitResponse(BaseModel):
    job_id: str
    status: str


class CommenterFeatures(BaseModel):
    commenting_frequency: float
    temporal_burst_activity: float
    tfidf_content_repetition: float
    reply_count: float
    degree_centrality: float
    clustering_coefficient: float


class CommenterResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    commenter_hash: str
    commenting_frequency: float
    temporal_burst_activity: float
    tfidf_content_repetition: float
    reply_count: float
    degree_centrality: float
    clustering_coefficient: float
    anomaly_score: float
    cib_risk_score: float
    classification: str
    shap_values: dict | None = None


class JobStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    progress: int
    message: str
    used_sample_data: bool
    created_at: datetime
    completed_at: datetime | None
    error: str | None
    video_id_1: str
    video_id_2: str


class JobResultOut(BaseModel):
    job: JobStatusOut
    summary: dict | None
    global_shap: dict | None
    network_graph: dict | None
    commenters: list[CommenterResultOut]
