import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.database import init_db
from app.models import User, Driver, Ride, SOSAlert

async def main():
    print("==================================================")
    print(" SafeGo Database Connection Diagnostic Tool")
    print("==================================================")
    print(f"DATABASE_URL host: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else 'local'}")
    
    try:
        await init_db()
        print("\n[SUCCESS] Motor + Beanie successfully connected to MongoDB Atlas!")
        
        users_count = await User.count()
        drivers_count = await Driver.count()
        rides_count = await Ride.count()
        sos_count = await SOSAlert.count()
        
        print(f" - Users in DB: {users_count}")
        print(f" - Drivers in DB: {drivers_count}")
        print(f" - Rides in DB: {rides_count}")
        print(f" - SOS Alerts in DB: {sos_count}")
        
        admin = await User.find_one(User.email == settings.ADMIN_EMAIL)
        if admin:
            print(f"\n[ADMIN USER]: {admin.email} (Role: {admin.role}, Active: {admin.is_active})")
        else:
            print(f"\n[WARNING]: Admin {settings.ADMIN_EMAIL} not found in DB.")
            
    except Exception as e:
        print(f"\n[ERROR] Could not connect to database: {type(e).__name__} - {e}")

if __name__ == "__main__":
    asyncio.run(main())
