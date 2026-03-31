from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token
from app.services.live_timeline import timeline_connection_manager


router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws/timeline")
async def timeline_websocket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    user_id: int | None = None
    if token:
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            try:
                user_id = int(payload["sub"])
            except ValueError:
                user_id = None

    await timeline_connection_manager.connect(websocket, user_id=user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        timeline_connection_manager.disconnect(websocket, user_id=user_id)
