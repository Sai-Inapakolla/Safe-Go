from __future__ import annotations

from typing import List
from beanie import PydanticObjectId

from app.models import (
    Driver, Vehicle, DriverDocument, DriverStatus, DocumentType, DocumentStatus, User
)


async def create_driver_profile(
    user: User,
    license_number: str,
    vehicle_data: dict,
) -> Driver:
    """Create a driver profile, vehicle record, and default document slots."""
    existing = await Driver.find_one(Driver.user_id == user.id)
    if existing:
        raise ValueError("Driver profile already exists for this user")

    existing_license = await Driver.find_one(Driver.license_number == license_number)
    if existing_license:
        raise ValueError("License number already registered")

    driver = Driver(
        user_id=user.id,
        license_number=license_number,
        status=DriverStatus.pending,
        certified_modes=["normal"],
    )
    await driver.insert()

    vehicle = Vehicle(
        driver_id=driver.id,
        make=vehicle_data["make"],
        model=vehicle_data["model"],
        year=vehicle_data["year"],
        color=vehicle_data["color"],
        plate_number=vehicle_data["plate_number"],
        is_wheelchair_accessible=vehicle_data.get("is_wheelchair_accessible", False),
    )
    await vehicle.insert()

    for doc_type in DocumentType:
        doc = DriverDocument(
            driver_id=driver.id,
            document_type=doc_type,
            status=DocumentStatus.upload_required,
        )
        await doc.insert()

    return driver
