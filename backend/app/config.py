from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment / .env (Pydantic v2)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        protected_namespaces=(),
    )

    # MODIFIED: Swapped 'localhost' for the Docker service names
    database_url: str = "postgresql+psycopg://cib_user:cib_pass@postgres:5432/cib_detection"
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/1"

    youtube_api_key: str = ""

    model_path: str = "app/ml/artifacts/isolation_forest_hybrid.joblib"
    scaler_path: str = "app/ml/artifacts/standard_scaler.joblib"
    mlflow_tracking_uri: str = "file:./mlruns"

    contamination: float = 0.05
    random_state: int = 42
    edge_min_cocommented_videos: int = 2
    burst_window_seconds: int = 600

    use_sample_data: bool = True
    frontend_origin: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()


BASE_DIR = Path(__file__).resolve().parent.parent