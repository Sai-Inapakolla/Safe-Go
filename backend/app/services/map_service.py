from __future__ import annotations

import json
from typing import Optional, List
from datetime import datetime

import httpx

from app.config import settings
from app.utils.fare import calculate_fare, calculate_safety_score, haversine_distance, estimate_duration
from app.ml.predictor import predictor
from app.ml.fare_predictor import fare_surge_predictor

# Simple, high-speed in-memory cache for routing calculations
# Key format: (round(pickup_lat, 4), round(pickup_lng, 4), round(dest_lat, 4), round(dest_lng, 4))
ROUTE_CACHE: dict = {}
MAX_CACHE_SIZE = 1000

# Reusable global HTTP client to eliminate TCP/SSL handshake overhead and achieve ultra-low latency routing
HTTP_CLIENT = httpx.AsyncClient(timeout=1.5)


async def get_route(
    pickup_lat: float,
    pickup_lng: float,
    dest_lat: float,
    dest_lng: float,
    mode: str = "normal",
    passenger_count: int = 1,
    scheduled_at: Optional[datetime] = None,
) -> dict:
    """
    Call OSRM for route data, fall back to Haversine if unavailable.
    Returns dict with distance_km, duration_minutes, fare_amount, safety_score, route_polyline, steps.
    """
    # 1. Check in-memory route cache first to make repeated requests INSTANT (0ms latency!)
    cache_key = (round(pickup_lat, 4), round(pickup_lng, 4), round(dest_lat, 4), round(dest_lng, 4))
    
    cached_data = ROUTE_CACHE.get(cache_key)
    if cached_data:
        distance_km = cached_data["distance_km"]
        duration_minutes = cached_data["duration_minutes"]
        route_polyline = cached_data["route_polyline"]
        steps = cached_data["steps"]
        print(f"[MapService Cache] HIT for route: {cache_key}")
    else:
        distance_km = 0.0
        duration_minutes = 0.0
        route_polyline = None
        steps = []

        try:
            url = (
                f"{settings.OSRM_BASE_URL}/route/v1/driving/"
                f"{pickup_lng},{pickup_lat};{dest_lng},{dest_lat}"
                f"?overview=full&geometries=geojson&steps=true"
            )
            # Reusing the global client eliminates 100-300ms of SSL/TCP negotiation overhead!
            resp = await HTTP_CLIENT.get(url, timeout=0.3)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    route = data["routes"][0]
                    distance_km = round(route["distance"] / 1000.0, 2)
                    duration_minutes = round(route["duration"] / 60.0, 1)
                    route_polyline = json.dumps(route.get("geometry"))
                    # Extract step instructions
                    for leg in route.get("legs", []):
                        for step in leg.get("steps", []):
                            steps.append({
                                "instruction": step.get("maneuver", {}).get("type", ""),
                                "name": step.get("name", ""),
                                "distance": step.get("distance", 0),
                                "duration": step.get("duration", 0),
                            })
                    
                    # Cache the successful route calculation
                    if len(ROUTE_CACHE) < MAX_CACHE_SIZE:
                        ROUTE_CACHE[cache_key] = {
                            "distance_km": distance_km,
                            "duration_minutes": duration_minutes,
                            "route_polyline": route_polyline,
                            "steps": steps
                        }
                else:
                    raise Exception("OSRM returned no routes")
            else:
                raise Exception(f"OSRM HTTP {resp.status_code}")
        except Exception as e:
            print(f"[MapService Warning] Routing service fallback triggered: {e}")
            # Fallback to Haversine instantly
            distance_km = round(haversine_distance(pickup_lat, pickup_lng, dest_lat, dest_lng), 2)
            duration_minutes = estimate_duration(distance_km)
            route_polyline = json.dumps({
                "type": "LineString",
                "coordinates": [
                    [pickup_lng, pickup_lat],
                    [dest_lng, dest_lat]
                ]
            })

    safety_score = calculate_safety_score(mode, distance_km)

    # Resolve time variables for the ML models
    time_ref = scheduled_at if scheduled_at else datetime.now()
    pickup_hour = time_ref.hour
    day_of_week = time_ref.weekday() # 0 = Monday, 6 = Sunday

    # 1. Run ML safety prediction inference first (safety status is fed as a feature into the surge predictor)
    ai_prediction, safety_confidence = predictor.predict_safety(
        pickup_hour=pickup_hour,
        day_of_week=day_of_week,
        distance_km=distance_km,
        passenger_count=passenger_count,
        mode=mode,
        pickup_lat=pickup_lat,
        pickup_lng=pickup_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng
    )

    # 2. Run ML fare surge pricing regression inference
    surge_multiplier, surge_confidence = fare_surge_predictor.predict_surge(
        pickup_hour=pickup_hour,
        day_of_week=day_of_week,
        distance_km=distance_km,
        passenger_count=passenger_count,
        mode=mode,
        ai_safety_prediction=ai_prediction
    )

    # 3. Calculate baseline fare and multiply by dynamic surge factor
    base_fare = calculate_fare(mode, distance_km)
    fare_amount = round(base_fare * surge_multiplier, 2)

    return {
        "distance_km": distance_km,
        "duration_minutes": duration_minutes,
        "fare_amount": fare_amount,
        "safety_score": safety_score,
        "ai_safety_prediction": ai_prediction,
        "surge_multiplier": surge_multiplier,
        "route_polyline": route_polyline,
        "steps": steps,
    }
