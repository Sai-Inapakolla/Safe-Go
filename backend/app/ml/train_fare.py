import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error

def generate_synthetic_surge_data(num_samples=10000):
    """
    Generate synthetic historical ride data simulating fare surge multipliers:
    - Features:
        - pickup_hour (0-23)
        - day_of_week (0-6)
        - distance_km (0.5-30.0)
        - passenger_count (1-4)
        - ride_mode (0=normal, 1=pink, 2=pwd, 3=elderly)
        - ai_safety_prediction (0=Stable, 1=Cautious, 2=High Priority)
    - Target:
        - surge_multiplier (float, 1.0 to 2.2)
    """
    np.random.seed(1337)
    
    pickup_hour = np.random.randint(0, 24, size=num_samples)
    day_of_week = np.random.randint(0, 7, size=num_samples)
    distance_km = np.random.uniform(0.5, 30.0, size=num_samples)
    passenger_count = np.random.randint(1, 5, size=num_samples)
    
    # Probabilities for ride modes: normal (55%), pink (20%), pwd (15%), elderly (10%)
    ride_mode = np.random.choice([0, 1, 2, 3], size=num_samples, p=[0.55, 0.20, 0.15, 0.10])
    
    # Probabilities for AI safety: Stable (60%), Cautious (25%), High Priority (15%)
    ai_safety_prediction = np.random.choice([0, 1, 2], size=num_samples, p=[0.60, 0.25, 0.15])
    
    surge_multipliers = []
    
    for i in range(num_samples):
        hr = pickup_hour[i]
        dow = day_of_week[i]
        mode = ride_mode[i]
        safety = ai_safety_prediction[i]
        
        # Rule A: Strictly cap accessibility rides to 1.0 (No surge for PWD/Elderly)
        if mode in [2, 3]:
            multiplier = 1.0
        else:
            # Baseline is no surge (1.0)
            multiplier = 1.0
            
            # 1. Hour-based surge
            if 8 <= hr <= 10 or 17 <= hr <= 20:
                # Heavy rush hours
                multiplier += np.random.uniform(0.35, 0.60)
            elif 22 <= hr or hr <= 4:
                # Late-night dispatch surge
                multiplier += np.random.uniform(0.20, 0.45)
                
            # 2. Weekend surcharge
            if dow in [4, 5, 6]: # Friday, Saturday, Sunday
                multiplier += np.random.uniform(0.08, 0.18)
                
            # 3. Cascading safety surcharge (higher risk route requires secure driver premiums)
            if safety == 1: # Cautious
                multiplier += np.random.uniform(0.12, 0.22)
            elif safety == 2: # High Priority
                multiplier += np.random.uniform(0.30, 0.50)
                
            # Add subtle dynamic jitter noise
            jitter = np.random.normal(0, 0.02)
            multiplier += jitter
            
        # Constrain surge boundaries
        multiplier = max(1.0, min(2.2, multiplier))
        surge_multipliers.append(round(multiplier, 2))
        
    df = pd.DataFrame({
        "pickup_hour": pickup_hour,
        "day_of_week": day_of_week,
        "distance_km": distance_km,
        "passenger_count": passenger_count,
        "ride_mode": ride_mode,
        "ai_safety_prediction": ai_safety_prediction,
        "surge_multiplier": surge_multipliers
    })
    
    return df

def train_and_save_surge_model():
    print("Generating synthetic fare surge training data...")
    df = generate_synthetic_surge_data(10000)
    
    # Split features and target
    X = df.drop(columns=["surge_multiplier"])
    y = df["surge_multiplier"]
    
    print(f"Dataset summary: mean surge is {y.mean():.3f}x, max is {y.max():.2f}x.")
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Fit scaler strictly on numeric variables
    print("\nFitting features scaler on numerical columns...")
    scaler = StandardScaler()
    numerical_cols = ["pickup_hour", "distance_km", "passenger_count"]
    
    X_train_scaled = X_train.copy()
    X_test_scaled = X_test.copy()
    
    X_train_scaled[numerical_cols] = scaler.fit_transform(X_train[numerical_cols])
    X_test_scaled[numerical_cols] = scaler.transform(X_test[numerical_cols])
    
    # Locking down exact feature layout order
    feature_order = [
        "pickup_hour", "day_of_week", "distance_km", "passenger_count", "ride_mode", "ai_safety_prediction"
    ]
    X_train_scaled = X_train_scaled[feature_order]
    X_test_scaled = X_test_scaled[feature_order]
    
    # Train Random Forest Regressor
    print("Training RandomForestRegressor...")
    model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    
    print(f"\nModel Evaluation Metrics:")
    print(f"-> R² Score (Coefficient of Determination): {r2:.4f}")
    print(f"-> Mean Absolute Error (MAE): {mae:.4f}")
    
    # Save model and scaler
    ml_dir = os.path.dirname(os.path.abspath(__file__))
    saved_models_dir = os.path.join(ml_dir, "saved_models")
    os.makedirs(saved_models_dir, exist_ok=True)
    
    model_path = os.path.join(saved_models_dir, "fare_surge_rf_model.joblib")
    scaler_path = os.path.join(saved_models_dir, "fare_surge_scaler.joblib")
    
    print(f"\nSaving dynamic surge model to {model_path}...")
    joblib.dump(model, model_path)
    
    print(f"Saving dynamic surge scaler to {scaler_path}...")
    joblib.dump(scaler, scaler_path)
    
    print("\nDynamic Surge ML Pricing Training Completed Successfully!")

if __name__ == "__main__":
    train_and_save_surge_model()
