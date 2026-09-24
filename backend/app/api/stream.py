import asyncio
import json
from fastapi import APIRouter, Request, Query
from sse_starlette.sse import EventSourceResponse
from app.core.bus import bus
from app.security import decode_token

router = APIRouter(prefix="/stream", tags=["Streaming"])

@router.get("/public")
async def stream_public(request: Request):
    q = await bus.subscribe_public()

    async def event_generator():
        try:
            # Send initial connected event
            yield {
                "event": "connected",
                "data": json.dumps({"status": "connected", "stream": "public"})
            }
            while True:
                if await request.is_disconnected():
                    break
                try:
                    # Wait for next event or 15s heartbeat
                    msg = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield {
                        "event": msg["event"],
                        "data": json.dumps(msg["data"])
                    }
                except asyncio.TimeoutError:
                    # 15s Heartbeat comment
                    yield {"comment": "keep-alive-heartbeat"}
        finally:
            bus.unsubscribe_public(q)

    return EventSourceResponse(event_generator())

@router.get("/authority")
async def stream_authority(request: Request, token: str = Query(None)):
    # Validate authority token if provided
    role = "authority"
    if token:
        payload = decode_token(token)
        if payload:
            role = payload.get("role", "authority")

    q = await bus.subscribe_authority()

    async def event_generator():
        try:
            yield {
                "event": "connected",
                "data": json.dumps({"status": "connected", "stream": "authority", "role": role})
            }
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield {
                        "event": msg["event"],
                        "data": json.dumps(msg["data"])
                    }
                except asyncio.TimeoutError:
                    yield {"comment": "keep-alive-heartbeat"}
        finally:
            bus.unsubscribe_authority(q)

    return EventSourceResponse(event_generator())
