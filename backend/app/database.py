from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.config import settings

# Motor client
_client: AsyncIOMotorClient = None  # type: ignore


async def init_db():
    """Initialize Motor client and Beanie ODM. Call once at startup."""
    global _client

    from app.models import (
        User, Driver, Vehicle, DriverDocument,
        Ride, RideLocationHistory, Rating,
        EmergencyContact, SOSAlert, Notification,
    )

    _client = AsyncIOMotorClient(settings.DATABASE_URL)
    db_name = settings.DATABASE_URL.rsplit("/", 1)[-1].split("?")[0] or "safego_db"

    await init_beanie(
        database=_client[db_name],
        document_models=[
            User, Driver, Vehicle, DriverDocument,
            Ride, RideLocationHistory, Rating,
            EmergencyContact, SOSAlert, Notification,
        ],
    )
    print(f"[DB] Connected to MongoDB: {db_name}")
    
    # Seed Indian drivers for local/booking fleet intelligence testing
    await seed_indian_drivers()


async def seed_indian_drivers():
    from app.models import User, Driver, Vehicle, UserRole, DriverStatus, Gender
    from app.utils.security import hash_password
    import random

    driver_count = await Driver.count()
    if driver_count >= 10:
        print("[DB] Drivers already seeded.")
        return

    print("[DB] Seeding Indian drivers (10 fleet cabs)...")
    
    female_drivers = [
        {"name": "Priya Singh", "email": "priya.singh@safego.in", "phone": "+919999999001", "modes": ["normal", "pink"]},
        {"name": "Ananya Rao", "email": "ananya.rao@safego.in", "phone": "+919999999002", "modes": ["normal", "pink"]},
        {"name": "Diya Kapoor", "email": "diya.kapoor@safego.in", "phone": "+919999999003", "modes": ["normal", "pink", "elderly"]},
        {"name": "Neha Acharya", "email": "neha.acharya@safego.in", "phone": "+919999999004", "modes": ["normal", "pink", "pwd"]},
        {"name": "Pooja Verma", "email": "pooja.verma@safego.in", "phone": "+919999999009", "modes": ["normal", "pink"]}
    ]
    
    male_drivers = [
        {"name": "Aarav Sharma", "email": "aarav.sharma@safego.in", "phone": "+919999999005", "modes": ["normal", "pwd", "elderly"]},
        {"name": "Kabir Khan", "email": "kabir.khan@safego.in", "phone": "+919999999006", "modes": ["normal", "premium"]},
        {"name": "Rohan Mehta", "email": "rohan.mehta@safego.in", "phone": "+919999999007", "modes": ["normal", "pwd"]},
        {"name": "Aditya Patel", "email": "aditya.patel@safego.in", "phone": "+919999999008", "modes": ["normal", "elderly", "premium"]},
        {"name": "Vihaan Gupta", "email": "vihaan.gupta@safego.in", "phone": "+919999999010", "modes": ["normal", "premium"]}
    ]
    
    vehicles = [
        {"make": "Maruti Suzuki", "model": "Swift Dzire", "color": "White", "year": 2022},
        {"make": "Hyundai", "model": "Aura", "color": "Silver", "year": 2023},
        {"make": "Tata", "model": "Tigor", "color": "Grey", "year": 2021},
        {"make": "Honda", "model": "Amaze", "color": "Red", "year": 2022},
        {"make": "Toyota", "model": "Etios", "color": "Blue", "year": 2020},
        {"make": "Mahindra", "model": "Verito", "color": "Black", "year": 2021},
        {"make": "Maruti Suzuki", "model": "Ertiga", "color": "Brown", "year": 2023},
        {"make": "Hyundai", "model": "i20 Active", "color": "Orange", "year": 2022},
        {"make": "Kia", "model": "Sonet", "color": "Silver", "year": 2023},
        {"make": "Tata", "model": "Nexon", "color": "White", "year": 2024}
    ]
    
    hashed_pwd = hash_password("SafeGo@2025")
    
    for idx, d_data in enumerate(female_drivers + male_drivers):
        gender = Gender.female if d_data in female_drivers else Gender.male
        
        user = await User.find_one(User.email == d_data["email"])
        if not user:
            user = User(
                full_name=d_data["name"],
                email=d_data["email"],
                phone=d_data["phone"],
                hashed_password=hashed_pwd,
                role=UserRole.driver,
                gender=gender,
                is_active=True,
                is_verified=True
            )
            await user.insert()
            
        driver = await Driver.find_one(Driver.user_id == user.id)
        if not driver:
            driver = Driver(
                user_id=user.id,
                license_number=f"DL-{random.randint(10, 99)}-{random.randint(1000, 9999)}-{random.randint(100000, 999999)}",
                status=DriverStatus.approved,
                is_online=True,
                current_latitude=22.3 + (random.random() - 0.5) * 0.015,
                current_longitude=73.19 + (random.random() - 0.5) * 0.015,
                average_rating=round(random.uniform(4.7, 5.0), 1),
                total_rides=random.randint(5, 40),
                certified_modes=d_data["modes"]
            )
            await driver.insert()
            
        vehicle = await Vehicle.find_one(Vehicle.driver_id == driver.id)
        if not vehicle:
            v_data = vehicles[idx % len(vehicles)]
            vehicle = Vehicle(
                driver_id=driver.id,
                make=v_data["make"],
                model=v_data["model"],
                year=v_data["year"],
                color=v_data["color"],
                plate_number=f"DL {random.randint(1, 9)}C {chr(random.randint(65, 90))}{chr(random.randint(65, 90))} {random.randint(1000, 9999)}",
                is_wheelchair_accessible="pwd" in d_data["modes"],
                is_approved=True
            )
            await vehicle.insert()
            
    print("[DB] Indian drivers successfully seeded.")


async def close_db():
    """Shutdown Motor client."""
    global _client
    if _client:
        _client.close()
        print("[DB] MongoDB connection closed gracefully (App Lifecycle)")

