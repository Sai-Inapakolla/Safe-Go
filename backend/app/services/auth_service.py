from app.models import User, UserRole
from app.utils.security import hash_password, verify_password, create_access_token
from typing import Optional, Any


async def register_user(
    full_name: str,
    email: str,
    phone: str,
    password: str,
    role: str = "passenger",
    gender: str = "male",
    is_elder: bool = False,
) -> User:
    """Create a new user in the database."""
    existing_email = await User.find_one(User.email == email)
    if existing_email:
        raise ValueError("Email already registered")

    existing_phone = await User.find_one(User.phone == phone)
    if existing_phone:
        raise ValueError("Phone number already registered")

    user = User(
        full_name=full_name,
        email=email,
        phone=phone,
        hashed_password=hash_password(password),
        role=UserRole(role),
        gender=gender,
        is_elder=is_elder,
    )
    await user.insert()
    return user


async def authenticate_user(email: str, password: str) -> User | None:
    """Verify email+password and return the user or None."""
    user = await User.find_one(User.email == email)
    if user is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_token_for_user(user: User) -> str:
    """Create a JWT access token for the given user."""
    return create_access_token(
        data={"sub": str(user.id), "role": user.role.value if hasattr(user.role, 'value') else user.role}
    )


async def get_or_create_firebase_user(firebase_token: dict, role: str = "passenger") -> User:
    """
    Finds a user by Firebase UID or email, or creates a new one.
    Links the user to the Firebase identity and respects the chosen role.
    Handles Google sign-in users where phone_number may be None.
    """
    uid = str(firebase_token.get("uid") or firebase_token.get("sub") or "")
    email = firebase_token.get("email")
    if not email:
        email = f"user_{uid[:12]}@safego.ph" if uid else "user@safego.ph"
        
    name = firebase_token.get("name") or firebase_token.get("display_name") or email.split("@")[0] or "Firebase User"
    
    # 1. Try finding by firebase_uid
    if uid:
        user = await User.find_one(User.firebase_uid == uid)
        if user:
            if role:
                try:
                    target_role = UserRole(role)
                    if user.role != target_role:
                        user.role = target_role
                        await user.save()
                except Exception:
                    pass
            return user
    
    # 2. Try finding by email (in case user existed before Firebase migration)
    user = await User.find_one(User.email == email)
    if user:
        if uid and not user.firebase_uid:
            user.firebase_uid = uid
        if role:
            try:
                target_role = UserRole(role)
                if user.role != target_role:
                    user.role = target_role
            except Exception:
                pass
        await user.save()
        return user
    
    # 3. Create new user
    print(f"[AUTH] Creating new user for {email} (UID: {uid}, Role: {role})")
    
    # Compute safe unique phone placeholder if phone is not provided by provider (e.g. Google auth)
    raw_phone = firebase_token.get("phone_number")
    if raw_phone and isinstance(raw_phone, str) and raw_phone.strip():
        phone_val = raw_phone.strip()
    else:
        phone_seed = abs(hash(f"{uid}_{email}")) % 9000000000 + 1000000000
        phone_val = f"+91{phone_seed}"
        # Ensure no collision in database
        existing_phone = await User.find_one(User.phone == phone_val)
        if existing_phone:
            import uuid
            phone_val = f"+91{abs(hash(uuid.uuid4().hex)) % 9000000000 + 1000000000}"

    user_role = UserRole.passenger
    if role:
        try:
            user_role = UserRole(role)
        except Exception:
            user_role = UserRole.passenger

    try:
        user = User(
            full_name=name,
            email=email,
            phone=phone_val,
            firebase_uid=uid if uid else None,
            role=user_role,
            is_verified=True
        )
        await user.insert()
        return user
    except Exception as e:
        print(f"[AUTH] Error creating user: {e}")
        raise

