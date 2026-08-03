# 🛠️ SafeGo Backend API

This directory contains the FastAPI-powered backend codebase for the SafeGo Ride Safety Platform.

## 🚀 Quick Start

1. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```
   Add your MongoDB connection string (`MONGO_URI`) and optional Twilio API keys.

2. **Initialize Database**:
   Ensure MongoDB is running locally or that your Atlas connection string is active.

3. **Install Dependencies & Start**:
   ```bash
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

*For comprehensive architecture plans, data flows, and full feature specifications, refer to the **[Root README.md](../README.md)**.*
