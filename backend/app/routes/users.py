from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.models import User, EmergencyContact, Notification, Gender, RideMode, Ride
from app.schemas import (
    UserResponse,
    UserUpdate,
    EmergencyContactCreate,
    EmergencyContactUpdate,
    EmergencyContactResponse,
    NotificationResponse,
    PayPenaltyRequest,
    PayPenaltyResponse,
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
        try:
            current_user.gender = Gender(payload.gender) if isinstance(payload.gender, str) else payload.gender
        except Exception:
            current_user.gender = payload.gender  # type: ignore
    if payload.age is not None:
        current_user.age = payload.age
    if payload.preferred_mode is not None:
        try:
            current_user.preferred_mode = RideMode(payload.preferred_mode) if isinstance(payload.preferred_mode, str) else payload.preferred_mode
        except Exception:
            current_user.preferred_mode = payload.preferred_mode  # type: ignore
    if payload.is_elder is not None:
        current_user.is_elder = payload.is_elder
    if payload.has_disability is not None:
        current_user.has_disability = payload.has_disability

    await current_user.save()
    return _user_to_response(current_user)


@router.post("/pay-penalty", response_model=PayPenaltyResponse)
async def pay_user_penalty(
    payload: PayPenaltyRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Settles user's outstanding fine/penalty, resets penalty balance,
    and updates associated violation rides to paid status.
    """
    current_balance = getattr(current_user, "penalty_balance", 0.0) or 0.0
    txn_id = payload.transaction_id or f"TXN_FINE_{int(datetime.now().timestamp())}"
    
    if current_balance <= 0:
        return PayPenaltyResponse(
            message="No outstanding penalty on this account.",
            amount_paid=0.0,
            remaining_penalty_balance=0.0,
            transaction_id=txn_id,
            status="already_cleared",
        )

    pay_amount = payload.amount if (payload.amount is not None and payload.amount > 0) else current_balance
    new_balance = max(0.0, current_balance - pay_amount)
    current_user.penalty_balance = new_balance
    await current_user.save()

    # Mark user's rides with penalty as paid if fully cleared
    if new_balance == 0.0:
        try:
            rides_with_penalty = await Ride.find(
                Ride.passenger_id == current_user.id,
                Ride.is_penalty_applied == True,
            ).to_list()
            now = datetime.now(timezone.utc)
            for r in rides_with_penalty:
                r.is_penalty_paid = True
                r.penalty_paid_at = now
                await r.save()
        except Exception:
            pass

    # Create confirmation notification for user
    try:
        notif = Notification(
            user_id=current_user.id,
            title="Policy Fine Settled Successfully",
            message=f"Your outstanding penalty fine of ₹{pay_amount:.2f} has been settled via {payload.payment_method or 'SafeGo Pay'}. Ride booking privileges have been restored.",
            type="penalty_cleared",
            is_read=False,
            data={
                "amount_paid": pay_amount,
                "transaction_id": txn_id,
                "payment_method": payload.payment_method or "upi",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )
        await notif.insert()
    except Exception:
        pass

    return PayPenaltyResponse(
        message="Penalty settled successfully. Ride booking is now unlocked.",
        amount_paid=pay_amount,
        remaining_penalty_balance=new_balance,
        transaction_id=txn_id,
        status="paid_and_unlocked",
    )


# ==================== EMERGENCY CONTACTS ====================

@router.get("/me/emergency-contacts", response_model=List[EmergencyContactResponse])
async def list_emergency_contacts(
    current_user: User = Depends(get_current_user),
):
    contacts = await EmergencyContact.find(
        EmergencyContact.user_id == current_user.id
    ).sort("-is_primary").to_list()
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
    ).sort("-created_at").limit(50).to_list()
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
        "age": getattr(user, "age", None),
        "profile_photo": user.profile_photo,
        "is_elder": getattr(user, "is_elder", False),
        "has_disability": getattr(user, "has_disability", False),
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "penalty_balance": getattr(user, "penalty_balance", 0.0),
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
