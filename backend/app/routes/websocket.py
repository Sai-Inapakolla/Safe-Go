from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from beanie import PydanticObjectId

from app.models import Driver, RideLocationHistory, User, UserRole
from app.utils.security import decode_access_token
from app.utils.websocket_manager import manager

router = APIRouter(tags=["websocket"])


async def _get_user_from_token(token: str) -> User | None:
    payload = decode_access_token(token)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    return await User.get(PydanticObjectId(user_id))


@router.websocket("/ws/ride/{ride_id}/track")
async def ride_tracking(websocket: WebSocket, ride_id: str, token: str = Query(...)):
    user = await _get_user_from_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid token")
        return

    ride_oid = PydanticObjectId(ride_id)
    await manager.connect_ride(ride_oid, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect_ride(ride_oid, websocket)


@router.websocket("/ws/driver/{driver_id}/location")
async def driver_location(websocket: WebSocket, driver_id: str, token: str = Query(...)):
    user = await _get_user_from_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid token")
        return

    driver_oid = PydanticObjectId(driver_id)
    driver = await Driver.get(driver_oid)
    if not driver or driver.user_id != user.id:
        await websocket.close(code=4003, reason="Forbidden")
        return

    driver.is_online = True
    await driver.save()

    await manager.connect_driver(driver_oid, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            latitude = data.get("latitude")
            longitude = data.get("longitude")
            ride_id = data.get("ride_id")

            if latitude is None or longitude is None:
                continue

            driver = await Driver.get(driver_oid)
            if driver:
                driver.current_latitude = latitude
                driver.current_longitude = longitude
                await driver.save()

            if ride_id:
                try:
                    ride_oid = PydanticObjectId(ride_id)
                    loc = RideLocationHistory(ride_id=ride_oid, latitude=latitude, longitude=longitude)
                    await loc.insert()
                    await manager.broadcast_to_ride(ride_oid, {
                        "type": "driver_location",
                        "latitude": latitude,
                        "longitude": longitude,
                        "status": "in_progress",
                        "driver_id": driver_id,
                    })
                except Exception:
                    pass

            await manager.broadcast_to_admins({
                "type": "driver_location",
                "driver_id": driver_id,
                "latitude": latitude,
                "longitude": longitude,
                "ride_id": ride_id,
            })

    except WebSocketDisconnect:
        manager.disconnect_driver(driver_oid)
        driver = await Driver.get(driver_oid)
        if driver:
            driver.is_online = False
            await driver.save()


@router.websocket("/ws/admin/live")
async def admin_live(websocket: WebSocket, token: str = Query(...)):
    user = await _get_user_from_token(token)
    if not user or user.role != UserRole.admin:
        await websocket.close(code=4003, reason="Admin access required")
        return

    await manager.connect_admin(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect_admin(websocket)
