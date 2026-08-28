import asyncio
import os
import sys
import io
import unittest
from dotenv import find_dotenv, load_dotenv

# Load environment (supports root and backend locations)
load_dotenv(dotenv_path=find_dotenv(usecwd=True))
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.services.cloudinary_service import (
    is_cloudinary_configured,
    upload_driver_document,
    delete_driver_document,
)
from app.models import DocumentType, DocumentStatus
from app.main import app
from fastapi.testclient import TestClient


class TestCloudinaryDriverDocs(unittest.TestCase):
    def test_cloudinary_service_fallback(self):
        """Test that Cloudinary upload service returns a valid URL structure."""
        test_file_bytes = b"fake-driver-license-image-content-bytes"
        result = asyncio.run(
            upload_driver_document(
                file_bytes=test_file_bytes,
                filename="drivers_license.jpg",
                driver_id="test_driver_123",
                doc_type="drivers_license",
            )
        )
        self.assertIn("secure_url", result)
        self.assertIn("public_id", result)
        self.assertTrue(result["secure_url"].startswith("http"))
        self.assertIn("drivers_license", result["secure_url"])
        self.assertEqual(result["bytes"], len(test_file_bytes))

    def test_delete_driver_document(self):
        """Test deletion helper."""
        res = asyncio.run(delete_driver_document("safego/driver_documents/test/sample_public_id"))
        self.assertTrue(res)

    def test_document_enums(self):
        """Ensure DocumentType and DocumentStatus contain required options."""
        self.assertIn("drivers_license", [d.value for d in DocumentType])
        self.assertIn("vehicle_registration", [d.value for d in DocumentType])
        self.assertIn("nbi_clearance", [d.value for d in DocumentType])
        self.assertIn("national_id", [d.value for d in DocumentType])
        self.assertIn("vehicle_insurance", [d.value for d in DocumentType])
        self.assertIn("medical_certificate", [d.value for d in DocumentType])

        self.assertIn("pending", [s.value for s in DocumentStatus])
        self.assertIn("verified", [s.value for s in DocumentStatus])
        self.assertIn("rejected", [s.value for s in DocumentStatus])
        self.assertIn("upload_required", [s.value for s in DocumentStatus])


if __name__ == "__main__":
    unittest.main()
