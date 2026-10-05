"""SafeGo Utility: Make All Drivers Available & Online Immediately.

Run this script anytime to ensure 100% of fleet drivers in MongoDB are:
- status: approved
- is_online: True
- current_latitude & current_longitude set near city center / active location
- certified_modes: ['normal', 'pink', 'pwd', 'elderly', 'premium']
- vehicles approved & wheelchair accessible
"""

import asyncio
import os
import random
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.config import settings
from app.models import (
    User, Driver, Vehicle, DriverDocument,
    Ride, RideLocationHistory, Rating,
    EmergencyContact, SOSAlert, Notification,
    DriverStatus, Gender
)


async def make_all_drivers_available():
    print("[SafeGo] Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.DATABASE_URL)
    db_name = settings.DATABASE_URL.rsplit("/", 1)[-1].split("?")[0] or "safego_db"
    
    await init_beanie(
        database=client[db_name],
        document_models=[
            User, Driver, Vehicle, DriverDocument,
            Ride, RideLocationHistory, Rating,
            EmergencyContact, SOSAlert, Notification,
        ],
    )
    
    drivers = await Driver.find().to_list()
    print(f"[SafeGo] Found {len(drivers)} drivers in database.")
    
    updated_count = 0
    for idx, driver in enumerate(drivers):
        user = await User.get(driver.user_id)
        if user:
            user.is_active = True
            user.is_verified = True
            await user.save()
            
        driver.status = DriverStatus.approved
        driver.is_online = True
        
        # Ensure coordinates are set within active city radius
        if driver.current_latitude is None or driver.current_longitude is None or driver.current_latitude == 0:
            driver.current_latitude = 22.3023 + (random.random() - 0.5) * 0.03
            driver.current_longitude = 73.3762 + (random.random() - 0.5) * 0.03
            
        if not driver.certified_modes or len(driver.certified_modes) < 3:
            if user and user.gender == Gender.female:
                driver.certified_modes = ["normal", "pink", "pwd", "elderly", "premium"]
            else:
                driver.certified_modes = ["normal", "pwd", "elderly", "premium"]
                
        await driver.save()
        
        vehicle = await Vehicle.find_one(Vehicle.driver_id == driver.id)
        if vehicle:
            vehicle.is_approved = True
            vehicle.is_wheelchair_accessible = True
            await vehicle.save()
            
        name = user.full_name if user else f"Driver #{idx+1}"
        gender = user.gender.value if user and user.gender else "unknown"
        print(f"  ✓ {name} ({gender}) -> ONLINE | APPROVED | Lat: {driver.current_latitude:.4f}, Lng: {driver.current_longitude:.4f} | Modes: {driver.certified_modes}")
        updated_count += 1

    print(f"\n[SafeGo] SUCCESS: All {updated_count} drivers are now 100% ONLINE and AVAILABLE!")
    client.close()


if __name__ == "__main__":
    asyncio.run(make_all_drivers_available())
