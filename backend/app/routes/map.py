from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query
from beanie import PydanticObjectId

from app.models import Driver, DriverStatus, User, Gender, Vehicle
from app.schemas import RouteRequest, RouteResponse, NearbyDriverResponse
from app.services.map_service import get_route
from app.utils.fare import haversine_distance, estimate_duration
from app.services.geo_service import geo_service

router = APIRouter(prefix="/api/map", tags=["map"])


@router.get("/locations")
async def search_indian_locations(q: str = Query(default="", min_length=0)):
    if not q or len(q.strip()) == 0:
        return []
    return geo_service.search_locations(q, limit=15)


@router.post("/route", response_model=RouteResponse)
async def calculate_route(payload: RouteRequest):
    result = await get_route(
        pickup_lat=payload.pickup_latitude,
        pickup_lng=payload.pickup_longitude,
        dest_lat=payload.destination_latitude,
        dest_lng=payload.destination_longitude,
        mode=payload.mode,
        passenger_count=payload.passenger_count,
        scheduled_at=payload.scheduled_at,
    )
    return RouteResponse(**result)


@router.get("/nearby-drivers", response_model=List[NearbyDriverResponse])
async def get_nearby_drivers(
    latitude: float = Query(...),
    longitude: float = Query(...),
    mode: str = Query(default="normal"),
):
    drivers = await Driver.find(
        Driver.status == DriverStatus.approved,
        Driver.is_online == True,
        Driver.current_latitude != None,
        Driver.current_longitude != None,
    ).to_list()

    nearby = []
    for driver in drivers:
        user = await User.get(driver.user_id)
        if not user:
            continue

        if mode == "pink" and user.gender != Gender.female:
            continue
        if mode != "pink" and user.gender != Gender.male:
            continue

        certified = driver.certified_modes or ["normal"]
        if mode not in certified and mode != "normal":
            continue

        dist = haversine_distance(latitude, longitude, driver.current_latitude, driver.current_longitude)
        if dist > 50:
            continue

        eta = estimate_duration(dist)
        vehicle = await Vehicle.find_one(Vehicle.driver_id == driver.id)

        nearby.append(NearbyDriverResponse(
            driver_id=str(driver.id),
            driver_name=user.full_name,
            latitude=driver.current_latitude,
            longitude=driver.current_longitude,
            distance_km=round(dist, 2),
            eta_minutes=eta,
            average_rating=driver.average_rating or 0.0,
            vehicle={"make": vehicle.make, "model": vehicle.model, "plate_number": vehicle.plate_number} if vehicle else None,
        ))

    nearby.sort(key=lambda d: d.distance_km)
    return nearby[:20]
