from __future__ import annotations

import json
from collections import defaultdict

from fastapi import WebSocket


class TimelineConnectionManager:
    def __init__(self) -> None:
        self._global_connections: set[WebSocket] = set()
        self._user_connections: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, user_id: int | None = None) -> None:
        await websocket.accept()
        self._global_connections.add(websocket)
        if user_id is not None:
            self._user_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int | None = None) -> None:
        self._global_connections.discard(websocket)
        if user_id is not None:
            self._user_connections[user_id].discard(websocket)
            if not self._user_connections[user_id]:
                self._user_connections.pop(user_id, None)

    async def broadcast_refresh(self, event_type: str, user_ids: list[int] | None = None) -> None:
        payload = json.dumps({"type": "timeline.refresh", "event": event_type})
        targets: set[WebSocket] = set(self._global_connections)
        if user_ids:
            for user_id in user_ids:
                targets.update(self._user_connections.get(user_id, set()))

        stale: list[tuple[WebSocket, int | None]] = []
        for websocket in targets:
            try:
                await websocket.send_text(payload)
            except Exception:
                owner = None
                for user_id, sockets in self._user_connections.items():
                    if websocket in sockets:
                        owner = user_id
                        break
                stale.append((websocket, owner))

        for websocket, owner in stale:
            self.disconnect(websocket, owner)


timeline_connection_manager = TimelineConnectionManager()
