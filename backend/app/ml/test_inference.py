import sys
import os

# Adjust sys.path so we can run this directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.ml.train import train_and_save_model
from app.ml.predictor import SafetyPredictor

def run_ml_verification():
    print("====================================================")
    print("STARTING LOCATION-AWARE ML SAFETY PREDICTOR VERIFICATION")
    print("====================================================")
    
    # 1. Run the training script to generate the model & scaler files
    print("\n[Step 1] Running ML Training Pipeline...")
    train_and_save_model()
    
    # 2. Re-instantiate or force reload of the SafetyPredictor
    print("\n[Step 2] Reloading SafetyPredictor with the newly trained model...")
    predictor = SafetyPredictor()
    loaded = predictor.load_model()
    assert loaded is True, "Error: SafetyPredictor failed to load the newly trained model."
    assert predictor.is_ready is True, "Error: Predictor should be ready."
    
    # 3. Define location-aware test cases representing real-world situations
    test_cases = [
        {
            "description": "Standard Daytime City-Center Ride (Tuesday 2 PM, Downtown -> Stable)",
            "pickup_hour": 14,
            "day_of_week": 1,
            "distance_km": 3.2,
            "passenger_count": 1,
            "mode": "normal",
            # Downtown Vadodara Station Area (Safe Hub Center)
            "pickup_lat": 22.308,
            "pickup_lng": 73.185,
            "dest_lat": 22.320,
            "dest_lng": 73.200
        },
        {
            "description": "Late-Night Suburban Ring-Road Ride (Saturday 1 AM, Outskirts -> Cautious)",
            "pickup_hour": 1,
            "day_of_week": 5,
            "distance_km": 9.5,
            "passenger_count": 1,
            "mode": "normal",
            # Starts in the NW Outskirts / Ring road bypass area (High-Risk Zone)
            "pickup_lat": 22.356,
            "pickup_lng": 73.116,
            "dest_lat": 22.308,
            "dest_lng": 73.185
        },
        {
            "description": "Accessibility Passenger Ride (Wednesday 10 AM, PWD -> High Priority)",
            "pickup_hour": 10,
            "day_of_week": 2,
            "distance_km": 4.1,
            "passenger_count": 1,
            "mode": "pwd",
            "pickup_lat": 22.308,
            "pickup_lng": 73.185,
            "dest_lat": 22.330,
            "dest_lng": 73.160
        },
        {
            "description": "Evening Outskirts Women Safety Ride (Friday 8 PM, Industrial Fringe -> High Priority)",
            "pickup_hour": 20,
            "day_of_week": 4,
            "distance_km": 11.2,
            "passenger_count": 1,
            "mode": "pink",
            # Starts in the SE Industrial outskirt hotspot
            "pickup_lat": 22.253,
            "pickup_lng": 73.254,
            "dest_lat": 22.308,
            "dest_lng": 73.185
        }
    ]
    
    print("\n[Step 3] Running Real-Time Inference Test Cases:")
    for idx, case in enumerate(test_cases, 1):
        print(f"\n--- Test Case #{idx}: {case['description']} ---")
        pred_label, confidence = predictor.predict_safety(
            pickup_hour=case["pickup_hour"],
            day_of_week=case["day_of_week"],
            distance_km=case["distance_km"],
            passenger_count=case["passenger_count"],
            mode=case["mode"],
            pickup_lat=case["pickup_lat"],
            pickup_lng=case["pickup_lng"],
            dest_lat=case["dest_lat"],
            dest_lng=case["dest_lng"]
        )
        print(f"-> Input Coordinate: ({case['pickup_lat']}, {case['pickup_lng']})")
        print(f"-> Predicted Safety Category: {pred_label}")
        print(f"-> Model Confidence: {confidence:.4f}")
        
    print("\n====================================================")
    print("LOCATION-AWARE ML SAFETY PREDICTOR VERIFICATION PASSED!")
    print("====================================================")

if __name__ == "__main__":
    run_ml_verification()
