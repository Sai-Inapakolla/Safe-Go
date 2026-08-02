from __future__ import annotations

from typing import Dict, Set
from fastapi import WebSocket
import json


class ConnectionManager:
    """Manages WebSocket connections for ride tracking, driver location, and admin live feed."""

    def __init__(self):
        # ride_id -> set of passenger WebSocket connections
        self.ride_connections: Dict[int, Set[WebSocket]] = {}
        # driver_id -> WebSocket connection
        self.driver_connections: Dict[int, WebSocket] = {}
        # admin WebSocket connections
        self.admin_connections: Set[WebSocket] = set()

    # ---------- RIDE TRACKING ----------

    async def connect_ride(self, ride_id: int, websocket: WebSocket):
        await websocket.accept()
        if ride_id not in self.ride_connections:
            self.ride_connections[ride_id] = set()
        self.ride_connections[ride_id].add(websocket)

    def disconnect_ride(self, ride_id: int, websocket: WebSocket):
        if ride_id in self.ride_connections:
            self.ride_connections[ride_id].discard(websocket)
            if not self.ride_connections[ride_id]:
                del self.ride_connections[ride_id]

    async def broadcast_to_ride(self, ride_id: int, data: dict):
        if ride_id in self.ride_connections:
            dead = []
            for ws in self.ride_connections[ride_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.ride_connections[ride_id].discard(ws)

    # ---------- DRIVER LOCATION ----------

    async def connect_driver(self, driver_id: int, websocket: WebSocket):
        await websocket.accept()
        self.driver_connections[driver_id] = websocket

    def disconnect_driver(self, driver_id: int):
        self.driver_connections.pop(driver_id, None)

    # ---------- ADMIN LIVE ----------

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.admin_connections.add(websocket)

    def disconnect_admin(self, websocket: WebSocket):
        self.admin_connections.discard(websocket)

    async def broadcast_to_admins(self, data: dict):
        dead = []
        for ws in self.admin_connections:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.admin_connections.discard(ws)


# Singleton
manager = ConnectionManager()
