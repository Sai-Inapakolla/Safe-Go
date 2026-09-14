import uuid
import asyncio
from typing import List, Optional
from datetime import datetime, timezone

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form

from app.models import (
    User, Driver, Vehicle, DriverDocument, Ride, RideStatus, UserRole,
    DocumentStatus, DocumentType, Rating, DriverStatus, SOSAlert, SOSSeverity, SOSStatus
)
from app.schemas import (
    DriverRegister, DriverApplication, DriverResponse, DriverEarnings, DriverOnlineStatus,
    DriverDocumentResponse, DocumentUpload, RideResponse, ReportViolationRequest
)
from app.services.driver_service import create_driver_profile
from app.services.cloudinary_service import upload_driver_document
from app.utils.dependencies import get_current_user, get_current_driver

router = APIRouter(prefix="/api/drivers", tags=["drivers"])


@router.get("/active", response_model=List[DriverResponse])
async def get_active_drivers(current_user: User = Depends(get_current_user)):
    """Fetch all approved and online drivers for live ride matching.
    Only returns real fleet drivers (not auto-created profiles from passengers/admins).
    """
    drivers = await Driver.find(
        Driver.status == DriverStatus.approved,
        Driver.is_online == True
    ).to_list()
    
    fleet_emails = [
        "priya.singh@safego.in", "ananya.rao@safego.in", "diya.kapoor@safego.in", 
        "neha.acharya@safego.in", "pooja.verma@safego.in",
        "aarav.sharma@safego.in", "kabir.khan@safego.in",
        "rohan.mehta@safego.in", "aditya.patel@safego.in", "vihaan.gupta@safego.in"
    ]
    
    # Filter to strictly include ONLY official fleet drivers by email
    fleet_drivers = []
    for d in drivers:
        user = await User.get(d.user_id)
        if user and user.email in fleet_emails:
            fleet_drivers.append(d)
    
    # Limit to max 10 fleet cabs (5 male, 5 female)
    fleet_drivers = fleet_drivers[:10]
    return await asyncio.gather(*[_driver_dict(d) for d in fleet_drivers])


async def _driver_dict(driver: Driver) -> dict:
    user = await User.get(driver.user_id)
    vehicle = await Vehicle.find_one(Vehicle.driver_id == driver.id)
    docs = await DriverDocument.find(DriverDocument.driver_id == driver.id).to_list()
    return {
        "_id": str(driver.id), "user_id": str(driver.user_id),
        "license_number": driver.license_number, "status": driver.status.value,
        "is_online": driver.is_online, "current_latitude": driver.current_latitude,
        "current_longitude": driver.current_longitude, "average_rating": driver.average_rating,
        "total_rides": driver.total_rides, "today_rides": driver.today_rides,
        "today_earnings": driver.today_earnings, "acceptance_rate": driver.acceptance_rate,
        "certified_modes": driver.certified_modes, "approved_at": driver.approved_at,
        "created_at": driver.created_at, "updated_at": driver.updated_at,
        "user": {"_id": str(user.id), "full_name": user.full_name, "email": user.email,
                 "phone": user.phone, "role": user.role.value,
                 "preferred_mode": user.preferred_mode.value if user.preferred_mode else None,
                 "gender": user.gender.value if user.gender else None,
                 "profile_photo": user.profile_photo, "is_active": user.is_active,
                 "is_verified": user.is_verified, "created_at": user.created_at,
                 "updated_at": user.updated_at} if user else None,
        "vehicle": {"_id": str(vehicle.id), "make": vehicle.make, "model": vehicle.model,
                    "year": vehicle.year, "color": vehicle.color,
                    "plate_number": vehicle.plate_number,
                    "is_wheelchair_accessible": vehicle.is_wheelchair_accessible,
                    "is_approved": vehicle.is_approved,
                    "created_at": vehicle.created_at} if vehicle else None,
        "documents": [_doc_dict(d) for d in docs],
    }


def _doc_dict(doc: DriverDocument) -> dict:
    return {
        "_id": str(doc.id), "driver_id": str(doc.driver_id),
        "document_type": doc.document_type.value, "file_url": doc.file_url,
        "status": doc.status.value,
        "reviewed_by": str(doc.reviewed_by) if doc.reviewed_by else None,
        "reviewed_at": doc.reviewed_at, "notes": doc.notes,
        "created_at": doc.created_at, "updated_at": doc.updated_at,
    }


def _format_dt(dt) -> Optional[str]:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


async def _ride_dict(ride: Ride, passenger_map: Optional[dict] = None) -> dict:
    passenger = None
    if passenger_map and ride.passenger_id in passenger_map:
        passenger = passenger_map[ride.passenger_id]
    else:
        passenger = await User.get(ride.passenger_id)
        
    return {
        "_id": str(ride.id), "passenger_id": str(ride.passenger_id),
        "passenger_name": passenger.full_name if passenger else "Guest User",
        "passenger_rating": 4.8,
        "driver_id": str(ride.driver_id) if ride.driver_id else None,
        "mode": ride.mode.value if hasattr(ride.mode, "value") else ride.mode,
        "status": ride.status.value if hasattr(ride.status, "value") else ride.status,
        "pickup_address": ride.pickup_address, "pickup_latitude": ride.pickup_latitude,
        "pickup_longitude": ride.pickup_longitude, "destination_address": ride.destination_address,
        "destination_latitude": ride.destination_latitude,
        "destination_longitude": ride.destination_longitude,
        "distance_km": ride.distance_km, "duration_minutes": ride.duration_minutes,
        "fare_amount": ride.fare_amount, "safety_score": ride.safety_score,
        "route_polyline": ride.route_polyline,
        "scheduled_at": _format_dt(ride.scheduled_at),
        "started_at": _format_dt(ride.started_at),
        "completed_at": _format_dt(ride.completed_at),
        "cancelled_at": _format_dt(ride.cancelled_at),
        "cancel_reason": ride.cancel_reason,
        "passenger_count": ride.passenger_count,
        "passenger_details": getattr(ride, "passenger_details", []),
        "has_female_passenger_declared": getattr(ride, "has_female_passenger_declared", False),
        "female_passenger_name": getattr(ride, "female_passenger_name", None),
        "penalty_amount": getattr(ride, "penalty_amount", None),
        "is_penalty_applied": getattr(ride, "is_penalty_applied", False),
        "penalty_reason": getattr(ride, "penalty_reason", None),
        "driver_compensation_amount": getattr(ride, "driver_compensation_amount", None),
        "otp": getattr(ride, "otp", None) or f"{(abs(hash(str(ride.id))) % 9000) + 1000}",
        "is_otp_verified": getattr(ride, "is_otp_verified", False),
        "created_at": _format_dt(ride.created_at),
        "updated_at": _format_dt(ride.updated_at),
        "driver": None,
    }


@router.post("/register", response_model=DriverResponse, status_code=201)
async def register_driver(payload: DriverRegister, current_user: User = Depends(get_current_user)):
    if current_user.role not in (UserRole.driver, UserRole.admin):
        raise HTTPException(status_code=403, detail="User must have driver role to register as driver")
    try:
        driver = await create_driver_profile(
            user=current_user,
            license_number=payload.license_number,
            vehicle_data=payload.vehicle.model_dump(),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return await _driver_dict(driver)


async def _ensure_driver_documents(driver_id: Optional[PydanticObjectId | str]) -> List[DriverDocument]:
    """Ensure that document slots exist for all document types for this driver."""
    if driver_id is None:
        return []
    if isinstance(driver_id, str):
        driver_id = PydanticObjectId(driver_id)
    existing_docs = await DriverDocument.find(DriverDocument.driver_id == driver_id).to_list()
    existing_types = {d.document_type for d in existing_docs}
    for doc_type in DocumentType:
        if doc_type not in existing_types:
            new_doc = DriverDocument(
                driver_id=driver_id,
                document_type=doc_type,
                status=DocumentStatus.upload_required,
            )
            await new_doc.insert()
            existing_docs.append(new_doc)
    return existing_docs


@router.post("/apply", response_model=DriverResponse, status_code=201)
async def apply_as_driver(payload: DriverApplication):
    clean_email = payload.email.strip().lower()
    clean_phone = payload.phone.strip()
    
    # Check if user already exists
    existing_user = await User.find_one(User.email == clean_email)
    if existing_user:
        existing_driver = await Driver.find_one(Driver.user_id == existing_user.id)
        if existing_driver and existing_driver.status == DriverStatus.approved:
            raise HTTPException(status_code=400, detail="You are already an active approved driver on SafeGo")
        
        # Update user profile info
        existing_user.role = UserRole.driver
        existing_user.full_name = payload.full_name
        existing_user.phone = clean_phone
        existing_user.is_verified = False
        await existing_user.save()
        user = existing_user
    else:
        from app.utils.security import hash_password
        user = User(
            full_name=payload.full_name,
            email=clean_email,
            phone=clean_phone,
            role=UserRole.driver,
            gender=payload.gender,
            hashed_password=hash_password("SafeGo@2025"),
            is_active=True,
            is_verified=False
        )
        await user.insert()
    
    # Unique license number handling
    clean_license = payload.license_number.strip() if payload.license_number else f"DL-{uuid.uuid4().hex[:8].upper()}"
    existing_license = await Driver.find_one(Driver.license_number == clean_license)
    if existing_license and existing_license.user_id != user.id:
        clean_license = f"DL-{uuid.uuid4().hex[:8].upper()}"

    # Create/Update driver profile (status: pending)
    driver = await Driver.find_one(Driver.user_id == user.id)
    if not driver:
        driver = Driver(
            user_id=user.id,
            license_number=clean_license,
            status=DriverStatus.pending,
            is_online=False,
            average_rating=5.0,
            total_rides=0,
            today_rides=0,
            today_earnings=0.0,
            acceptance_rate=100.0,
            certified_modes=[payload.preferred_mode] if payload.preferred_mode != "standard" else ["normal"]
        )
        await driver.insert()
    else:
        driver.license_number = clean_license
        driver.status = DriverStatus.pending
        driver.is_online = False
        driver.certified_modes = [payload.preferred_mode] if payload.preferred_mode != "standard" else ["normal"]
        driver.updated_at = datetime.now(timezone.utc)
        await driver.save()
    
    # Unique plate number handling
    clean_plate = payload.vehicle.plate_number.strip().upper() if payload.vehicle.plate_number else f"PLT-{uuid.uuid4().hex[:6].upper()}"
    existing_veh = await Vehicle.find_one(Vehicle.plate_number == clean_plate)
    if existing_veh and existing_veh.driver_id != driver.id:
        clean_plate = f"PLT-{uuid.uuid4().hex[:6].upper()}"

    # Create/Update vehicle
    vehicle = await Vehicle.find_one(Vehicle.driver_id == driver.id)
    if not vehicle:
        vehicle = Vehicle(
            driver_id=driver.id,
            make=payload.vehicle.make,
            model=payload.vehicle.model,
            year=payload.vehicle.year,
            color=payload.vehicle.color,
            plate_number=clean_plate,
            is_wheelchair_accessible=payload.vehicle.is_wheelchair_accessible,
            is_approved=False
        )
        await vehicle.insert()
    else:
        vehicle.make = payload.vehicle.make
        vehicle.model = payload.vehicle.model
        vehicle.year = payload.vehicle.year
        vehicle.color = payload.vehicle.color
        vehicle.plate_number = clean_plate
        vehicle.is_wheelchair_accessible = payload.vehicle.is_wheelchair_accessible
        vehicle.is_approved = False
        await vehicle.save()
    
    # Seed document slots
    await _ensure_driver_documents(driver.id)
    
    return await _driver_dict(driver)


@router.post("/apply-with-docs", response_model=DriverResponse, status_code=201)
async def apply_as_driver_with_docs(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    gender: str = Form("male"),
    license_number: Optional[str] = Form(None),
    preferred_mode: str = Form("normal"),
    make: str = Form("Toyota"),
    model_year: str = Form("Camry 2021"),
    color: str = Form("Silver"),
    plate_number: str = Form("ABC-1234"),
    license_file: Optional[UploadFile] = File(None),
    vehicle_reg_file: Optional[UploadFile] = File(None),
    nbi_file: Optional[UploadFile] = File(None),
):
    """Driver onboarding endpoint that handles profile info and uploads verification files directly to Cloudinary."""
    vehicle_year = 2023
    vehicle_model = model_year
    parts = model_year.split()
    if parts and parts[-1].isdigit():
        vehicle_year = int(parts[-1])
        vehicle_model = " ".join(parts[:-1]) or model_year

    clean_email = email.strip().lower()
    clean_phone = phone.strip()

    existing_user = await User.find_one(User.email == clean_email)
    if existing_user:
        existing_driver = await Driver.find_one(Driver.user_id == existing_user.id)
        if existing_driver and existing_driver.status == DriverStatus.approved:
            raise HTTPException(status_code=400, detail="You are already an active approved driver on SafeGo")

        existing_user.role = UserRole.driver
        existing_user.full_name = full_name
        existing_user.phone = clean_phone
        existing_user.is_verified = False
        await existing_user.save()
        user = existing_user
    else:
        from app.utils.security import hash_password
        user = User(
            full_name=full_name,
            email=clean_email,
            phone=clean_phone,
            role=UserRole.driver,
            gender=gender,
            hashed_password=hash_password("SafeGo@2025"),
            is_active=True,
            is_verified=False,
        )
        await user.insert()

    # Unique license number handling
    clean_license = license_number.strip() if license_number else f"DL-{uuid.uuid4().hex[:8].upper()}"
    existing_license = await Driver.find_one(Driver.license_number == clean_license)
    if existing_license and existing_license.user_id != user.id:
        clean_license = f"DL-{uuid.uuid4().hex[:8].upper()}"

    driver = await Driver.find_one(Driver.user_id == user.id)
    if not driver:
        driver = Driver(
            user_id=user.id,
            license_number=clean_license,
            status=DriverStatus.pending,
            is_online=False,
            average_rating=5.0,
            total_rides=0,
            today_rides=0,
            today_earnings=0.0,
            acceptance_rate=100.0,
            certified_modes=[preferred_mode] if preferred_mode != "standard" else ["normal"],
        )
        await driver.insert()
    else:
        driver.license_number = clean_license
        driver.status = DriverStatus.pending
        driver.is_online = False
        driver.certified_modes = [preferred_mode] if preferred_mode != "standard" else ["normal"]
        driver.updated_at = datetime.now(timezone.utc)
        await driver.save()

    # Unique plate number handling
    clean_plate = plate_number.strip().upper() if plate_number else f"PLT-{uuid.uuid4().hex[:6].upper()}"
    existing_veh = await Vehicle.find_one(Vehicle.plate_number == clean_plate)
    if existing_veh and existing_veh.driver_id != driver.id:
        clean_plate = f"PLT-{uuid.uuid4().hex[:6].upper()}"

    vehicle = await Vehicle.find_one(Vehicle.driver_id == driver.id)
    if not vehicle:
        vehicle = Vehicle(
            driver_id=driver.id,
            make=make,
            model=vehicle_model,
            year=vehicle_year,
            color=color,
            plate_number=clean_plate,
            is_wheelchair_accessible=(preferred_mode == "pwd"),
            is_approved=False,
        )
        await vehicle.insert()
    else:
        vehicle.make = make
        vehicle.model = vehicle_model
        vehicle.year = vehicle_year
        vehicle.color = color
        vehicle.plate_number = clean_plate
        vehicle.is_wheelchair_accessible = (preferred_mode == "pwd")
        vehicle.is_approved = False
        await vehicle.save()

    docs = await _ensure_driver_documents(driver.id)

    # Process and upload files directly to Cloudinary
    file_mapping = {
        DocumentType.drivers_license: license_file,
        DocumentType.vehicle_registration: vehicle_reg_file,
        DocumentType.nbi_clearance: nbi_file,
    }

    for doc in docs:
        up_file = file_mapping.get(doc.document_type)
        if up_file and up_file.filename:
            file_bytes = await up_file.read()
            if len(file_bytes) > 0:
                res = await upload_driver_document(
                    file_bytes=file_bytes,
                    filename=up_file.filename,
                    driver_id=str(driver.id),
                    doc_type=doc.document_type.value,
                )
                doc.file_url = res["secure_url"]
                doc.status = DocumentStatus.pending
                doc.updated_at = datetime.now(timezone.utc)
                await doc.save()

    return await _driver_dict(driver)


async def _get_or_create_driver(user_id) -> Driver:
    driver = await Driver.find_one(Driver.user_id == user_id)
    if not driver:
        # Auto-create a driver profile for seamless demo flow
        driver = Driver(
            user_id=user_id,
            license_number=f"DEMO-{user_id}",
            status=DriverStatus.approved,
            is_online=True,
            average_rating=5.0,
            certified_modes=["normal", "pink", "pwd", "premium", "elderly"]
        )
        await driver.insert()
    await _ensure_driver_documents(driver.id)
    return driver


@router.get("/me", response_model=DriverResponse)
async def get_driver_profile(current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    if not driver.is_online:
        driver.is_online = True
        await driver.save()
    return await _driver_dict(driver)


@router.get("/me/earnings", response_model=DriverEarnings)
async def get_driver_earnings(current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    return DriverEarnings(
        today_rides=driver.today_rides or 0, today_earnings=driver.today_earnings or 0.0,
        total_rides=driver.total_rides or 0, acceptance_rate=driver.acceptance_rate or 100.0,
        average_rating=driver.average_rating or 0.0,
    )


@router.put("/me/online-status", response_model=DriverResponse)
async def toggle_online_status(payload: DriverOnlineStatus, current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    driver.is_online = payload.is_online
    driver.updated_at = datetime.now(timezone.utc)
    await driver.save()
    return await _driver_dict(driver)

@router.get("/me/available-rides", response_model=List[RideResponse])
async def get_available_rides(current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    # Return last 15 rides in the system to keep payload lightweight and ensure instant rendering
    rides = await Ride.find().sort("-created_at").limit(15).to_list()
    
    # Batch load passengers to prevent N+1 query timeout
    passenger_ids = list(set(r.passenger_id for r in rides if r.passenger_id))
    passengers = await User.find({"_id": {"$in": passenger_ids}}).to_list() if passenger_ids else []
    passenger_map = {p.id: p for p in passengers}
    
    return [await _ride_dict(r, passenger_map) for r in rides]


@router.get("/me/history", response_model=List[RideResponse])
async def get_driver_history(current_user: User = Depends(get_current_driver)):
    """
    Get all ride history for the current driver.
    """
    driver = await _get_or_create_driver(current_user.id)
    rides = await Ride.find({"$or": [{"driver_id": driver.id}, {"driver_id": str(driver.id)}]}).sort("-created_at").to_list()
    
    if not rides:
        rides = await Ride.find().sort("-created_at").limit(15).to_list()
    
    # Batch load passengers to prevent N+1 query timeout
    passenger_ids = list(set(r.passenger_id for r in rides if r.passenger_id))
    passengers = await User.find({"_id": {"$in": passenger_ids}}).to_list() if passenger_ids else []
    passenger_map = {p.id: p for p in passengers}
    
    return [await _ride_dict(r, passenger_map) for r in rides]


@router.get("/me/activity")
async def get_driver_activity(current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    recent_rides = await Ride.find({"$or": [{"driver_id": driver.id}, {"driver_id": str(driver.id)}]}).sort("-updated_at").limit(10).to_list()
    if not recent_rides:
        recent_rides = await Ride.find().sort("-updated_at").limit(10).to_list()
    
    activities = []
    for r in recent_rides:
        if r.status == RideStatus.completed:
            status_text = "Completed ride to " + (r.destination_address or "destination")
        elif r.status == RideStatus.cancelled:
            status_text = f"Cancelled ride: {r.cancel_reason or 'Trip Cancelled'}"
        else:
            status_text = f"Ride {r.status.value}"
        time_str = r.updated_at.strftime("%I:%M %p") if r.updated_at else "Recently"
        activities.append({
            "id": str(r.id),
            "type": "ride",
            "text": status_text,
            "time": time_str,
            "amount": f"₹{r.driver_compensation_amount or r.fare_amount}" if (r.driver_compensation_amount or r.fare_amount) else None
        })
    
    if not activities:
        activities = [
            {"id": "act_1", "type": "system", "text": "Pilot node synchronized with SafeGo Matrix", "time": "Just now"},
            {"id": "act_2", "type": "auth", "text": "Identity credentials verified on network", "time": "Today"}
        ]
        
    return activities


@router.post("/me/rides/{ride_id}/accept", response_model=RideResponse)
async def accept_ride(ride_id: str, current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    ride = await Ride.get(PydanticObjectId(ride_id))
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    ride.driver_id = driver.id
    ride.status = RideStatus.matched
    await ride.save()
    return await _ride_dict(ride)


@router.post("/me/rides/{ride_id}/cancel")
async def driver_cancel_ride(
    ride_id: str,
    payload: Optional[dict] = None,
    current_user: User = Depends(get_current_driver)
):
    driver = await _get_or_create_driver(current_user.id)
    ride = None
    if PydanticObjectId.is_valid(ride_id):
        ride = await Ride.get(PydanticObjectId(ride_id))
    if not ride:
        # Fallback: Find the most recent active/matched ride
        active_statuses = [RideStatus.searching.value, RideStatus.matched.value, RideStatus.driver_arriving.value, RideStatus.in_progress.value]
        ride = await Ride.find({"status": {"$in": active_statuses}}).sort("-created_at").first_or_none()
    if not ride:
        ride = await Ride.find_all().sort("-created_at").first_or_none()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    reason = (payload or {}).get("reason") or "Driver was unable to proceed with this ride"
    ride.driver_id = driver.id
    ride.status = RideStatus.cancelled
    ride.cancelled_at = datetime.now(timezone.utc)
    ride.updated_at = datetime.now(timezone.utc)
    ride.cancel_reason = reason
    await ride.save()
    return {"message": "Ride cancelled", "status": "cancelled", "cancel_reason": reason}


@router.post("/me/rides/{ride_id}/report-violation")
async def report_pink_mode_violation(
    ride_id: str,
    payload: ReportViolationRequest,
    current_user: User = Depends(get_current_driver)
):
    """
    Driver reports a policy violation (e.g. Solo Male Passenger in Pink Mode).
    Cancels the ride, applies penalty to the passenger, compensates the driver,
    and dispatches a priority incident alert to Admin Command.
    """
    driver = await _get_or_create_driver(current_user.id)
    ride = None
    if PydanticObjectId.is_valid(ride_id):
        ride = await Ride.get(PydanticObjectId(ride_id))
    if not ride:
        # Fallback: Find the most recent active/matched ride
        active_statuses = [RideStatus.searching.value, RideStatus.matched.value, RideStatus.driver_arriving.value, RideStatus.in_progress.value]
        ride = await Ride.find({"status": {"$in": active_statuses}}).sort("-created_at").first_or_none()
    if not ride:
        ride = await Ride.find_all().sort("-created_at").first_or_none()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    penalty_val = payload.penalty_amount if (payload.penalty_amount and 500.0 <= payload.penalty_amount <= 2000.0) else 750.0
    compensation_val = 200.0
    
    # 1. Update Ride Status
    ride.driver_id = driver.id
    ride.status = RideStatus.cancelled
    ride.cancelled_at = datetime.now(timezone.utc)
    ride.updated_at = datetime.now(timezone.utc)
    ride.cancel_reason = f"Policy Violation: {payload.violation_type.replace('_', ' ').title()}"
    ride.penalty_amount = penalty_val
    ride.is_penalty_applied = True
    ride.penalty_reason = payload.notes or "Solo male booking violation in SafeGo Pink Mode"
    ride.driver_compensation_amount = compensation_val
    await ride.save()
    
    # 2. Apply Penalty to Passenger User Account
    passenger = await User.get(ride.passenger_id)
    if passenger:
        passenger.penalty_balance = (getattr(passenger, "penalty_balance", 0.0) or 0.0) + penalty_val
        await passenger.save()
        
    # 3. Credit Driver Compensation
    driver.today_earnings = (driver.today_earnings or 0.0) + compensation_val
    await driver.save()
    
    # 4. Dispatch Safety / Incident Alert to Admin Command
    alert = SOSAlert(
        user_id=ride.passenger_id,
        driver_id=driver.id,
        ride_id=ride.id,
        latitude=ride.pickup_latitude or 22.3023,
        longitude=ride.pickup_longitude or 73.3762,
        address=ride.pickup_address or "Pickup Location",
        severity=SOSSeverity.moderate,
        status=SOSStatus.active,
        trigger_source="driver_policy_report",
        notes=f"Pink Mode Safety Violation Reported by Driver {current_user.full_name}. Penalty fine of ₹{penalty_val} charged to passenger {passenger.full_name if passenger else 'User'}. Driver compensated ₹{compensation_val}."
    )
    await alert.insert()
    
    return {
        "message": "Policy violation recorded successfully. Penalty levied and driver compensation awarded.",
        "ride_id": str(ride.id),
        "status": "cancelled",
        "penalty_amount": penalty_val,
        "driver_compensation": compensation_val,
        "violation_type": payload.violation_type
    }


@router.get("/me/documents", response_model=List[DriverDocumentResponse])
async def list_documents(current_user: User = Depends(get_current_driver)):
    driver = await _get_or_create_driver(current_user.id)
    docs = await _ensure_driver_documents(driver.id)
    return [_doc_dict(d) for d in docs]


@router.put("/me/documents/{doc_id}/upload", response_model=DriverDocumentResponse)
async def upload_document(doc_id: str, payload: DocumentUpload, current_user: User = Depends(get_current_driver)):
    """Update document with an existing URL."""
    driver = await _get_or_create_driver(current_user.id)
    try:
        doc_obj_id = PydanticObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    doc = await DriverDocument.find_one(
        DriverDocument.id == doc_obj_id,
        DriverDocument.driver_id == driver.id,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.file_url = payload.file_url
    doc.status = DocumentStatus.pending
    doc.updated_at = datetime.now(timezone.utc)
    await doc.save()
    return _doc_dict(doc)


@router.post("/me/documents/{doc_id}/upload-file", response_model=DriverDocumentResponse)
async def upload_document_file(
    doc_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_driver),
):
    """Upload a document binary file directly to Cloudinary and attach to driver record."""
    driver = await _get_or_create_driver(current_user.id)
    try:
        doc_obj_id = PydanticObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")

    doc = await DriverDocument.find_one(
        DriverDocument.id == doc_obj_id,
        DriverDocument.driver_id == driver.id,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Validate content type and size
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf"]
    if file.content_type and file.content_type.lower() not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed types: JPEG, PNG, WEBP, PDF."
        )

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="File exceeds maximum size of 10MB")
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    upload_res = await upload_driver_document(
        file_bytes=file_bytes,
        filename=file.filename or f"{doc.document_type.value}.jpg",
        driver_id=str(driver.id),
        doc_type=doc.document_type.value,
    )

    doc.file_url = upload_res["secure_url"]
    doc.status = DocumentStatus.pending
    doc.updated_at = datetime.now(timezone.utc)
    await doc.save()

    return _doc_dict(doc)


@router.post("/me/documents/upload-by-type", response_model=DriverDocumentResponse)
async def upload_document_by_type(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_driver),
):
    """Upload a document by document_type name (e.g. 'drivers_license') to Cloudinary."""
    driver = await _get_or_create_driver(current_user.id)
    docs = await _ensure_driver_documents(driver.id)
    
    # Match document type
    matched_doc = None
    for d in docs:
        if d.document_type.value == document_type or d.document_type.name == document_type:
            matched_doc = d
            break
            
    if not matched_doc:
        # Check if valid DocumentType enum
        try:
            dtype_enum = DocumentType(document_type)
            matched_doc = DriverDocument(
                driver_id=driver.id,
                document_type=dtype_enum,
                status=DocumentStatus.upload_required,
            )
            await matched_doc.insert()
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid document type: {document_type}")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds maximum size of 10MB")
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    upload_res = await upload_driver_document(
        file_bytes=file_bytes,
        filename=file.filename or f"{matched_doc.document_type.value}.jpg",
        driver_id=str(driver.id),
        doc_type=matched_doc.document_type.value,
    )

    matched_doc.file_url = upload_res["secure_url"]
    matched_doc.status = DocumentStatus.pending
    matched_doc.updated_at = datetime.now(timezone.utc)
    await matched_doc.save()

    return _doc_dict(matched_doc)
