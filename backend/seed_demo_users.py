import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")

async def seed_users():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["safego_db"]
    users_coll = db["users"]
    drivers_coll = db["drivers"]
    
    # 1. Create Passenger
    passenger_email = "passenger@safego.ph"
    if not await users_coll.find_one({"email": passenger_email}):
        await users_coll.insert_one({
            "full_name": "Test Passenger",
            "email": passenger_email,
            "phone": "+639111111111",
            "hashed_password": hash_password("Passenger123!"),
            "role": "passenger",
            "is_active": True,
            "is_verified": True,
            "created_at": "2024-01-01T00:00:00Z"
        })
        print("Passenger created")

    # 2. Create Driver
    driver_email = "driver@safego.ph"
    if not await users_coll.find_one({"email": driver_email}):
        user_res = await users_coll.insert_one({
            "full_name": "Test Driver",
            "email": driver_email,
            "phone": "+639222222222",
            "hashed_password": hash_password("Driver123!"),
            "role": "driver",
            "is_active": True,
            "is_verified": True,
            "created_at": "2024-01-01T00:00:00Z"
        })
        
        # Also need a driver entry
        await drivers_coll.insert_one({
            "user_id": user_res.inserted_id,
            "license_number": "L-12345-67890",
            "status": "approved",
            "is_online": True,
            "average_rating": 4.8,
            "total_rides": 10,
            "certified_modes": ["normal", "pink", "pwd", "elderly"],
            "created_at": "2024-01-01T00:00:00Z"
        })
        print("Driver created")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_users())
