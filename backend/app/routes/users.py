from __future__ import annotations

from typing import List

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.models import User, EmergencyContact, Notification
from app.schemas import (
    UserResponse,
    UserUpdate,
    EmergencyContactCreate,
    EmergencyContactUpdate,
    EmergencyContactResponse,
    NotificationResponse,
)
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return _user_to_response(current_user)


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.gender is not None:
        current_user.gender = payload.gender
    if payload.preferred_mode is not None:
        current_user.preferred_mode = payload.preferred_mode

    await current_user.save()
    return _user_to_response(current_user)


# ==================== EMERGENCY CONTACTS ====================

@router.get("/me/emergency-contacts", response_model=List[EmergencyContactResponse])
async def list_emergency_contacts(
    current_user: User = Depends(get_current_user),
):
    contacts = await EmergencyContact.find(
        EmergencyContact.user_id == current_user.id
    ).sort(-EmergencyContact.is_primary).to_list()
    return [_ec_to_response(c) for c in contacts]


@router.post("/me/emergency-contacts", response_model=EmergencyContactResponse, status_code=201)
async def add_emergency_contact(
    payload: EmergencyContactCreate,
    current_user: User = Depends(get_current_user),
):
    contact = EmergencyContact(
        user_id=current_user.id,
        name=payload.name,
        phone=payload.phone,
        contact_relationship=payload.relationship,
        is_primary=payload.is_primary,
    )
    await contact.insert()
    return _ec_to_response(contact)


@router.put("/me/emergency-contacts/{contact_id}", response_model=EmergencyContactResponse)
async def update_emergency_contact(
    contact_id: str,
    payload: EmergencyContactUpdate,
    current_user: User = Depends(get_current_user),
):
    contact = await EmergencyContact.find_one(
        EmergencyContact.id == PydanticObjectId(contact_id),
        EmergencyContact.user_id == current_user.id,
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Emergency contact not found")

    if payload.name is not None:
        contact.name = payload.name
    if payload.phone is not None:
        contact.phone = payload.phone
    if payload.relationship is not None:
        contact.contact_relationship = payload.relationship
    if payload.is_primary is not None:
        contact.is_primary = payload.is_primary

    await contact.save()
    return _ec_to_response(contact)


@router.delete("/me/emergency-contacts/{contact_id}", status_code=204)
async def delete_emergency_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
):
    contact = await EmergencyContact.find_one(
        EmergencyContact.id == PydanticObjectId(contact_id),
        EmergencyContact.user_id == current_user.id,
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Emergency contact not found")

    await contact.delete()
    return None


# ==================== NOTIFICATIONS ====================

@router.get("/me/notifications", response_model=List[NotificationResponse])
async def list_notifications(
    current_user: User = Depends(get_current_user),
):
    notifs = await Notification.find(
        Notification.user_id == current_user.id
    ).sort(-Notification.created_at).limit(50).to_list()
    return [_notif_to_response(n) for n in notifs]


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(current_user: User = Depends(get_current_user)):
    from app.models import Driver, Vehicle, DriverDocument, Ride, Rating, SOSAlert
    
    # Check for driver profile
    driver = await Driver.find_one(Driver.user_id == current_user.id)
    if driver:
        # Delete vehicle & documents
        await Vehicle.find(Vehicle.driver_id == driver.id).delete()
        await DriverDocument.find(DriverDocument.driver_id == driver.id).delete()
        
        # Delete rides assigned to the driver
        await Ride.find(Ride.driver_id == driver.id).delete()
        
        # Delete ratings for the driver
        await Rating.find(Rating.driver_id == driver.id).delete()
        
        # Delete driver profile
        await driver.delete()

    # Delete rides requested by passenger
    await Ride.find(Ride.passenger_id == current_user.id).delete()

    # Delete ratings rated by the user
    await Rating.find(Rating.rater_id == current_user.id).delete()

    # Delete SOS alerts
    await SOSAlert.find(SOSAlert.user_id == current_user.id).delete()

    # Delete emergency contacts
    await EmergencyContact.find(EmergencyContact.user_id == current_user.id).delete()

    # Delete notifications
    await Notification.find(Notification.user_id == current_user.id).delete()

    # Finally delete the user document
    await current_user.delete()
    return None


# ---------- Helpers ----------

def _user_to_response(user: User) -> dict:
    return {
        "_id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "preferred_mode": user.preferred_mode.value if user.preferred_mode and hasattr(user.preferred_mode, "value") else user.preferred_mode,
        "gender": user.gender.value if user.gender and hasattr(user.gender, "value") else user.gender,
        "profile_photo": user.profile_photo,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def _ec_to_response(c: EmergencyContact) -> dict:
    return {
        "_id": str(c.id),
        "user_id": str(c.user_id),
        "name": c.name,
        "phone": c.phone,
        "contact_relationship": c.contact_relationship,
        "is_primary": c.is_primary,
        "created_at": c.created_at,
    }


def _notif_to_response(n: Notification) -> dict:
    return {
        "_id": str(n.id),
        "user_id": str(n.user_id),
        "title": n.title,
        "message": n.message,
        "type": n.type,
        "is_read": n.is_read,
        "data": n.data,
        "created_at": n.created_at,
    }
