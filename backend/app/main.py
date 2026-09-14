"""FastAPI application entry point — Step 1 of the System Architecture.

Wires the URL submission and Celery dispatch endpoints, the WebSocket progress
channel, and the result + report retrieval endpoints. Includes security middleware.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api import jobs, reports, results, websocket as ws
from app.config import get_settings
from app.database import init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")

settings = get_settings()

# MODIFIED: Swapped the hardcoded localhost string for the dynamic Docker network URL
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.redis_url
)

app = FastAPI(
    title="CIB Detection Tool",
    version="1.0.0",
    description=(
        "Web-based detection tool for Coordinated Inauthentic Behavior in Filipino "
        "YouTube comment sections — hybrid behavioral-network Isolation Forest with SHAP. "
        "Implements the System Architecture (Fig. 2) from the thesis by Group 4, BSCS, "
        "Polytechnic University of the Philippines (2026)."
    ),
)

# Bind Rate Limiter to App
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# The results payload is dominated by 64-character hex hashes and float text,
# which compress heavily. A large job returns tens of megabytes uncompressed.
app.add_middleware(GZipMiddleware, minimum_size=1024)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=".*",  # Catch-all bypass for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(results.router)
app.include_router(reports.router)
app.include_router(ws.router)

@app.on_event("startup")
def _startup() -> None:
    init_db()

@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "use_sample_data": settings.use_sample_data,
        "youtube_api_configured": bool(settings.youtube_api_key),
    }