import os
import sys
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth

# Load environment variables
load_dotenv()

def seed_firebase_admin():
    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json")
    if not os.path.exists(service_account_path):
        print(f"[ERROR] Service account file not found: {service_account_path}")
        sys.exit(1)
        
    print(f"[INFO] Initializing Firebase Admin SDK with credentials from: {service_account_path}")
    try:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"[ERROR] Failed to initialize Firebase: {e}")
        sys.exit(1)
        
    admin_email = os.getenv("ADMIN_EMAIL", "admin@safego.ph")
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin@SafeGo2025")
    
    print(f"[INFO] Checking if admin user '{admin_email}' exists in Firebase Auth...")
    try:
        user = auth.get_user_by_email(admin_email)
        print(f"[INFO] Admin user '{admin_email}' already exists in Firebase Auth (UID: {user.uid}).")
        # Update password and display name just in case
        auth.update_user(
            user.uid,
            password=admin_password,
            display_name="SafeGo Admin",
            email_verified=True
        )
        print("[SUCCESS] Admin user updated successfully.")
    except auth.UserNotFoundError:
        print(f"[INFO] Admin user '{admin_email}' not found. Creating a new user...")
        try:
            user = auth.create_user(
                email=admin_email,
                password=admin_password,
                display_name="SafeGo Admin",
                email_verified=True
            )
            print(f"[SUCCESS] Admin user '{admin_email}' created successfully in Firebase Auth with UID: {user.uid}")
        except Exception as e:
            print(f"[ERROR] Failed to create admin user in Firebase: {e}")
            sys.exit(1)
    except Exception as e:
        print(f"[ERROR] An unexpected error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    seed_firebase_admin()
