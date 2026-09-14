"""Bridges Celery worker progress to FastAPI WebSocket subscribers via Redis pub/sub.

The Celery task publishes JSON progress updates to a per-job Redis channel; the
WebSocket route subscribes to that channel and forwards messages to the browser
client in real time.
"""

from __future__ import annotations

import json
import logging

import redis

from app.config import get_settings

logger = logging.getLogger(__name__)

_settings = get_settings()
_redis_client: redis.Redis | None = None


def _client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(_settings.redis_url, decode_responses=True)
    return _redis_client


def channel_for(job_id: str) -> str:
    return f"cib_job:{job_id}"


def publish(job_id: str, payload: dict) -> None:
    try:
        _client().publish(channel_for(job_id), json.dumps(payload))
    except Exception as e:  # noqa: BLE001
        logger.warning("Failed to publish progress for %s: %s", job_id, e)
