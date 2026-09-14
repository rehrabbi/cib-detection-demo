"""Real-time pipeline progress streaming via WebSocket.

The Celery worker publishes progress to a Redis pub/sub channel; this WebSocket
endpoint forwards those events to the connected browser client. 
Includes a ping-pong heartbeat mechanism to prevent silent disconnects during 
long-running API scraping phases.
"""

import asyncio
import json
import logging

import redis.asyncio as aioredis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool

from app.config import get_settings
from app.database import SessionLocal
from app.models import DetectionJob
from app.progress import channel_for

logger = logging.getLogger(__name__)

router = APIRouter()

# 30-second interval keeps the connection alive well below standard 60s proxy timeouts
HEARTBEAT_INTERVAL = 30 


async def heartbeat(websocket: WebSocket):
    """Background task that sends periodic ping messages to keep the connection alive."""
    while True:
        try:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            await websocket.send_json({"type": "ping", "message": "heartbeat"})
        except Exception:
            # Connection closed or failed, kill the heartbeat task
            break


def _get_job_state(job_id: str) -> dict | None:
    """Synchronous DB call executed in a threadpool to prevent blocking the async loop.
    Returns a dict to avoid DetachedInstanceError after the session closes."""
    db = SessionLocal()
    try:
        job = db.get(DetectionJob, job_id)
        if job:
            return {
                "id": job.id,
                "status": job.status,
                "progress": job.progress,
                "message": job.message,
            }
        return None
    finally:
        db.close()


@router.websocket("/api/ws/{job_id}")
async def job_progress(websocket: WebSocket, job_id: str) -> None:
    settings = get_settings()
    await websocket.accept()

    # Safely fetch the initial state without blocking the async event loop
    job_data = await run_in_threadpool(_get_job_state, job_id)

    if job_data is None:
        await websocket.send_text(json.dumps({"error": "Job not found.", "job_id": job_id}))
        await websocket.close(code=1000)
        return

    # Push the current state immediately on connect.
    await websocket.send_text(
        json.dumps(
            {
                "job_id": job_data["id"],
                "status": job_data["status"],
                "progress": job_data["progress"],
                "message": job_data["message"],
            }
        )
    )
    
    if job_data["status"] in {"completed", "failed"}:
        await websocket.close(code=1000)
        return

    # Launch the heartbeat automatically upon connection
    heartbeat_task = asyncio.create_task(heartbeat(websocket))

    # Setup Redis pub/sub
    client = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = client.pubsub()
    await pubsub.subscribe(channel_for(job_id))
    
    async def redis_reader():
        """Listens for progress updates from Celery via Redis."""
        async for msg in pubsub.listen():
            if msg["type"] == "message":
                payload = msg["data"]
                await websocket.send_text(payload)
                try:
                    parsed = json.loads(payload)
                    if parsed.get("status") in {"completed", "failed"}:
                        return
                except Exception:  # noqa: BLE001
                    pass

    async def ws_reader():
        """Listens for pong messages from the React frontend."""
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "pong":
                continue  # Connection is alive, keep listening

    # Run both listeners concurrently
    redis_task = asyncio.create_task(redis_reader())
    ws_task = asyncio.create_task(ws_reader())

    try:
        # Wait until either the job finishes (Redis task ends) or the user disconnects (WS task ends/fails)
        await asyncio.wait(
            [redis_task, ws_task],
            return_when=asyncio.FIRST_COMPLETED
        )
    except WebSocketDisconnect:
        logger.info("Client disconnected from WS for job %s", job_id)
    finally:
        # Strict cleanup
        heartbeat_task.cancel()
        redis_task.cancel()
        ws_task.cancel()
        
        try:
            await pubsub.unsubscribe(channel_for(job_id))
            await pubsub.close()
            await client.aclose()  # aclose() is the updated async cleanup method for aioredis
        except Exception:  # noqa: BLE001
            pass
        
        try:
            if websocket.client_state.name != "DISCONNECTED":
                await websocket.close(code=1000)
        except Exception:  # noqa: BLE001
            pass