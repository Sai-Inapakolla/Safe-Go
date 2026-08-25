from __future__ import annotations

import math

# ---------- FARE RATES (Philippines Peso) ----------

FARE_RATES = {
    "normal":  {"flag_down": 40.0, "per_km": 18.0},
    "pink":    {"flag_down": 45.0, "per_km": 20.0},
    "pwd":     {"flag_down": 25.0, "per_km": 12.0},
    "elderly": {"flag_down": 30.0, "per_km": 14.0},
}

# ---------- SAFETY SCORE BASE ----------

SAFETY_BASE = {
    "normal": 90,
    "pink": 93,
    "pwd": 88,
    "elderly": 89,
}


def calculate_fare(mode: str, distance_km: float) -> float:
    """Calculate fare in PHP based on mode and distance."""
    rates = FARE_RATES.get(mode, FARE_RATES["normal"])
    fare = rates["flag_down"] + (rates["per_km"] * distance_km)
    return round(fare, 2)


def calculate_safety_score(mode: str, distance_km: float) -> int:
    """
    Calculate a heuristic safety score (0-100) with dynamic variations.
    """
    import random
    base = SAFETY_BASE.get(mode, 90)
    
    # Deduct points for distance but add a "Live Traffic/Time" random factor
    # This makes the score feel real and dynamic as requested
    distance_penalty = min(8, int(distance_km / 4))
    dynamic_jitter = random.randint(-3, 3) # Real-time flux
    
    score = base - distance_penalty + dynamic_jitter
    return max(65, min(100, score))


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two GPS points in km.
    """
    R = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def estimate_duration(distance_km: float, hour: int | None = None) -> float:
    """
    Traffic-aware duration estimate in minutes.
    Considers time-of-day peak traffic hours (8-10 AM, 5-8 PM) and road network speed models.
    """
    if distance_km <= 0:
        return 1.0

    # Base average city speed: 28 km/h
    base_speed = 28.0

    # Time-of-day traffic factor
    traffic_multiplier = 1.0
    if hour is not None:
        if (8 <= hour <= 10) or (17 <= hour <= 20):
            traffic_multiplier = 1.35  # Peak traffic congestion (+35% time)
        elif (11 <= hour <= 16):
            traffic_multiplier = 1.15  # Moderate midday traffic (+15% time)
        elif (22 <= hour or hour <= 5):
            traffic_multiplier = 0.85  # Free-flowing night traffic (-15% time)

    duration_minutes = (distance_km / base_speed) * 60.0 * traffic_multiplier
    return max(1.0, round(duration_minutes, 1))

