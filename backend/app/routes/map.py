from __future__ import annotations

from typing import List

import httpx
from fastapi import APIRouter, Depends, Query
from beanie import PydanticObjectId

from app.models import Driver, DriverStatus, User, Gender, Vehicle
from app.schemas import RouteRequest, RouteResponse, RerouteRequest, RerouteResponse, NearbyDriverResponse
from app.services.map_service import get_route, reroute_active_trip
from app.utils.fare import haversine_distance, estimate_duration
from app.services.geo_service import geo_service

router = APIRouter(prefix="/api/map", tags=["map"])


@router.get("/locations")
async def search_indian_locations(q: str = Query(default="", min_length=0)):
    if not q or len(q.strip()) == 0:
        return []
    return geo_service.search_locations(q, limit=15)


@router.get("/geocode")
async def geocode_location(q: str = Query(default="", min_length=1)):
    clean_q = q.strip()
    if not clean_q or clean_q.lower() == "current location":
        return []

    # 1. Search local Indian cities dataset first (instant 0ms)
    local_matches = geo_service.search_locations(clean_q, limit=10)
    if local_matches:
        return [
            {
                "lat": str(m["lat"]),
                "lon": str(m["lng"]),
                "display_name": m["display_name"],
                "name": m["name"],
                "state": m.get("state", "")
            }
            for m in local_matches
        ]

    # 2. Photon API (OpenStreetMap-based, fast, public)
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                "https://photon.komoot.io/api/",
                params={"q": clean_q, "limit": 8}
            )
            if resp.status_code == 200:
                data = resp.json()
                features = data.get("features", [])
                results = []
                for f in features:
                    coords = f.get("geometry", {}).get("coordinates", [])
                    props = f.get("properties", {})
                    if len(coords) >= 2:
                        name = props.get("name", clean_q)
                        city = props.get("city", "")
                        state = props.get("state", "")
                        country = props.get("country", "")
                        parts = [p for p in [name, city, state, country] if p]
                        results.append({
                            "lat": str(coords[1]),
                            "lon": str(coords[0]),
                            "display_name": ", ".join(parts) or name,
                            "name": name,
                            "state": state
                        })
                if results:
                    return results
    except Exception:
        pass

    # 3. Fallback: Nominatim via server with custom User-Agent
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": f"{clean_q}, India", "format": "json", "limit": 5},
                headers={"User-Agent": "SafeGo-RideSharing/1.0 (contact@safego.in)"}
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass

    return []


@router.get("/reverse")
async def reverse_geocode(lat: float = Query(...), lon: float = Query(...)):
    # 1. Check local dataset for closest known location
    closest = None
    min_dist = 6.0  # within 6 km
    for loc in getattr(geo_service, "locations", []):
        dist = haversine_distance(lat, lon, loc["lat"], loc["lng"])
        if dist < min_dist:
            min_dist = dist
            closest = loc

    if closest:
        return {
            "lat": str(lat),
            "lon": str(lon),
            "display_name": closest["display_name"],
            "address": {
                "city": closest["name"],
                "state": closest.get("state", ""),
                "country": "India"
            }
        }

    # 2. Server-side Nominatim reverse with proper User-Agent
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lon, "format": "json"},
                headers={"User-Agent": "SafeGo-RideSharing/1.0 (contact@safego.in)"}
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass

    return {
        "lat": str(lat),
        "lon": str(lon),
        "display_name": f"Current Location ({lat:.4f}, {lon:.4f})",
        "address": {"city": "Current Location", "state": "India", "country": "India"}
    }


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
        driver_lat=payload.driver_latitude,
        driver_lng=payload.driver_longitude,
    )
    return RouteResponse(**result)


@router.post("/reroute", response_model=RerouteResponse)
async def reroute_trip(payload: RerouteRequest):
    result = await reroute_active_trip(
        driver_lat=payload.driver_latitude,
        driver_lng=payload.driver_longitude,
        dest_lat=payload.destination_latitude,
        dest_lng=payload.destination_longitude,
        mode=payload.mode,
        reason=payload.reason,
    )
    return RerouteResponse(**result)


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
