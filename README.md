# FoodShare - Food Waste Management System

A full-stack solution connecting food donors with receivers to minimize food waste using FastAPI, React, and Google Maps.

## 🚀 Features
- **User Roles**: Donor, Receiver, and Admin.
- **Real-time Map**: Browse and post food donations with Google Maps integration.
- **Role-based Dashboards**: Manage donations and requests efficiently.
- **Secure Auth**: JWT-based authentication with password hashing.
- **Premium UI**: Modern glassmorphism design with responsive layouts.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Axios, Google Maps API.
- **Backend**: FastAPI (Python), SQLAlchemy, JWT.
- **Database**: SQLite (default, easily switchable to PostgreSQL).

## 📦 Setup Instructions

### 1. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file (one is already provided) and update your `SECRET_KEY`.
5. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```
   API will be available at `http://localhost:8000`.

### 2. Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file and add your Google Maps API Key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   Frontend will be available at `http://localhost:5173`.

## 📖 API Documentation
Once the backend is running, visit `http://localhost:8000/docs` to view the interactive Swagger documentation.

## 📝 License
This project is open-source. Feel free to contribute!
