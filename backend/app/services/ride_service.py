from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, List
from beanie import PydanticObjectId

from app.models import Ride, Driver, Rating, RideStatus, DriverStatus, RideMode, User, Gender
from app.utils.fare import haversine_distance
from app.services.map_service import get_route


async def find_nearest_driver(pickup_lat: float, pickup_lng: float, mode: str) -> Optional[Driver]:
    """Find the nearest online + approved driver certified for the given mode."""
    drivers = await Driver.find(
        Driver.status == DriverStatus.approved,
        Driver.is_online == True,
        Driver.current_latitude != None,
        Driver.current_longitude != None,
    ).to_list()

    # Filter by gender for pink mode
    filtered = []
    for driver in drivers:
        user = await User.get(driver.user_id)
        if not user:
            continue
        if mode == "pink" and user.gender != Gender.female:
            continue
        certified = driver.certified_modes or []
        if mode not in certified and mode != "normal":
            continue
        filtered.append(driver)

    best_driver = None
    best_distance = float("inf")
    for driver in filtered:
        dist = haversine_distance(pickup_lat, pickup_lng, driver.current_latitude, driver.current_longitude)
        if dist < best_distance:
            best_distance = dist
            best_driver = driver

    return best_driver


async def create_ride(
    passenger_id: PydanticObjectId,
    mode: str,
    pickup_address: Optional[str],
    pickup_latitude: float,
    pickup_longitude: float,
    destination_address: Optional[str],
    destination_latitude: float,
    destination_longitude: float,
    scheduled_at: Optional[datetime] = None,
    passenger_count: int = 1,
    passenger_details: Optional[List[str]] = None,
    emergency_contact_name: Optional[str] = None,
    emergency_contact_phone: Optional[str] = None,
    driver_id: Optional[str] = None,
    fare_amount: Optional[float] = None,
) -> Ride:
    """Create a ride request and attempt to match a driver."""
    route_info = await get_route(pickup_latitude, pickup_longitude, destination_latitude, destination_longitude, mode)

    import random
    generated_otp = f"{random.randint(1000, 9999)}"

    valid_driver_id = None
    if driver_id and len(str(driver_id)) == 24:
        try:
            valid_driver_id = PydanticObjectId(driver_id)
        except Exception:
            valid_driver_id = None

    ride = Ride(
        passenger_id=passenger_id,
        driver_id=valid_driver_id,
        mode=RideMode(mode),
        status=RideStatus.searching,
        pickup_address=pickup_address,
        pickup_latitude=pickup_latitude,
        pickup_longitude=pickup_longitude,
        destination_address=destination_address,
        destination_latitude=destination_latitude,
        destination_longitude=destination_longitude,
        distance_km=route_info["distance_km"],
        duration_minutes=route_info["duration_minutes"],
        fare_amount=fare_amount if fare_amount is not None else route_info["fare_amount"],
        safety_score=route_info["safety_score"],
        route_polyline=route_info["route_polyline"],
        scheduled_at=scheduled_at,
        passenger_count=passenger_count,
        passenger_details=passenger_details or [],
        emergency_contact_name=emergency_contact_name,
        emergency_contact_phone=emergency_contact_phone,
        otp=generated_otp,
        is_otp_verified=False,
    )

    if driver_id:
        # If a specific driver was requested, we can store it or let any driver accept it.
        # But we keep status as searching so the driver must manually accept.
        pass
        
    await ride.insert()
    return ride


async def complete_ride(ride: Ride) -> Ride:
    """Mark a ride as completed and update driver stats."""
    ride.status = RideStatus.completed
    ride.completed_at = datetime.now(timezone.utc)

    if ride.driver_id:
        driver = await Driver.get(ride.driver_id)
        if driver:
            driver.total_rides = (driver.total_rides or 0) + 1
            driver.today_rides = (driver.today_rides or 0) + 1
            driver.today_earnings = (driver.today_earnings or 0) + (ride.fare_amount or 0)
            await driver.save()

    await ride.save()
    return ride


async def update_driver_rating(driver_id: PydanticObjectId):
    """Recalculate the average rating for a driver from all ratings."""
    ratings = await Rating.find(Rating.driver_id == driver_id).to_list()
    if ratings:
        avg = sum(r.score for r in ratings) / len(ratings)
        driver = await Driver.get(driver_id)
        if driver:
            driver.average_rating = round(avg, 2)
            await driver.save()
