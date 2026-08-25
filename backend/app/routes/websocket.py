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

                    # Fetch active ride details to compute live road distance & ETA
                    from app.models import Ride, RideStatus
                    from app.services.map_service import fetch_osrm_route, reroute_active_trip
                    from app.utils.fare import haversine_distance

                    ride = await Ride.get(ride_oid)
                    payload_out = {
                        "type": "driver_location",
                        "latitude": latitude,
                        "longitude": longitude,
                        "status": ride.status.value if ride else "in_progress",
                        "driver_id": driver_id,
                    }

                    if ride and ride.destination_latitude and ride.destination_longitude:
                        target_lat = ride.destination_latitude if ride.status == RideStatus.in_progress else ride.pickup_latitude
                        target_lng = ride.destination_longitude if ride.status == RideStatus.in_progress else ride.pickup_longitude

                        if target_lat and target_lng:
                            dist = haversine_distance(latitude, longitude, target_lat, target_lng)
                            payload_out["distance_km"] = round(dist, 2)
                            payload_out["eta_minutes"] = max(1.0, round((dist / 28.0) * 60, 1))

                            # Trigger AI Rerouting check if requested or driver is moving off route
                            is_off_route = data.get("trigger_reroute", False)
                            if is_off_route:
                                mode_str = ride.mode.value if hasattr(ride.mode, "value") else str(ride.mode)
                                reroute_data = await reroute_active_trip(
                                    driver_lat=latitude,
                                    driver_lng=longitude,
                                    dest_lat=target_lat,
                                    dest_lng=target_lng,
                                    mode=mode_str,
                                    reason="driver_deviation"
                                )
                                payload_out["route_polyline"] = reroute_data.get("route_polyline")
                                payload_out["distance_km"] = reroute_data.get("distance_km")
                                payload_out["eta_minutes"] = reroute_data.get("duration_minutes")
                                payload_out["ai_safety_prediction"] = reroute_data.get("ai_safety_prediction")

                    await manager.broadcast_to_ride(ride_oid, payload_out)
                except Exception as e:
                    print(f"[WebSocket Error] Ride broadcast exception: {e}")
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
