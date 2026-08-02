import os
import joblib
import numpy as np
import pandas as pd
import warnings
from datetime import datetime
from typing import Tuple

# Suppress all sklearn UserWarnings about feature names to keep console clean and fast
warnings.filterwarnings("ignore", category=UserWarning)

# Geographical Constants
SAFE_HUB_LAT = 22.308
SAFE_HUB_LNG = 73.185

RISK_HOTSPOT_1 = (22.355, 73.115)
RISK_HOTSPOT_2 = (22.251, 73.255)

def calculate_haversine_single(lat1, lon1, lat2, lon2) -> float:
    """Helper to calculate distance in km between two coordinate pairs."""
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    
    a = (np.sin(dlat / 2.0) ** 2.0 + 
         np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2.0) ** 2.0)
    c = 2.0 * np.arcsin(np.sqrt(a)) 
    r = 6371.0 # Earth radius in km
    return float(r * c)

class SafetyPredictor:
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SafetyPredictor, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance
        
    def __init__(self):
        if self._initialized:
            return
            
        ml_dir = os.path.dirname(os.path.abspath(__file__))
        saved_models_dir = os.path.join(ml_dir, "saved_models")
        self.model_path = os.path.join(saved_models_dir, "safety_rf_model.joblib")
        self.scaler_path = os.path.join(saved_models_dir, "safety_scaler.joblib")
        
        self.model = None
        self.scaler = None
        self.is_ready = False
        
        self.load_model()
        self._initialized = True
        
    def load_model(self) -> bool:
        """Load model and scaler from files."""
        if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
            try:
                print(f"[Geographical SafetyPredictor] Loading model from {self.model_path}...")
                self.model = joblib.load(self.model_path)
                # CRITICAL PERFORMANCE OPTIMIZATION: Set n_jobs = 1 for fast single-sample real-time inference
                if hasattr(self.model, "n_jobs"):
                    self.model.n_jobs = 1
                print(f"[Geographical SafetyPredictor] Loading scaler from {self.scaler_path}...")
                self.scaler = joblib.load(self.scaler_path)
                self.is_ready = True
                print("[Geographical SafetyPredictor] Location-aware model loaded and active.")
                return True
            except Exception as e:
                print(f"[Geographical SafetyPredictor Warning] Failed to load ML model: {e}")
                self.is_ready = False
                return False
        else:
            print("[Geographical SafetyPredictor Warning] Model files not found. Inference will fall back to rule-based logic.")
            self.is_ready = False
            return False

    def _map_mode(self, mode: str) -> int:
        """Map mode string to integer identifier."""
        mapping = {
            "normal": 0,
            "pink": 1,
            "pwd": 2,
            "elderly": 3
        }
        return mapping.get(mode.lower(), 0)

    def _get_safety_label(self, class_id: int) -> str:
        """Map integer class to label string."""
        mapping = {
            0: "Stable",
            1: "Cautious",
            2: "High Priority"
        }
        return mapping.get(class_id, "Stable")

    def _fallback_rule_logic(self, pickup_hour: int, hub_dist: float, hotspot_dist: float, mode: str) -> str:
        """Deterministic safety prediction fallback using spatial constraints."""
        if mode in ["pwd", "elderly"]:
            return "High Priority"
        if (22 <= pickup_hour or pickup_hour <= 4) and (hub_dist > 6.5 or hotspot_dist < 2.5):
            return "High Priority" if mode == "pink" else "Cautious"
        if 22 <= pickup_hour or pickup_hour <= 4:
            return "Cautious"
        if mode == "pink" and (18 <= pickup_hour <= 22) and (hub_dist > 5.0 or hotspot_dist < 3.0):
            return "High Priority"
        return "Stable"

    def predict_safety(
        self,
        pickup_hour: int,
        day_of_week: int,
        distance_km: float,
        passenger_count: int,
        mode: str,
        pickup_lat: float,
        pickup_lng: float,
        dest_lat: float,
        dest_lng: float
    ) -> Tuple[str, float]:
        """
        Predict geographical route safety category and model confidence.
        Returns: Tuple of (safety_prediction: str, confidence_score: float)
        """
        # Calculate dynamic geographical features on the fly
        pickup_dist_to_safe_hub = calculate_haversine_single(pickup_lat, pickup_lng, SAFE_HUB_LAT, SAFE_HUB_LNG)
        dest_dist_to_safe_hub = calculate_haversine_single(dest_lat, dest_lng, SAFE_HUB_LAT, SAFE_HUB_LNG)
        
        dist_to_hotspot_1 = calculate_haversine_single(pickup_lat, pickup_lng, RISK_HOTSPOT_1[0], RISK_HOTSPOT_1[1])
        dist_to_hotspot_2 = calculate_haversine_single(pickup_lat, pickup_lng, RISK_HOTSPOT_2[0], RISK_HOTSPOT_2[1])
        pickup_in_high_risk_hotspot = min(dist_to_hotspot_1, dist_to_hotspot_2)

        # If model is not ready, attempt one lazy reload
        if not self.is_ready:
            self.load_model()
            
        if not self.is_ready or self.model is None or self.scaler is None:
            # Fallback to rule-based spatial logic
            fallback_label = self._fallback_rule_logic(pickup_hour, pickup_dist_to_safe_hub, pickup_in_high_risk_hotspot, mode)
            print(f"[Geographical SafetyPredictor] Using spatial rule-based fallback: {fallback_label}")
            return fallback_label, 1.0
            
        try:
            # 1. Map mode string to numeric ID
            mode_id = self._map_mode(mode)
            
            # 2. Construct raw numerical features for scaling directly (eliminates pandas overhead)
            raw_nums = np.array([[
                float(pickup_hour),
                float(distance_km),
                float(pickup_lat),
                float(pickup_lng),
                float(dest_lat),
                float(dest_lng),
                float(pickup_dist_to_safe_hub),
                float(dest_dist_to_safe_hub),
                float(pickup_in_high_risk_hotspot)
            ]], dtype=np.float32)
            
            # Apply StandardScaler
            scaled_nums = self.scaler.transform(raw_nums)[0]
            
            # 3. Assemble full features array in exact training order
            # ["pickup_hour", "day_of_week", "distance_km", "passenger_count", "ride_mode",
            #  "pickup_latitude", "pickup_longitude", "destination_latitude", "destination_longitude",
            #  "pickup_dist_to_safe_hub", "dest_dist_to_safe_hub", "pickup_in_high_risk_hotspot"]
            features_arr = np.array([[
                scaled_nums[0],        # pickup_hour
                float(day_of_week),    # day_of_week
                scaled_nums[1],        # distance_km
                float(passenger_count), # passenger_count
                float(mode_id),        # ride_mode
                scaled_nums[2],        # pickup_latitude
                scaled_nums[3],        # pickup_longitude
                scaled_nums[4],        # destination_latitude
                scaled_nums[5],        # destination_longitude
                scaled_nums[6],        # pickup_dist_to_safe_hub
                scaled_nums[7],        # dest_dist_to_safe_hub
                scaled_nums[8]         # pickup_in_high_risk_hotspot
            ]], dtype=np.float32)
            
            # 4. Perform Live Inference
            pred_class = int(self.model.predict(features_arr)[0])
            probabilities = self.model.predict_proba(features_arr)[0]
            confidence = float(probabilities[pred_class])
            
            prediction_label = self._get_safety_label(pred_class)
            print(f"[Geographical SafetyPredictor] Real Inference: {prediction_label} (Confidence: {confidence:.2f}) (SafeHub Dist: {pickup_dist_to_safe_hub:.1f}km)")
            
            return prediction_label, confidence
            
        except Exception as e:
            print(f"[Geographical SafetyPredictor Error] Inference failure: {e}")
            fallback_label = self._fallback_rule_logic(pickup_hour, pickup_dist_to_safe_hub, pickup_in_high_risk_hotspot, mode)
            return fallback_label, 1.0


# Singleton instance
predictor = SafetyPredictor()
