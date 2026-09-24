import asyncio
import json
from typing import Set, Dict, Any

class EventBus:
    def __init__(self):
        self._authority_subscribers: Set[asyncio.Queue] = set()
        self._public_subscribers: Set[asyncio.Queue] = set()

    async def subscribe_authority(self) -> asyncio.Queue:
        q = asyncio.Queue(maxsize=100)
        self._authority_subscribers.add(q)
        return q

    def unsubscribe_authority(self, q: asyncio.Queue):
        self._authority_subscribers.discard(q)

    async def subscribe_public(self) -> asyncio.Queue:
        q = asyncio.Queue(maxsize=100)
        self._public_subscribers.add(q)
        return q

    def unsubscribe_public(self, q: asyncio.Queue):
        self._public_subscribers.discard(q)

    async def publish(self, event_name: str, payload: Dict[str, Any], is_public_safe: bool = True, public_payload: Dict[str, Any] = None):
        auth_msg = {"event": event_name, "data": payload}
        pub_msg = {"event": event_name, "data": public_payload if public_payload is not None else payload}

        # Authority subscribers
        for q in list(self._authority_subscribers):
            try:
                q.put_nowait(auth_msg)
            except asyncio.QueueFull:
                pass

        # Public subscribers
        if is_public_safe:
            for q in list(self._public_subscribers):
                try:
                    q.put_nowait(pub_msg)
                except asyncio.QueueFull:
                    pass

bus = EventBus()
