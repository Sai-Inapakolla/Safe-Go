from __future__ import annotations

import io
import os
import uuid
import asyncio
from typing import Optional, Dict, Any

import cloudinary
import cloudinary.uploader
from app.config import settings


def _init_cloudinary():
    """Configure Cloudinary using environment variables or settings."""
    if settings.CLOUDINARY_URL:
        # cloudinary parses CLOUDINARY_URL automatically if set in env,
        # but we also set it explicitly here if provided in settings.
        os.environ["CLOUDINARY_URL"] = settings.CLOUDINARY_URL
    elif settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )


_init_cloudinary()


def is_cloudinary_configured() -> bool:
    """Check if valid Cloudinary credentials are provided."""
    if os.environ.get("CLOUDINARY_URL"):
        return True
    return bool(
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    )


async def upload_driver_document(
    file_bytes: bytes,
    filename: str,
    driver_id: str,
    doc_type: str,
) -> Dict[str, Any]:
    """
    Upload a driver verification document (License, ID, Vehicle Registration, NBI, etc.)
    to Cloudinary under a structured folder path: `safego/driver_documents/{driver_id}/`.
    
    Returns a dictionary containing secure_url, public_id, format, and bytes.
    """
    _init_cloudinary()
    
    # Generate clean unique public ID
    unique_suffix = uuid.uuid4().hex[:8]
    public_id = f"{doc_type}_{unique_suffix}"
    folder_path = f"{settings.CLOUDINARY_FOLDER.rstrip('/')}/{driver_id}"

    if is_cloudinary_configured():
        def _upload():
            return cloudinary.uploader.upload(
                file_bytes,
                folder=folder_path,
                public_id=public_id,
                resource_type="auto",
                overwrite=True,
                tags=["safego", "driver_document", doc_type, driver_id],
            )

        # Run synchronous upload in thread pool to avoid blocking the event loop
        result = await asyncio.to_thread(_upload)
        return {
            "secure_url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "format": result.get("format"),
            "bytes": result.get("bytes", len(file_bytes)),
            "is_mock": False,
        }
    else:
        # Fallback for local development/testing when Cloudinary credentials are empty
        ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
        simulated_url = f"https://res.cloudinary.com/safego-demo/image/upload/v1700000000/{folder_path}/{public_id}.{ext}"
        print(
            f"[CLOUDINARY MOCK] Cloudinary credentials not configured. "
            f"Simulating upload for driver {driver_id}, doc {doc_type} -> {simulated_url}"
        )
        return {
            "secure_url": simulated_url,
            "public_id": f"{folder_path}/{public_id}",
            "format": ext,
            "bytes": len(file_bytes),
            "is_mock": True,
        }


async def delete_driver_document(public_id: str) -> bool:
    """Delete a document from Cloudinary by its public_id."""
    if not is_cloudinary_configured() or not public_id:
        return True

    def _delete():
        return cloudinary.uploader.destroy(public_id)

    try:
        res = await asyncio.to_thread(_delete)
        return res.get("result") in ("ok", "not found")
    except Exception as e:
        print(f"[CLOUDINARY ERROR] Failed to delete {public_id}: {e}")
        return False
