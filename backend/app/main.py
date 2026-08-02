from __future__ import annotations

from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()  # Ensure all os.environ.get() calls resolve .env values

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, close_db
from app.models import User, UserRole
from app.utils.security import hash_password

# Import all route modules
from app.routes import auth, users, drivers, rides, safety, map, admin, websocket, voice


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Initialize MongoDB + Beanie
    await init_db()

    # Seed admin user if not exists
    try:
        existing_admin = await User.find_one(User.email == settings.ADMIN_EMAIL)
        if not existing_admin:
            admin_user = User(
                full_name="SafeGo Admin",
                email=settings.ADMIN_EMAIL,
                phone="+639000000000",
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role=UserRole.admin,
                is_active=True,
                is_verified=True,
            )
            await admin_user.insert()
            print("[SEED] Admin user created")
    except Exception as e:
        print(f"[SEED] Admin seed skipped: {e}")

    yield

    # Shutdown
    await close_db()
    print("[BYE] SafeGo backend shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    description="SafeGo Ride Safety Platform — Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware (trigger reload)
app.add_middleware(
    CORSMiddleware,
    # allow_origins=settings.allowed_origins_list,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(drivers.router)
app.include_router(rides.router)
app.include_router(safety.router)
app.include_router(map.router)
app.include_router(admin.router)
app.include_router(websocket.router)
app.include_router(voice.router)


@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
    }


@app.get("/api/modes")
def get_modes():
    """Serve mode metadata for the frontend home page."""
    return [
        {
            "id": "normal",
            "name": "Normal",
            "description": "Standard ride experience",
            "color": "#4CAF50",
            "icon": "car",
        },
        {
            "id": "pink",
            "name": "Pink",
            "description": "Women-only safe ride",
            "color": "#E91E63",
            "icon": "shield",
        },
        {
            "id": "pwd",
            "name": "PWD",
            "description": "Accessible ride for persons with disability",
            "color": "#2196F3",
            "icon": "accessible",
        },
        {
            "id": "elderly",
            "name": "Elderly",
            "description": "Comfortable ride for senior citizens",
            "color": "#FF9800",
            "icon": "elderly",
        },
        {
            "id": "premium",
            "name": "Premium",
            "description": "High-end luxury node for executive travel",
            "color": "#9C27B0",
            "icon": "gem",
        },
    ]


if __name__ == "__main__":
    import uvicorn
    # Start the server (default for manual execution)
    uvicorn.run(app, host="0.0.0.0", port=8000)
