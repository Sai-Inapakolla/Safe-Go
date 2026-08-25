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

# Reusable global HTTP client with generous timeout for reliable routing
HTTP_CLIENT = httpx.AsyncClient(timeout=4.0)

OSRM_ENDPOINTS = [
    settings.OSRM_BASE_URL,
    "http://router.project-osrm.org",
    "https://routing.openstreetmap.de/routed-car"
]

def generate_interpolated_polyline(start_lat: float, start_lng: float, end_lat: float, end_lng: float, num_points: int = 12) -> str:
    """
    Generates a multi-point road-like curved line string as a fallback when public OSRM is unreachable.
    Prevents ugly straight lines by adding slight perpendicular curve offsets based on distance.
    """
    coords = []
    dist = haversine_distance(start_lat, start_lng, end_lat, end_lng)
    curve_offset = min(0.003, dist * 0.05) # subtle curvature factor
    
    for i in range(num_points):
        t = i / (num_points - 1)
        # Linear interpolation
        lat = start_lat + (end_lat - start_lat) * t
        lng = start_lng + (end_lng - start_lng) * t
        
        # Add perpendicular sinusoidal curvature in middle segment
        if 0 < i < num_points - 1:
            sine_wave = math.sin(t * math.pi)
            lat += curve_offset * sine_wave * 0.5
            lng += curve_offset * sine_wave * 0.75
            
        coords.append([round(lng, 6), round(lat, 6)])
        
    return json.dumps({
        "type": "LineString",
        "coordinates": coords
    })


async def fetch_osrm_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> dict:
    """
    Fetches actual road route from OSRM endpoints with fallback endpoints and 3.5s timeout.
    """
    cache_key = (round(start_lat, 4), round(start_lng, 4), round(end_lat, 4), round(end_lng, 4))
    if cache_key in ROUTE_CACHE:
        print(f"[MapService Cache] HIT for route: {cache_key}")
        return ROUTE_CACHE[cache_key]

    for base_url in OSRM_ENDPOINTS:
        if not base_url:
            continue
        try:
            url = (
                f"{base_url.rstrip('/')}/route/v1/driving/"
                f"{start_lng},{start_lat};{end_lng},{end_lat}"
                f"?overview=full&geometries=geojson&steps=true"
            )
            resp = await HTTP_CLIENT.get(url, timeout=3.5)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    route = data["routes"][0]
                    distance_km = round(route["distance"] / 1000.0, 2)
                    duration_minutes = round(route["duration"] / 60.0, 1)
                    route_polyline = json.dumps(route.get("geometry"))
                    steps = []
                    for leg in route.get("legs", []):
                        for step in leg.get("steps", []):
                            steps.append({
                                "instruction": step.get("maneuver", {}).get("type", ""),
                                "name": step.get("name", ""),
                                "distance": step.get("distance", 0),
                                "duration": step.get("duration", 0),
                            })
                    
                    result = {
                        "distance_km": distance_km,
                        "duration_minutes": duration_minutes,
                        "route_polyline": route_polyline,
                        "steps": steps,
                        "is_road_network": True
                    }
                    if len(ROUTE_CACHE) < MAX_CACHE_SIZE:
                        ROUTE_CACHE[cache_key] = result
                    return result
        except Exception as e:
            print(f"[MapService] Routing endpoint {base_url} failed: {e}")
            continue

    # Fallback to Haversine + Curved Polyline if all OSRM endpoints fail
    print("[MapService Warning] All OSRM endpoints failed. Using curved road approximation fallback.")
    distance_km = round(haversine_distance(start_lat, start_lng, end_lat, end_lng) * 1.22, 2) # 1.22 road tortuosity factor
    hour = datetime.now().hour
    duration_minutes = estimate_duration(distance_km, hour=hour)
    route_polyline = generate_interpolated_polyline(start_lat, start_lng, end_lat, end_lng)

    result = {
        "distance_km": distance_km,
        "duration_minutes": duration_minutes,
        "route_polyline": route_polyline,
        "steps": [],
        "is_road_network": False
    }
    if len(ROUTE_CACHE) < MAX_CACHE_SIZE:
        ROUTE_CACHE[cache_key] = result
    return result


async def get_route(
    pickup_lat: float,
    pickup_lng: float,
    dest_lat: float,
    dest_lng: float,
    mode: str = "normal",
    passenger_count: int = 1,
    scheduled_at: Optional[datetime] = None,
    driver_lat: Optional[float] = None,
    driver_lng: Optional[float] = None,
) -> dict:
    """
    Call routing engine for trip route data.
    Returns dict with distance_km, duration_minutes, fare_amount, safety_score, route_polyline, steps,
    and optional driver_to_pickup details.
    """
    route_data = await fetch_osrm_route(pickup_lat, pickup_lng, dest_lat, dest_lng)
    distance_km = route_data["distance_km"]
    duration_minutes = route_data["duration_minutes"]
    route_polyline = route_data["route_polyline"]
    steps = route_data["steps"]

    safety_score = calculate_safety_score(mode, distance_km)

    time_ref = scheduled_at if scheduled_at else datetime.now()
    pickup_hour = time_ref.hour
    day_of_week = time_ref.weekday() # 0 = Monday, 6 = Sunday

    # 1. Run ML safety prediction inference
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

    # Calculate driver -> pickup route if driver coordinates provided
    driver_to_pickup = None
    if driver_lat is not None and driver_lng is not None:
        driver_route = await fetch_osrm_route(driver_lat, driver_lng, pickup_lat, pickup_lng)
        driver_to_pickup = {
            "driver_distance_km": driver_route["distance_km"],
            "driver_eta_minutes": driver_route["duration_minutes"],
            "driver_route_polyline": driver_route["route_polyline"],
        }

    return {
        "distance_km": distance_km,
        "duration_minutes": duration_minutes,
        "fare_amount": fare_amount,
        "safety_score": safety_score,
        "ai_safety_prediction": ai_prediction,
        "surge_multiplier": surge_multiplier,
        "route_polyline": route_polyline,
        "steps": steps,
        "driver_to_pickup": driver_to_pickup,
    }


async def reroute_active_trip(
    driver_lat: float,
    driver_lng: float,
    dest_lat: float,
    dest_lng: float,
    mode: str = "normal",
    reason: str = "driver_deviation"
) -> dict:
    """
    Reroutes an active trip dynamically from driver's current live location to destination.
    Evaluates ML safety risk for the recalculated path.
    """
    route_data = await fetch_osrm_route(driver_lat, driver_lng, dest_lat, dest_lng)
    hour = datetime.now().hour
    day = datetime.now().weekday()

    ai_prediction, confidence = predictor.predict_safety(
        pickup_hour=hour,
        day_of_week=day,
        distance_km=route_data["distance_km"],
        passenger_count=1,
        mode=mode,
        pickup_lat=driver_lat,
        pickup_lng=driver_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng
    )

    return {
        "rerouted": True,
        "reroute_reason": reason,
        "distance_km": route_data["distance_km"],
        "duration_minutes": route_data["duration_minutes"],
        "route_polyline": route_data["route_polyline"],
        "steps": route_data["steps"],
        "ai_safety_prediction": ai_prediction,
    }

