from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field


# ==================== AUTH ====================

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., max_length=255)
    phone: str = Field(..., max_length=50)
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    role: str = Field(default="passenger")
    gender: str = Field(default="male")


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str  # MongoDB ObjectId as string
    needs_password: Optional[bool] = False
    needs_phone: Optional[bool] = False


class SetPasswordRequest(BaseModel):
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    phone: Optional[str] = None


class FirebaseSyncRequest(BaseModel):
    role: str = "passenger"


class UserResponse(BaseModel):
    id: str = Field(..., alias="_id")
    full_name: str
    email: str
    phone: str
    role: str
    position: Optional[str] = None
    department: Optional[str] = None
    preferred_mode: Optional[str] = None
    gender: Optional[str] = None
    profile_photo: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    preferred_mode: Optional[str] = None


class UserBrief(BaseModel):
    full_name: str

    model_config = ConfigDict(from_attributes=True)


# ==================== VEHICLE ====================

class VehicleCreate(BaseModel):
    make: str
    model: str
    year: int
    color: str
    plate_number: str
    is_wheelchair_accessible: bool = False


class VehicleResponse(BaseModel):
    id: str = Field(..., alias="_id")
    make: str
    model: str
    year: int
    color: str
    plate_number: str
    is_wheelchair_accessible: bool
    is_approved: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class VehicleBrief(BaseModel):
    make: str
    model: str
    plate_number: str

    model_config = ConfigDict(from_attributes=True)


# ==================== DRIVER ====================

class DriverRegister(BaseModel):
    license_number: str
    vehicle: VehicleCreate


class DriverApplication(BaseModel):
    full_name: str
    email: str
    phone: str
    gender: str
    license_number: str
    vehicle: VehicleCreate
    preferred_mode: str = "standard"


class DriverResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    license_number: str
    status: str
    is_online: bool
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    average_rating: float
    total_rides: int
    today_rides: int
    today_earnings: float
    acceptance_rate: float
    certified_modes: Optional[List[str]] = None
    approved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user: Optional[UserResponse] = None
    vehicle: Optional[VehicleResponse] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DriverBrief(BaseModel):
    id: str = Field(..., alias="_id")
    average_rating: float
    user: Optional[UserBrief] = None
    vehicle: Optional[VehicleBrief] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DriverEarnings(BaseModel):
    today_rides: int
    today_earnings: float
    total_rides: int
    acceptance_rate: float
    average_rating: float


class DriverOnlineStatus(BaseModel):
    is_online: bool


class DriverDocumentResponse(BaseModel):
    id: str = Field(..., alias="_id")
    driver_id: str
    document_type: str
    file_url: Optional[str] = None
    status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DocumentUpload(BaseModel):
    file_url: str


class NearbyDriverResponse(BaseModel):
    driver_id: str
    driver_name: str
    latitude: float
    longitude: float
    distance_km: float
    eta_minutes: float
    average_rating: float
    vehicle: Optional[VehicleBrief] = None


# ==================== RIDE ====================

class RouteRequest(BaseModel):
    pickup_latitude: float
    pickup_longitude: float
    destination_latitude: float
    destination_longitude: float
    mode: str = "normal"
    passenger_count: int = 1
    scheduled_at: Optional[datetime] = None
    driver_latitude: Optional[float] = None
    driver_longitude: Optional[float] = None


class RouteResponse(BaseModel):
    distance_km: float
    duration_minutes: float
    fare_amount: float
    safety_score: int
    ai_safety_prediction: Optional[str] = "Stable"
    surge_multiplier: Optional[float] = 1.0
    route_polyline: Optional[str] = None
    steps: Optional[List[Any]] = []
    driver_to_pickup: Optional[dict] = None


class RerouteRequest(BaseModel):
    driver_latitude: float
    driver_longitude: float
    destination_latitude: float
    destination_longitude: float
    mode: str = "normal"
    reason: str = "driver_deviation"


class RerouteResponse(BaseModel):
    rerouted: bool = True
    reroute_reason: str = "driver_deviation"
    distance_km: float
    duration_minutes: float
    route_polyline: Optional[str] = None
    steps: Optional[List[Any]] = []
    ai_safety_prediction: Optional[str] = "Stable"



class RideRequest(BaseModel):
    mode: str = "normal"
    pickup_address: Optional[str] = None
    pickup_latitude: float
    pickup_longitude: float
    destination_address: Optional[str] = None
    destination_latitude: float
    destination_longitude: float
    scheduled_at: Optional[datetime] = None
    passenger_count: int = 1
    passenger_details: Optional[List[str]] = Field(default_factory=list)
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    driver_id: Optional[str] = None
    fare_amount: Optional[float] = None


class RideResponse(BaseModel):
    id: str = Field(..., alias="_id")
    passenger_id: str
    driver_id: Optional[str] = None
    mode: str
    status: str
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
    passenger_details: Optional[List[str]] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    otp: Optional[str] = None
    is_otp_verified: Optional[bool] = False
    passenger_name: Optional[str] = None
    passenger_rating: Optional[float] = 4.8
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    driver: Optional[DriverBrief] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class RideOTPVerifyRequest(BaseModel):
    otp: str


class SendOTPRequest(BaseModel):
    phone: str


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str


class RideStatusUpdate(BaseModel):
    status: str
    cancel_reason: Optional[str] = None


class RatingCreate(BaseModel):
    score: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class RatingResponse(BaseModel):
    id: str = Field(..., alias="_id")
    ride_id: str
    rater_id: str
    driver_id: str
    score: int
    comment: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ==================== EMERGENCY CONTACTS ====================

class EmergencyContactCreate(BaseModel):
    name: str
    phone: str
    relationship: Optional[str] = None
    is_primary: bool = False


class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relationship: Optional[str] = None
    is_primary: Optional[bool] = None


class EmergencyContactResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    name: str
    phone: str
    relationship: Optional[str] = Field(None, validation_alias="contact_relationship")
    is_primary: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ==================== SOS ====================

class SOSCreate(BaseModel):
    ride_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    route_info: Optional[str] = None
    severity: str = "critical"


class SOSResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    ride_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    route_info: Optional[str] = None
    severity: str
    status: str
    notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SOSResolve(BaseModel):
    status: str  # "resolved" or "false_alarm"
    notes: Optional[str] = None


# ==================== NOTIFICATIONS ====================

class NotificationResponse(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    title: str
    message: str
    type: Optional[str] = None
    is_read: bool
    data: Optional[Any] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ==================== ADMIN ====================

class AdminStats(BaseModel):
    total_users: int
    total_drivers: int
    active_drivers: int
    pending_drivers: int
    total_rides: int
    active_rides: int
    total_sos_alerts: int
    active_sos_alerts: int


class RidesByMode(BaseModel):
    mode: str
    rides: int


class SafetyScoreStat(BaseModel):
    month: str
    score: float


class DriverApproval(BaseModel):
    status: str  # "approved" or "rejected"
    notes: Optional[str] = None


class DocumentReview(BaseModel):
    status: str  # "verified" or "rejected"
    notes: Optional[str] = None


class UserToggleActive(BaseModel):
    is_active: bool


class AdminUserCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    password: str
    role: str = "passenger"
    position: Optional[str] = None
    department: Optional[str] = None
    gender: str = "male"
    is_active: bool = True
    is_verified: bool = False


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    gender: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


# ==================== VOICE & SOS TRIGGER ====================

class VoiceCommandRequest(BaseModel):
    command: str
    context: Optional[dict] = None


class VoiceActionResponse(BaseModel):
    action: str
    target: Optional[str] = None
    params: Optional[dict] = None
    plan: Optional[List[dict]] = None
    feedback: str
    audio: Optional[str] = None
    transcript: Optional[str] = None


class LocationShareRequest(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None


class SOSTriggerRequest(BaseModel):
    latitude: float
    longitude: float
    location_address: Optional[str] = None
    ride_id: Optional[str] = None
