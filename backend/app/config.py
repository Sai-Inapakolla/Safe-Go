import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import find_dotenv, load_dotenv

# Locate repository root and backend directories
_APP_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _APP_DIR.parent
_ROOT_DIR = _BACKEND_DIR.parent

# Collect env file locations in order of fallback/discovery
_ENV_CANDIDATES = [
    str(_ROOT_DIR / ".env"),
    str(_BACKEND_DIR / ".env"),
    find_dotenv(usecwd=True),
    ".env",
]
_ENV_FILES = tuple(dict.fromkeys(f for f in _ENV_CANDIDATES if f))

# Preload into os.environ for non-Pydantic consumers
for _env_f in (_ROOT_DIR / ".env", _BACKEND_DIR / ".env"):
    if _env_f.exists():
        load_dotenv(dotenv_path=_env_f, override=False)


class Settings(BaseSettings):
    DATABASE_URL: str = "mongodb://127.0.0.1:27017/safego_db"
    SECRET_KEY: str = "safego-super-secret-key-change-me-in-production-2025"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    APP_NAME: str = "SafeGo"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    ADMIN_EMAIL: str = "admin@safego.ph"
    ADMIN_PASSWORD: str = "Admin@SafeGo2025"
    ADMIN_PHONE: str = "+919490969706"
    TESTER_EMAIL: str = "tester@safego.in"
    TESTER_PASSWORD: str = "Tester@SafeGo2025"
    TESTER_PHONE: str = "+919490969706"
    OSRM_BASE_URL: str = "http://router.project-osrm.org"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    OPENAI_API_KEY: str = ""
    SARVAM_API_KEY: str = ""
    SARVAM_LANGUAGE: str = "en-IN"
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_URL: str = ""
    CLOUDINARY_FOLDER: str = "safego/driver_documents"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        extra="ignore",
        env_file_encoding="utf-8",
    )


settings = Settings()

