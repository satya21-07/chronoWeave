"""WebSocket connection manager for real-time updates."""
from typing import Dict, List
from uuid import UUID
from fastapi import WebSocket
import json


class ConnectionManager:
    """Manages WebSocket connections grouped by project rooms."""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id] = [
                ws for ws in self.active_connections[project_id] if ws != websocket
            ]
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]

    async def broadcast(self, project_id: str, message: dict):
        """Broadcast a message to all connections in a project room."""
        if project_id in self.active_connections:
            dead = []
            for ws in self.active_connections[project_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(ws, project_id)


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(websocket, project_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back or handle client messages
            msg = json.loads(data)
            await manager.broadcast(project_id, msg)
    except Exception:
        manager.disconnect(websocket, project_id)
