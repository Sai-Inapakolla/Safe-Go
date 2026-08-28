from __future__ import annotations
from typing import Optional

from beanie import PydanticObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.models import User, UserRole
from app.utils.security import decode_access_token
from app.utils.firebase_admin import verify_firebase_token

security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> User:
    token = credentials.credentials

    # 1. Development Shortcut & Role Fallbacks: Allow dummy & safego tokens
    if token in ["admin-dummy-token", "safego-demo-admin"] or token.startswith("safego_token_") or token.startswith("safego_admin_"):
        user = await User.find_one(User.role == UserRole.admin)
        if user:
            return user
    if token in ["driver-dummy-token", "safego-demo-driver"] or token.startswith("safego_driver_"):
        user = await User.find_one(User.role == UserRole.driver)
        if user:
            return user
    if token in ["google-dummy-token", "dummy-token"]:
        user = await User.find_one()
        if user:
            return user
        raise HTTPException(status_code=404, detail="No users in database to use as dummy")

    # 2. Try Local JWT Verification (Speed Optimization)
    payload = decode_access_token(token)
    if payload:
        user_id = payload.get("sub")
        if user_id:
            user = await User.get(PydanticObjectId(user_id))
            if user:
                if not user.is_active:
                    raise HTTPException(status_code=403, detail="Account is deactivated")
                return user

    # 3. Try Firebase Token Verification (Fallback/New Logins)
    try:
        from app.utils.firebase_admin import verify_firebase_token
        decoded_token = await verify_firebase_token(credentials)
        uid = decoded_token.get("uid")
        
        # Find user by firebase_uid
        user = await User.find_one(User.firebase_uid == uid)
        if user is None:
            # Check by email
            email = decoded_token.get("email")
            user = await User.find_one(User.email == email)
            if user:
                user.firebase_uid = uid
                await user.save()
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found in local database. Please complete registration.",
                )
        
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is deactivated")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )


async def get_current_passenger(user: User = Depends(get_current_user)) -> User:
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role_val not in (UserRole.passenger.value, UserRole.admin.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to passengers and administrators"
        )
    return user


async def get_current_driver(user: User = Depends(get_current_user)) -> User:
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role_val not in (UserRole.driver.value, UserRole.admin.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to registered drivers and administrators"
        )
    return user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role_val != UserRole.admin.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required"
        )
    return user



optional_security = HTTPBearer(auto_error=False)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except Exception:
        return None
