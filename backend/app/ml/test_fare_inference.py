import sys
import os

# Adjust sys.path so we can run this directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.ml.train_fare import train_and_save_surge_model
from app.ml.fare_predictor import FareSurgePredictor

def run_fare_ml_verification():
    print("====================================================")
    print("STARTING DYNAMIC FARE SURGE ML PREDICTOR VERIFICATION")
    print("====================================================")
    
    # 1. Run the training script to generate the model & scaler files
    print("\n[Step 1] Running ML Regression Training Pipeline...")
    train_and_save_model = train_and_save_surge_model()
    
    # 2. Re-instantiate or force reload of the FareSurgePredictor
    print("\n[Step 2] Reloading FareSurgePredictor with the newly trained model...")
    predictor = FareSurgePredictor()
    loaded = predictor.load_model()
    assert loaded is True, "Error: FareSurgePredictor failed to load the newly trained model."
    assert predictor.is_ready is True, "Error: Predictor should be ready."
    
    # 3. Define target pricing scenarios
    test_cases = [
        {
            "description": "Standard Daytime Weekday Ride (Tuesday 2 PM, Downtown -> No Surge)",
            "pickup_hour": 14,
            "day_of_week": 1,
            "distance_km": 4.5,
            "passenger_count": 1,
            "mode": "normal",
            "ai_safety_prediction": "Stable",
            "expected_surge_range": (1.0, 1.05)
        },
        {
            "description": "Late-Night Weekend Outskirts Ride (Saturday 1 AM, Outskirt -> Significant Surge)",
            "pickup_hour": 1,
            "day_of_week": 5,
            "distance_km": 12.0,
            "passenger_count": 1,
            "mode": "normal",
            "ai_safety_prediction": "Cautious",
            "expected_surge_range": (1.3, 1.8)
        },
        {
            "description": "Weekday Evening Rush Hour (Friday 6 PM, Downtown -> Moderate Surge)",
            "pickup_hour": 18,
            "day_of_week": 4,
            "distance_km": 5.2,
            "passenger_count": 1,
            "mode": "normal",
            "ai_safety_prediction": "Stable",
            "expected_surge_range": (1.3, 1.8)
        },
        {
            "description": "Accessibility Passenger Night Ride (Wednesday 11 PM, PWD Mode -> Strictly Capped at 1.0x)",
            "pickup_hour": 23,
            "day_of_week": 2,
            "distance_km": 8.0,
            "passenger_count": 1,
            "mode": "pwd",
            "ai_safety_prediction": "High Priority",
            "expected_surge_range": (1.0, 1.0)
        }
    ]
    
    print("\n[Step 3] Running Real-Time Fare Surge Inference Test Cases:")
    for idx, case in enumerate(test_cases, 1):
        print(f"\n--- Test Case #{idx}: {case['description']} ---")
        pred_surge, confidence = predictor.predict_surge(
            pickup_hour=case["pickup_hour"],
            day_of_week=case["day_of_week"],
            distance_km=case["distance_km"],
            passenger_count=case["passenger_count"],
            mode=case["mode"],
            ai_safety_prediction=case["ai_safety_prediction"]
        )
        print(f"-> Predicted Surge Multiplier: {pred_surge:.2f}x")
        print(f"-> Model Confidence Score: {confidence:.4f}")
        
        # Verify range constraints
        min_expected, max_expected = case["expected_surge_range"]
        assert min_expected <= pred_surge <= max_expected, (
            f"Error: Test case #{idx} surge {pred_surge}x was out of expected range "
            f"[{min_expected}x, {max_expected}x]"
        )
        
    print("\n====================================================")
    print("DYNAMIC FARE SURGE ML PREDICTOR VERIFICATION PASSED!")
    print("====================================================")

if __name__ == "__main__":
    run_fare_ml_verification()
