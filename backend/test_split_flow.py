import asyncio
import httpx
from app.main import app
from app.models import User, UserRole, Driver
from app.utils.security import create_access_token
from app.database import init_db

async def run_tests():
    await init_db()

    # Query existing users from DB
    user_a = await User.find_one(User.role == UserRole.passenger)
    if not user_a:
        user_a = User(email="test_a_rand@safego.test", full_name="Aarav Sharma", phone="+919111111111", role=UserRole.passenger, gender="male")
        await user_a.insert()

    user_b = await User.find_one(User.email == "pass_b@safego.test") or await User.find_one(User.phone == "+919876543299")
    if not user_b:
        user_b = User(email="test_b_rand@safego.test", full_name="Kavita Rao", phone="+919222222222", role=UserRole.passenger, gender="female")
        await user_b.insert()

    driver_user = await User.find_one(User.role == UserRole.driver)
    if not driver_user:
        driver_user = User(email="test_drv_rand@safego.test", full_name="Priya Singh", phone="+919333333333", role=UserRole.driver, gender="female")
        await driver_user.insert()

    driver_doc = await Driver.find_one(Driver.user_id == driver_user.id)
    if not driver_doc:
        driver_doc = Driver(user_id=driver_user.id, license_number="DL-TEST-9999", is_online=True, current_latitude=22.3023, current_longitude=73.3762)
        await driver_doc.insert()

    token_a = create_access_token({"sub": str(user_a.id), "role": "passenger"})
    token_b = create_access_token({"sub": str(user_b.id), "role": "passenger"})
    token_drv = create_access_token({"sub": str(driver_user.id), "role": "driver"})

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        print("\n=== STEP 1: Passenger A requests ride with SafeGo Split enabled (Fare: INR 100) ===")
        res_req = await client.post("/api/rides/request", json={
            "mode": "normal",
            "pickup_address": "A1 - Central Station",
            "pickup_latitude": 22.3023,
            "pickup_longitude": 73.3762,
            "destination_address": "A3 - IT Tech Park",
            "destination_latitude": 22.3523,
            "destination_longitude": 73.4262,
            "passenger_count": 1,
            "fare_amount": 100.0,
            "is_split_allowed": True
        }, headers={"Authorization": f"Bearer {token_a}"})

        print("Request Status:", res_req.status_code)
        assert res_req.status_code in [200, 201], res_req.text
        ride_data = res_req.json()
        ride_id = ride_data.get("_id") or ride_data.get("id")
        print(f"Created Ride: {ride_id}")
        print(f" - Original Fare: INR {ride_data.get('original_fare')}")
        print(f" - Split Allowed: {ride_data.get('is_split_allowed')}")
        print(f" - Split Status: {ride_data.get('split_status')}")

        # Set driver on ride
        from app.models import Ride
        ride_obj = await Ride.get(ride_id)
        ride_obj.driver_id = driver_doc.id
        ride_obj.status = "matched"
        await ride_obj.save()

        print("\n=== STEP 2: Passenger B finds available split cabs on corridor ===")
        res_avail = await client.get("/api/rides/split/available?latitude=22.3023&longitude=73.3762&mode=normal", headers={"Authorization": f"Bearer {token_b}"})
        print("Available Cabs Status:", res_avail.status_code)
        avail_list = res_avail.json()
        print(f"Found {len(avail_list)} available corridor cabs")
        assert len(avail_list) > 0

        print("\n=== STEP 3: Passenger B requests to join ride at Waypoint A2 ===")
        res_join = await client.post("/api/rides/split/request-join", json={
            "ride_id": ride_id,
            "passenger_name": "Kavita Rao",
            "passenger_gender": "female",
            "passenger_phone": "+91 9876543299",
            "passenger_rating": 4.95,
            "fare_amount": 80.0,
            "pickup_address": "A2 - Middle Circle Metro",
            "pickup_latitude": 22.3223,
            "pickup_longitude": 73.3962,
            "destination_address": "A3 - IT Tech Park",
            "destination_latitude": 22.3523,
            "destination_longitude": 73.4262
        }, headers={"Authorization": f"Bearer {token_b}"})
        print("Join Status:", res_join.status_code)
        assert res_join.status_code == 200
        print("Ride Split Status:", res_join.json().get("split_status"))
        assert res_join.json().get("split_status") == "pending_driver"

        print("\n=== STEP 4: Driver receives split prompt & accepts (+INR 20 Profit) ===")
        res_drv = await client.post(f"/api/rides/{ride_id}/split/driver-decision", json={
            "decision": "accept"
        }, headers={"Authorization": f"Bearer {token_drv}"})
        print("Driver Decision Status:", res_drv.status_code)
        assert res_drv.status_code == 200
        print("Ride Split Status:", res_drv.json().get("split_status"))
        assert res_drv.json().get("split_status") == "pending_passenger"

        print("\n=== STEP 5: Passenger A receives in-app consent modal & accepts (-40% Fare Discount) ===")
        res_pass = await client.post(f"/api/rides/{ride_id}/split/passenger-decision", json={
            "decision": "accept"
        }, headers={"Authorization": f"Bearer {token_a}"})
        print("Passenger Decision Status:", res_pass.status_code)
        assert res_pass.status_code == 200
        split_ride = res_pass.json()
        
        print("\n--- ECONOMICS & TRIPLE-WIN VERIFICATION ---")
        print(f"[OK] Passenger A Original Fare:   INR {split_ride.get('original_fare')}")
        print(f"[OK] Passenger A New Fare:        INR {split_ride.get('discounted_fare')} (Saved INR {split_ride.get('split_discount_amount')} - 40% OFF!)")
        print(f"[OK] Passenger B Co-Rider Fare:   INR {split_ride.get('split_co_passenger_fare')} (25% Corridor Discount!)")
        print(f"[OK] Driver Total Split Bonus:    +INR {split_ride.get('driver_split_bonus')} (Total earnings: INR 120)")
        print(f"[OK] Generated Passenger B OTP:   {split_ride.get('split_otp')}")
        print(f"[OK] Eco Savings:                 {split_ride.get('co2_saved_kg')} kg CO2 emissions prevented")

        assert split_ride.get("discounted_fare") == 60.0
        assert split_ride.get("split_discount_amount") == 40.0
        assert split_ride.get("split_co_passenger_fare") == 60.0
        assert split_ride.get("driver_split_bonus") == 20.0
        assert split_ride.get("is_split_active") is True
        assert split_ride.get("split_otp") is not None

        print("\n=== STEP 6: Driver picks up Passenger B at Waypoint A2 & verifies Split OTP ===")
        co_otp = split_ride.get("split_otp")
        res_otp = await client.post(f"/api/rides/{ride_id}/split/verify-co-otp", json={
            "otp": co_otp
        }, headers={"Authorization": f"Bearer {token_drv}"})
        print("OTP Verification Status:", res_otp.status_code)
        assert res_otp.status_code == 200
        assert res_otp.json().get("is_split_otp_verified") is True
        print(f"[OK] Co-Rider Boarding PIN {co_otp} verified! Both passengers safely aboard.")

        print("\n*** ALL 6 STEPS OF SAFECO SPLIT COMPLETED WITH 100% SUCCESS! ***")

if __name__ == "__main__":
    asyncio.run(run_tests())
