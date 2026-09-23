# 🛠️ SafeGo Backend API & Machine Learning Engine

FastAPI-powered backend engine for the SafeGo Ride Safety Platform with integrated Scikit-Learn machine learning models, Beanie ODM (MongoDB), WebSockets for real-time tracking, and Twilio emergency response.

---

## 🏗️ Architecture & Core Components

```
backend/
├── app/
│   ├── ml/                      # Machine Learning Safety & Surge Engine
│   │   ├── saved_models/        # Pre-trained Random Forest model binaries (.joblib)
│   │   │   ├── safety_rf_model.joblib
│   │   │   ├── safety_scaler.joblib
│   │   │   ├── fare_surge_rf_model.joblib
│   │   │   └── fare_surge_scaler.joblib
│   │   ├── predictor.py         # Safety classifier singleton
│   │   ├── fare_predictor.py    # Fare surge regressor singleton
│   │   ├── train.py             # Safety model training pipeline
│   │   └── train_fare.py        # Fare surge model training pipeline
│   ├── models/                  # Beanie MongoDB documents (User, Driver, Ride, SOSAlert)
│   ├── routes/                  # API endpoints (auth, rides, map, drivers, safety, ws, voice)
│   ├── schemas/                 # Pydantic validation schemas
│   ├── services/                # Business logic (map_service, geo_service, ride_service)
│   ├── utils/                   # Security, dependencies, fare calculations
│   ├── config.py                # Pydantic Settings and environment configuration
│   ├── database.py              # MongoDB connection & Beanie initialization
│   └── main.py                  # FastAPI application entry & lifespan
├── requirements.txt             # Python dependencies
└── test_*.py                    # Automated test suites
```

---

## 🤖 ML Models & Inference Pipeline

The backend includes two dedicated Machine Learning engines loaded as singleton instances:

1. **Safety Classifier (`app/ml/predictor.py`)**:
   - Classifies routes as `Stable`, `Cautious`, or `High Priority` based on time, distance, mode, safe hub distances, and risk hotspot proximities.
2. **Dynamic Fare Surge Regressor (`app/ml/fare_predictor.py`)**:
   - Calculates dynamic surge multipliers (`1.0x` - `2.2x`) using temporal factors, passenger count, and the output of the safety classifier.

Both models are invoked automatically inside `app.services.map_service.get_route()` and during live driver deviation in `app.services.map_service.reroute_active_trip()`.

---

## 🚀 Quick Start

### 1. Environment Configuration
Ensure your root `.env` file is populated with MongoDB and security credentials:
```bash
# In repository root
cp .env.example .env
```

### 2. Install Dependencies
```bash
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
```

### 3. (Optional) Re-train ML Models
To generate synthetic datasets and retrain the Random Forest classifiers:
```bash
python app/ml/train.py
python app/ml/train_fare.py
```

### 4. Start the Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive API documentation will be available at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Running Backend Tests

```bash
# Run all core backend tests
python -m pytest test_all_safego.py

# Run integration tests
python -m pytest test_integration_safego.py

# Run end-to-end SOS regression tests
python -m pytest test_e2e_sos_regression.py

# Run ML inference unit tests
python -m pytest app/ml/test_inference.py
python -m pytest app/ml/test_fare_inference.py
```

*For complete project-wide documentation and frontend guides, refer to the **[Root README.md](../README.md)**.*
