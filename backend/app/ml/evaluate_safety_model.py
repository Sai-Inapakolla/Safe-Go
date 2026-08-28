import os
import sys
import time
import json
import warnings

# Suppress all sklearn / numpy warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

# Set base paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
sys.path.insert(0, BACKEND_DIR)

from app.ml.train import generate_synthetic_data, calculate_haversine, SAFE_HUB_LAT, SAFE_HUB_LNG, RISK_HOTSPOT_1, RISK_HOTSPOT_2
from app.ml.predictor import SafetyPredictor

def run_comprehensive_evaluation():
    print("=" * 70)
    print("SAFEGO ML SAFETY/RISK PREDICTION MODEL EVALUATION")
    print("=" * 70)

    # 1. Dataset Generation (Exact parameters as train.py)
    print("\n[Step 1] Loading / Generating Dataset (10,000 samples, seed=42)...")
    df = generate_synthetic_data(10000)
    X = df.drop(columns=["safety_class"])
    y = df["safety_class"]

    # 80/20 Stratified Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Total Dataset Size: {len(df)} samples")
    print(f"Training Set Size: {len(X_train)} samples (80%)")
    print(f"Test Set Size: {len(X_test)} samples (20%)")
    print("Test Set Class Distribution:")
    for cls_id, cls_name in [(0, "Stable"), (1, "Cautious"), (2, "High Priority")]:
        count = int((y_test == cls_id).sum())
        pct = count / len(y_test) * 100
        print(f"  Class {cls_id} ({cls_name}): {count} samples ({pct:.1f}%)")

    # 2. Model & Scaler Preparation / Loading
    saved_models_dir = os.path.join(CURRENT_DIR, "saved_models")
    model_path = os.path.join(saved_models_dir, "safety_rf_model.joblib")
    scaler_path = os.path.join(saved_models_dir, "safety_scaler.joblib")

    numerical_cols = [
        "pickup_hour", "distance_km", "pickup_latitude", "pickup_longitude",
        "destination_latitude", "destination_longitude", "pickup_dist_to_safe_hub",
        "dest_dist_to_safe_hub", "pickup_in_high_risk_hotspot"
    ]
    feature_order = [
        "pickup_hour", "day_of_week", "distance_km", "passenger_count", "ride_mode",
        "pickup_latitude", "pickup_longitude", "destination_latitude", "destination_longitude",
        "pickup_dist_to_safe_hub", "dest_dist_to_safe_hub", "pickup_in_high_risk_hotspot"
    ]

    if os.path.exists(model_path) and os.path.exists(scaler_path):
        print(f"\n[Step 2] Loading existing model from {model_path}...")
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
    else:
        print("\n[Step 2] Training fresh Random Forest model...")
        scaler = StandardScaler()
        X_train_scaled = X_train.copy()
        X_train_scaled[numerical_cols] = scaler.fit_transform(X_train[numerical_cols])
        X_train_scaled = X_train_scaled[feature_order]

        model = RandomForestClassifier(n_estimators=100, max_depth=14, random_state=42, n_jobs=1)
        model.fit(X_train_scaled, y_train)

        os.makedirs(saved_models_dir, exist_ok=True)
        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)

    # Set n_jobs = 1 for clean fast inference
    if hasattr(model, "n_jobs"):
        model.n_jobs = 1

    # 3. Model Inference on Test Dataset
    X_test_scaled = X_test.copy()
    X_test_scaled[numerical_cols] = scaler.transform(X_test[numerical_cols])
    X_test_scaled = X_test_scaled[feature_order]

    X_test_np = X_test_scaled.to_numpy()
    y_pred = model.predict(X_test_np)
    y_pred_proba = model.predict_proba(X_test_np)

    # 4. Metrics Calculation
    acc = accuracy_score(y_test, y_pred)
    
    prec_macro = precision_score(y_test, y_pred, average="macro")
    prec_weighted = precision_score(y_test, y_pred, average="weighted")
    prec_per_class = precision_score(y_test, y_pred, average=None).tolist()

    rec_macro = recall_score(y_test, y_pred, average="macro")
    rec_weighted = recall_score(y_test, y_pred, average="weighted")
    rec_per_class = recall_score(y_test, y_pred, average=None).tolist()

    f1_mac = f1_score(y_test, y_pred, average="macro")
    f1_weight = f1_score(y_test, y_pred, average="weighted")
    f1_per_class = f1_score(y_test, y_pred, average=None).tolist()

    conf_matrix = confusion_matrix(y_test, y_pred).tolist()
    clf_report = classification_report(y_test, y_pred, target_names=["Stable", "Cautious", "High Priority"], output_dict=True)

    # 5. Prediction Latency / Benchmark
    print("\n[Step 3] Benchmarking Prediction Latency (200 single-sample inferences)...")
    single_sample_np = X_test_np[[0]]
    
    # Warmup
    for _ in range(20):
        _ = model.predict(single_sample_np)

    latencies = []
    for _ in range(200):
        t0 = time.perf_counter()
        _ = model.predict(single_sample_np)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000) # in ms

    p50_latency = float(np.percentile(latencies, 50))
    p90_latency = float(np.percentile(latencies, 90))
    p95_latency = float(np.percentile(latencies, 95))
    p99_latency = float(np.percentile(latencies, 99))
    mean_latency = float(np.mean(latencies))

    # 6. Route Risk Predictions on Real Scenarios
    predictor = SafetyPredictor()
    predictor.model = model
    predictor.scaler = scaler
    predictor.is_ready = True

    real_scenarios = [
        {
            "scenario_name": "Daytime Downtown Commute (Standard Normal Mode)",
            "pickup_hour": 14,
            "day_of_week": 1,
            "distance_km": 3.5,
            "passenger_count": 1,
            "mode": "normal",
            "pickup_lat": 22.308,
            "pickup_lng": 73.185,
            "dest_lat": 22.320,
            "dest_lng": 73.200,
            "context": "Broad daylight, safe transit hub center (Vadodara Station)"
        },
        {
            "scenario_name": "Late-Night Suburban Ring Road (Normal Mode)",
            "pickup_hour": 1,
            "day_of_week": 5,
            "distance_km": 9.5,
            "passenger_count": 1,
            "mode": "normal",
            "pickup_lat": 22.356,
            "pickup_lng": 73.116,
            "dest_lat": 22.308,
            "dest_lng": 73.185,
            "context": "1:00 AM midnight, NW outskirts bypass / high risk hotspot"
        },
        {
            "scenario_name": "Persons with Disabilities (PWD Mode Commute)",
            "pickup_hour": 10,
            "day_of_week": 2,
            "distance_km": 4.1,
            "passenger_count": 1,
            "mode": "pwd",
            "pickup_lat": 22.308,
            "pickup_lng": 73.185,
            "dest_lat": 22.330,
            "dest_lng": 73.160,
            "context": "Morning commute with wheelchair accommodation requirement"
        },
        {
            "scenario_name": "Women Safety Evening Outskirts (Pink Mode)",
            "pickup_hour": 20,
            "day_of_week": 4,
            "distance_km": 11.2,
            "passenger_count": 1,
            "mode": "pink",
            "pickup_lat": 22.253,
            "pickup_lng": 73.254,
            "dest_lat": 22.308,
            "dest_lng": 73.185,
            "context": "8:00 PM evening, SE Industrial outskirts hotspot"
        },
        {
            "scenario_name": "Senior Citizen Daytime Trip (Elderly Mode)",
            "pickup_hour": 11,
            "day_of_week": 3,
            "distance_km": 5.0,
            "passenger_count": 1,
            "mode": "elderly",
            "pickup_lat": 22.308,
            "pickup_lng": 73.185,
            "dest_lat": 22.290,
            "dest_lng": 73.170,
            "context": "Senior citizen trip requiring caregiver sync"
        }
    ]

    route_risk_results = []
    for sc in real_scenarios:
        label, conf = predictor.predict_safety(
            pickup_hour=sc["pickup_hour"],
            day_of_week=sc["day_of_week"],
            distance_km=sc["distance_km"],
            passenger_count=sc["passenger_count"],
            mode=sc["mode"],
            pickup_lat=sc["pickup_lat"],
            pickup_lng=sc["pickup_lng"],
            dest_lat=sc["dest_lat"],
            dest_lng=sc["dest_lng"]
        )
        route_risk_results.append({
            "scenario": sc["scenario_name"],
            "mode": sc["mode"],
            "time": f"{sc['pickup_hour']:02d}:00",
            "distance_km": sc["distance_km"],
            "predicted_safety_category": label,
            "confidence_score": round(conf, 4),
            "context": sc["context"]
        })

    # Save Output
    evaluation_output = {
        "model_architecture": {
            "algorithm": "RandomForestClassifier",
            "n_estimators": 100,
            "max_depth": 14,
            "random_state": 42,
            "feature_count": len(feature_order),
            "features": feature_order,
            "target_classes": ["0: Stable", "1: Cautious", "2: High Priority"]
        },
        "dataset_split": {
            "total_samples": len(df),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "test_class_distribution": {
                "Stable": int((y_test == 0).sum()),
                "Cautious": int((y_test == 1).sum()),
                "High Priority": int((y_test == 2).sum())
            }
        },
        "performance_metrics": {
            "accuracy": round(acc, 6),
            "precision_macro": round(prec_macro, 6),
            "precision_weighted": round(prec_weighted, 6),
            "precision_per_class": {
                "Stable": round(prec_per_class[0], 6),
                "Cautious": round(prec_per_class[1], 6),
                "High_Priority": round(prec_per_class[2], 6)
            },
            "recall_macro": round(rec_macro, 6),
            "recall_weighted": round(rec_weighted, 6),
            "recall_per_class": {
                "Stable": round(rec_per_class[0], 6),
                "Cautious": round(rec_per_class[1], 6),
                "High_Priority": round(rec_per_class[2], 6)
            },
            "f1_macro": round(f1_mac, 6),
            "f1_weighted": round(f1_weight, 6),
            "f1_per_class": {
                "Stable": round(f1_per_class[0], 6),
                "Cautious": round(f1_per_class[1], 6),
                "High_Priority": round(f1_per_class[2], 6)
            },
            "confusion_matrix": {
                "matrix_2d": conf_matrix,
                "labels": ["Stable", "Cautious", "High Priority"],
                "row_actual_col_pred": {
                    "Actual_Stable": {"Pred_Stable": conf_matrix[0][0], "Pred_Cautious": conf_matrix[0][1], "Pred_High_Priority": conf_matrix[0][2]},
                    "Actual_Cautious": {"Pred_Stable": conf_matrix[1][0], "Pred_Cautious": conf_matrix[1][1], "Pred_High_Priority": conf_matrix[1][2]},
                    "Actual_High_Priority": {"Pred_Stable": conf_matrix[2][0], "Pred_Cautious": conf_matrix[2][1], "Pred_High_Priority": conf_matrix[2][2]}
                }
            },
            "classification_report": clf_report
        },
        "latency_benchmarks_ms": {
            "mean_latency_ms": round(mean_latency, 3),
            "p50_latency_ms": round(p50_latency, 3),
            "p90_latency_ms": round(p90_latency, 3),
            "p95_latency_ms": round(p95_latency, 3),
            "p99_latency_ms": round(p99_latency, 3)
        },
        "route_risk_predictions": route_risk_results
    }

    out_path = os.path.join(BACKEND_DIR, "..", "testing", "ml_safety_model_evaluation_results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(evaluation_output, f, indent=2)

    print(f"\nEvaluation Results written to: {out_path}")
    print("\n--- Summary Metrics ---")
    print(f"Accuracy: {acc * 100:.2f}%")
    print(f"Macro Precision: {prec_macro:.4f} | Weighted Precision: {prec_weighted:.4f}")
    print(f"Macro Recall: {rec_macro:.4f} | Weighted Recall: {rec_weighted:.4f}")
    print(f"Macro F1-Score: {f1_mac:.4f} | Weighted F1-Score: {f1_weight:.4f}")
    print(f"Mean Inference Time: {mean_latency:.3f} ms (p50: {p50_latency:.3f} ms, p99: {p99_latency:.3f} ms)")
    print(f"Confusion Matrix (Rows=Actual, Cols=Predicted):\n{np.array(conf_matrix)}")

    return evaluation_output

if __name__ == "__main__":
    run_comprehensive_evaluation()
