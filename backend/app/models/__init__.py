import enum
from datetime import datetime, timezone
from typing import Annotated, Optional, List, Any

from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field


# ---------- ENUMS ----------

class UserRole(str, enum.Enum):
    passenger = "passenger"
    driver = "driver"
    staff = "staff"
    admin = "admin"


class RideMode(str, enum.Enum):
    normal = "normal"
    pink = "pink"
    pwd = "pwd"
    elderly = "elderly"
    premium = "premium"


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class DriverStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    suspended = "suspended"


class RideStatus(str, enum.Enum):
    pending = "pending"
    searching = "searching"
    matched = "matched"
    driver_arriving = "driver_arriving"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class DocumentType(str, enum.Enum):
    national_id = "national_id"
    drivers_license = "drivers_license"
    vehicle_registration = "vehicle_registration"
    nbi_clearance = "nbi_clearance"


class DocumentStatus(str, enum.Enum):
    upload_required = "upload_required"
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class SOSSeverity(str, enum.Enum):
    critical = "critical"
    moderate = "moderate"
    low = "low"


class SOSStatus(str, enum.Enum):
    active = "active"
    resolved = "resolved"
    false_alarm = "false_alarm"


def _utcnow():
    return datetime.now(timezone.utc)


# ---------- MODELS (Beanie Documents) ----------

class User(Document):
    full_name: str
    email: Annotated[str, Indexed(unique=True)]
    phone: Annotated[str, Indexed(unique=True)]
    firebase_uid: Optional[Annotated[str, Indexed(unique=True)]] = None
    hashed_password: Optional[str] = None
    role: UserRole = UserRole.passenger
    position: Optional[str] = None
    department: Optional[str] = None
    preferred_mode: Optional[RideMode] = RideMode.normal
    gender: Optional[Gender] = Gender.male
    profile_photo: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "users"


class Driver(Document):
    user_id: PydanticObjectId
    license_number: Annotated[str, Indexed(unique=True)]
    status: DriverStatus = DriverStatus.pending
    is_online: bool = False
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    average_rating: float = 0.0
    total_rides: int = 0
    today_rides: int = 0
    today_earnings: float = 0.0
    acceptance_rate: float = 100.0
    certified_modes: List[str] = Field(default_factory=lambda: ["normal"])
    approved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "drivers"


class Vehicle(Document):
    driver_id: PydanticObjectId
    make: str
    model: str
    year: int
    color: str
    plate_number: Annotated[str, Indexed(unique=True)]
    is_wheelchair_accessible: bool = False
    is_approved: bool = False
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "vehicles"


class DriverDocument(Document):
    driver_id: PydanticObjectId
    document_type: DocumentType
    file_url: Optional[str] = None
    status: DocumentStatus = DocumentStatus.upload_required
    reviewed_by: Optional[PydanticObjectId] = None
    reviewed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "driver_documents"


class Ride(Document):
    passenger_id: PydanticObjectId
    driver_id: Optional[PydanticObjectId] = None
    mode: RideMode = RideMode.normal
    status: RideStatus = RideStatus.pending
    pickup_address: Optional[str] = None
    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None
    destination_address: Optional[str] = None
    destination_latitude: Optional[float] = None
    destination_longitude: Optional[float] = None
    distance_km: Optional[float] = None
    duration_minutes: Optional[float] = None
    fare_amount: Optional[float] = None
    safety_score: Optional[int] = None
    route_polyline: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    passenger_count: int = 1
    passenger_details: Optional[List[str]] = Field(default_factory=list)
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    otp: Optional[str] = None
    is_otp_verified: bool = False
    is_deleted_by_user: bool = False  # Soft delete flag
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "rides"


class RideLocationHistory(Document):
    ride_id: PydanticObjectId
    latitude: float
    longitude: float
    recorded_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "ride_location_history"


class Rating(Document):
    ride_id: PydanticObjectId
    rater_id: PydanticObjectId
    driver_id: PydanticObjectId
    score: int
    comment: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "ratings"


class EmergencyContact(Document):
    user_id: PydanticObjectId
    name: str
    phone: str
    contact_relationship: Optional[str] = None
    is_primary: bool = False
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "emergency_contacts"


class SOSAlert(Document):
    user_id: PydanticObjectId
    ride_id: Optional[PydanticObjectId] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    route_info: Optional[str] = None
    severity: SOSSeverity = SOSSeverity.critical
    status: SOSStatus = SOSStatus.active
    idempotency_key: Optional[str] = None
    notes: Optional[str] = None
    resolved_by: Optional[PydanticObjectId] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "sos_alerts"


class Notification(Document):
    user_id: PydanticObjectId
    title: str
    message: str
    type: Optional[str] = None
    is_read: bool = False
    data: Optional[Any] = None
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "notifications"
