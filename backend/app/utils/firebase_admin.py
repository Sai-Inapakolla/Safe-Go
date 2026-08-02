from __future__ import annotations

import os
import logging

from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

security = HTTPBearer()

_firebase_initialized = False


def _get_firebase_auth():
    """Lazily initialize Firebase Admin SDK only when first needed."""
    global _firebase_initialized
    import firebase_admin
    from firebase_admin import credentials, auth

    if not _firebase_initialized and not firebase_admin._apps:
        service_account_path = os.getenv(
            "FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json"
        )
        try:
            abs_path = os.path.abspath(service_account_path)
            print(f"[FIREBASE] Initializing with: {abs_path}")
            cred = credentials.Certificate(abs_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            print("[FIREBASE] Initialized successfully.")
        except Exception as e:
            print(f"[FIREBASE] Initialization Error: {e}")
            raise RuntimeError(f"Firebase Admin SDK failed to initialize: {e}")
    elif firebase_admin._apps:
        _firebase_initialized = True

    return auth


async def verify_firebase_token(
    auth_cred: HTTPAuthorizationCredentials = Security(security),
):
    """Verifies a Firebase ID token and returns the decoded token."""
    token = auth_cred.credentials
    
    # 1. High-speed local decoding for development/testing
    if os.getenv("FIREBASE_FAST_DEV_MODE", "true").lower() == "true":
        try:
            from jose import jwt
            decoded_token = jwt.get_unverified_claims(token)
            if decoded_token:
                # Map Firebase JWT claim 'sub' to 'uid' for backend compatibility
                if "uid" not in decoded_token and "sub" in decoded_token:
                    decoded_token["uid"] = decoded_token["sub"]
                # Map display name if present
                if "name" not in decoded_token and "display_name" in decoded_token:
                    decoded_token["name"] = decoded_token["display_name"]
                print(f"[FIREBASE FAST PATH] Locally decoded unverified claims for: {decoded_token.get('email')}")
                return decoded_token
        except Exception as ex:
            print(f"[FIREBASE FAST PATH] Failed to decode unverified claims: {ex}")

    # 2. Standard verification (production path or fallback)
    try:
        auth = _get_firebase_auth()
        decoded_token = auth.verify_id_token(token, clock_skew_seconds=10)
        print(f"[FIREBASE] Token verified for: {decoded_token.get('email')}")
        return decoded_token
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Firebase service unavailable: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"[FIREBASE] Token Verification Failed: {e}")
        raise HTTPException(
            status_code=401,
            detail=f"Invalid or expired Firebase token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
