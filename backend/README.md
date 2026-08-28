# 🛠️ SafeGo Backend API

This directory contains the FastAPI-powered backend codebase for the SafeGo Ride Safety Platform.

## 🚀 Quick Start

1. **Configure Environment**:
   SafeGo uses a single unified `.env` file at the root of the repository:
   ```bash
   # From the repository root
   cp .env.example .env
   ```
   Configure your MongoDB connection string (`DATABASE_URL`), JWT secret, Twilio credentials, and Cloudinary settings in the root `.env`.

2. **Initialize Database**:
   Ensure MongoDB is running locally or that your Atlas connection string is active.

3. **Install Dependencies & Start**:
   ```bash
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

*For comprehensive architecture plans, data flows, and full feature specifications, refer to the **[Root README.md](../README.md)**.*
