import os
import joblib
import math
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

# Geographical Constant Hubs (Operational base Vadodara)
SAFE_HUB_LAT = 22.308
SAFE_HUB_LNG = 73.185

# Mock High Risk peripheral hotspots
RISK_HOTSPOT_1 = (22.355, 73.115) # North-West Outskirts / Bypass
RISK_HOTSPOT_2 = (22.251, 73.255) # South-East Industrial Fringe

def calculate_haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance in kilometers between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians 
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    
    a = (np.sin(dlat / 2.0) ** 2.0 + 
         np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2.0) ** 2.0)
    c = 2.0 * np.arcsin(np.sqrt(a)) 
    r = 6371.0 # Radius of earth in kilometers
    return r * c

def generate_synthetic_data(num_samples=10000):
    """
    Generate synthetic historical ride data simulating geographical safety dynamics:
    - Coordinates centered around Vadodara (22.30, 73.19)
    - Calculated Location Features:
        - pickup_dist_to_safe_hub (km)
        - dest_dist_to_safe_hub (km)
        - pickup_in_high_risk_hotspot (km - minimum distance to any risk hotspot)
    """
    np.random.seed(42)
    
    # 1. Generate Coordinates
    # Center = Vadodara Station (22.308, 73.185)
    pickup_latitude = np.random.uniform(22.230, 22.380, size=num_samples)
    pickup_longitude = np.random.uniform(73.100, 73.270, size=num_samples)
    
    # Generate realistic destinations based on random angle and distance
    angles = np.random.uniform(0, 2 * math.pi, size=num_samples)
    distances = np.random.uniform(0.5, 30.0, size=num_samples) # Ride distances up to 30km
    
    # Simple projection coordinates (roughly 1 degree lat = 111km, 1 degree lng = 103km at 22N)
    dest_latitude = pickup_latitude + (distances * np.cos(angles) / 111.0)
    dest_longitude = pickup_longitude + (distances * np.sin(angles) / 103.0)
    
    # Recalculate true haversine distance
    distance_km = calculate_haversine(pickup_latitude, pickup_longitude, dest_latitude, dest_longitude)
    
    # Other features
    pickup_hour = np.random.randint(0, 24, size=num_samples)
    day_of_week = np.random.randint(0, 7, size=num_samples)
    passenger_count = np.random.randint(1, 5, size=num_samples)
    ride_mode = np.random.choice([0, 1, 2, 3], size=num_samples, p=[0.55, 0.20, 0.15, 0.10])
    
    # 2. Calculate Distance to Secure Hub and Risk Hotspots
    pickup_dist_to_safe_hub = calculate_haversine(pickup_latitude, pickup_longitude, SAFE_HUB_LAT, SAFE_HUB_LNG)
    dest_dist_to_safe_hub = calculate_haversine(dest_latitude, dest_longitude, SAFE_HUB_LAT, SAFE_HUB_LNG)
    
    dist_to_hotspot_1 = calculate_haversine(pickup_latitude, pickup_longitude, RISK_HOTSPOT_1[0], RISK_HOTSPOT_1[1])
    dist_to_hotspot_2 = calculate_haversine(pickup_latitude, pickup_longitude, RISK_HOTSPOT_2[0], RISK_HOTSPOT_2[1])
    pickup_in_high_risk_hotspot = np.minimum(dist_to_hotspot_1, dist_to_hotspot_2)
    
    # 3. Location-aware safety labeling logic
    safety_class = []
    for i in range(num_samples):
        hr = pickup_hour[i]
        mode = ride_mode[i]
        dow = day_of_week[i]
        
        hub_dist = pickup_dist_to_safe_hub[i]
        hotspot_dist = pickup_in_high_risk_hotspot[i]
        
        # Rule A: Priority Passenger Modes (PWD, Elderly)
        if mode in [2, 3]:
            label = 2 # High Priority proactive support
            
        # Rule B: Geographical Outskirt Risk at Night
        elif (22 <= hr or hr <= 4) and (hub_dist > 6.5 or hotspot_dist < 2.5):
            # Outskirts/High Risk zone at night
            label = 2 if mode == 1 else 1 # High Priority for Pink mode, Cautious for others
            
        # Rule C: Night time standard risk
        elif 22 <= hr or hr <= 4:
            label = 1 # Baseline night caution
            
        # Rule D: Pink Mode in Outskirts during evening hours (6 PM - 10 PM)
        elif mode == 1 and (18 <= hr <= 22) and (hub_dist > 5.0 or hotspot_dist < 3.0):
            label = 2 # Proactive High Priority
            
        # Rule E: Baseline safe conditions
        else:
            label = 0 # Stable
            
        safety_class.append(label)
        
    df = pd.DataFrame({
        "pickup_hour": pickup_hour,
        "day_of_week": day_of_week,
        "distance_km": distance_km,
        "passenger_count": passenger_count,
        "ride_mode": ride_mode,
        "pickup_latitude": pickup_latitude,
        "pickup_longitude": pickup_longitude,
        "destination_latitude": dest_latitude,
        "destination_longitude": dest_longitude,
        "pickup_dist_to_safe_hub": pickup_dist_to_safe_hub,
        "dest_dist_to_safe_hub": dest_dist_to_safe_hub,
        "pickup_in_high_risk_hotspot": pickup_in_high_risk_hotspot,
        "safety_class": safety_class
    })
    
    return df

def train_and_save_model():
    print("Generating synthetic location-aware safety training data...")
    df = generate_synthetic_data(10000)
    
    # Split into features (X) and target (y)
    X = df.drop(columns=["safety_class"])
    y = df["safety_class"]
    
    print("\nDataset Class Distribution:")
    print(y.value_counts(normalize=True))
    
    # Train-test split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Fitting feature scaler on all numerical variables to map them accurately
    print("\nFitting features scaler on all numerical columns...")
    scaler = StandardScaler()
    
    numerical_cols = [
        "pickup_hour", "distance_km", "pickup_latitude", "pickup_longitude",
        "destination_latitude", "destination_longitude", "pickup_dist_to_safe_hub",
        "dest_dist_to_safe_hub", "pickup_in_high_risk_hotspot"
    ]
    
    # Transform train and test sets
    X_train_scaled = X_train.copy()
    X_test_scaled = X_test.copy()
    
    X_train_scaled[numerical_cols] = scaler.fit_transform(X_train[numerical_cols])
    X_test_scaled[numerical_cols] = scaler.transform(X_test[numerical_cols])
    
    # Ensure correct column order before model training
    feature_order = [
        "pickup_hour", "day_of_week", "distance_km", "passenger_count", "ride_mode",
        "pickup_latitude", "pickup_longitude", "destination_latitude", "destination_longitude",
        "pickup_dist_to_safe_hub", "dest_dist_to_safe_hub", "pickup_in_high_risk_hotspot"
    ]
    X_train_scaled = X_train_scaled[feature_order]
    X_test_scaled = X_test_scaled[feature_order]
    
    # Train location-aware Random Forest Classifier
    print("Training Location-Aware Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, max_depth=14, random_state=42, n_jobs=-1)
    model.fit(X_train_scaled, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nModel Evaluation Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Stable", "Cautious", "High Priority"]))
    
    # Create saved models directory
    ml_dir = os.path.dirname(os.path.abspath(__file__))
    saved_models_dir = os.path.join(ml_dir, "saved_models")
    os.makedirs(saved_models_dir, exist_ok=True)
    
    model_path = os.path.join(saved_models_dir, "safety_rf_model.joblib")
    scaler_path = os.path.join(saved_models_dir, "safety_scaler.joblib")
    
    print(f"Saving model to {model_path}...")
    joblib.dump(model, model_path)
    
    print(f"Saving scaler to {scaler_path}...")
    joblib.dump(scaler, scaler_path)
    
    print("\nLocation-Aware Machine Learning Training Completed Successfully!")

if __name__ == "__main__":
    train_and_save_model()
