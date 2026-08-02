import os
import joblib
import numpy as np
import pandas as pd
import warnings
from typing import Tuple

# Suppress sklearn UserWarning warnings about feature names
warnings.filterwarnings("ignore", category=UserWarning)

class FareSurgePredictor:
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(FareSurgePredictor, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance
        
    def __init__(self):
        if self._initialized:
            return
            
        ml_dir = os.path.dirname(os.path.abspath(__file__))
        saved_models_dir = os.path.join(ml_dir, "saved_models")
        self.model_path = os.path.join(saved_models_dir, "fare_surge_rf_model.joblib")
        self.scaler_path = os.path.join(saved_models_dir, "fare_surge_scaler.joblib")
        
        self.model = None
        self.scaler = None
        self.is_ready = False
        
        self.load_model()
        self._initialized = True
        
    def load_model(self) -> bool:
        """Load surge model and scaler from joblib files."""
        if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
            try:
                print(f"[SurgePredictor] Loading model from {self.model_path}...")
                self.model = joblib.load(self.model_path)
                # CRITICAL PERFORMANCE OPTIMIZATION: Set n_jobs = 1 for fast single-sample real-time inference
                if hasattr(self.model, "n_jobs"):
                    self.model.n_jobs = 1
                print(f"[SurgePredictor] Loading scaler from {self.scaler_path}...")
                self.scaler = joblib.load(self.scaler_path)
                self.is_ready = True
                print("[SurgePredictor] Dynamic Fare Surge pricing model loaded and active.")
                return True
            except Exception as e:
                print(f"[SurgePredictor Warning] Failed to load ML model: {e}")
                self.is_ready = False
                return False
        else:
            print("[SurgePredictor Warning] Model files not found. Inference will use deterministic fallback rules.")
            self.is_ready = False
            return False
            
    def _map_mode(self, mode: str) -> int:
        """Map ride mode string to integer index."""
        mapping = {
            "normal": 0,
            "pink": 1,
            "pwd": 2,
            "elderly": 3
        }
        return mapping.get(mode.lower(), 0)
        
    def _map_safety_label(self, label: str) -> int:
        """Map safety category label to integer risk rating."""
        mapping = {
            "stable": 0,
            "cautious": 1,
            "high priority": 2
        }
        return mapping.get(label.lower(), 0)
        
    def _fallback_rule_logic(self, pickup_hour: int, day_of_week: int, mode: str, safety_label: str) -> float:
        """Dynamic rule-based pricing fallback if ML model is unavailable."""
        if mode.lower() in ["pwd", "elderly"]:
            return 1.0
            
        multiplier = 1.0
        
        # 1. Hour surge
        if 8 <= pickup_hour <= 10 or 17 <= pickup_hour <= 20:
            multiplier += 0.45
        elif 22 <= pickup_hour or pickup_hour <= 4:
            multiplier += 0.30
            
        # 2. Weekend surge
        if day_of_week in [4, 5, 6]:
            multiplier += 0.12
            
        # 3. Safety surge
        label_lower = safety_label.lower()
        if label_lower == "cautious":
            multiplier += 0.18
        elif label_lower == "high priority":
            multiplier += 0.40
            
        return max(1.0, min(2.2, round(multiplier, 2)))
        
    def predict_surge(
        self,
        pickup_hour: int,
        day_of_week: int,
        distance_km: float,
        passenger_count: int,
        mode: str,
        ai_safety_prediction: str
    ) -> Tuple[float, float]:
        """
        Predict dynamic travel surge multiplier and model confidence score.
        Returns: Tuple of (surge_multiplier: float, confidence_score: float)
        """
        if not self.is_ready:
            self.load_model()
            
        if not self.is_ready or self.model is None or self.scaler is None:
            # Fallback to deterministic rules
            fallback_mult = self._fallback_rule_logic(pickup_hour, day_of_week, mode, ai_safety_prediction)
            print(f"[SurgePredictor] Using fallback rule surge multiplier: {fallback_mult}x")
            return fallback_mult, 1.0
            
        try:
            mode_id = self._map_mode(mode)
            safety_id = self._map_safety_label(ai_safety_prediction)
            
            # 1. Scale numeric variables directly (eliminates pandas overhead)
            raw_nums = np.array([[
                float(pickup_hour),
                float(distance_km),
                float(passenger_count)
            ]], dtype=np.float32)
            
            # Apply StandardScaler
            scaled_nums = self.scaler.transform(raw_nums)[0]
            
            # 2. Assemble features array in exact training order
            # ["pickup_hour", "day_of_week", "distance_km", "passenger_count", "ride_mode", "ai_safety_prediction"]
            features_arr = np.array([[
                scaled_nums[0],        # pickup_hour
                float(day_of_week),    # day_of_week
                scaled_nums[1],        # distance_km
                scaled_nums[2],        # passenger_count
                float(mode_id),        # ride_mode
                float(safety_id)       # ai_safety_prediction
            ]], dtype=np.float32)
            
            # 3. Perform Regression Inference
            predicted_multiplier = float(self.model.predict(features_arr)[0])
            
            # CRITICAL PERFORMANCE OPTIMIZATION: Bypassing the extremely slow tree variance iteration
            # as it is not used in the routes/API. Returning static 1.0 confidence.
            confidence = 1.0
            
            # Round multiplier to 2 decimal places
            predicted_multiplier = max(1.0, min(2.2, round(predicted_multiplier, 2)))
            
            print(f"[SurgePredictor] ML Surge Inference: {predicted_multiplier}x (Confidence: {confidence:.2f}) (Mode: {mode}, Safety: {ai_safety_prediction})")
            return predicted_multiplier, confidence
            
        except Exception as e:
            print(f"[SurgePredictor Error] Dynamic inference failed: {e}")
            fallback_mult = self._fallback_rule_logic(pickup_hour, day_of_week, mode, ai_safety_prediction)
            return fallback_mult, 1.0

# Singleton instance
fare_surge_predictor = FareSurgePredictor()
