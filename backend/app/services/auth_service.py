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
    """
    uid = firebase_token.get("uid")
    email = firebase_token.get("email")
    name = firebase_token.get("name", "Firebase User")
    
    # 1. Try finding by firebase_uid
    user = await User.find_one(User.firebase_uid == uid)
    if user:
        if role and user.role.value != role:
            user.role = UserRole(role)
            await user.save()
        return user
    
    # 2. Try finding by email (in case user existed before Firebase migration)
    user = await User.find_one(User.email == email)
    if user:
        user.firebase_uid = uid
        # Optional: Sync role if explicitly provided during a new login
        if role and user.role.value != role:
            user.role = UserRole(role)
        await user.save()
        return user
    
    # 3. Create new user
    print(f"[AUTH] Creating new user for {email} (UID: {uid}, Role: {role})")
    try:
        user = User(
            full_name=name,
            email=email,
            phone=firebase_token.get("phone_number", f"fb-{uid[:10]}"), 
            firebase_uid=uid,
            role=UserRole(role) if role else UserRole.passenger,
            is_verified=True 
        )
        await user.insert()
        return user
    except Exception as e:
        print(f"[AUTH] Error creating user: {e}")
        raise
