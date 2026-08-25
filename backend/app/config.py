from __future__ import annotations

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "mongodb://127.0.0.1:27017/safego_db"
    SECRET_KEY: str = "safego-super-secret-key-change-me-in-production-2025"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    APP_NAME: str = "SafeGo"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    ADMIN_EMAIL: str = "madhansenthilkumar1@gmail.com"
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


    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
