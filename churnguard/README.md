# 🛡️ ChurnGuard — AI-Powered Churn Prevention Platform

A full-stack SaaS application that predicts customer churn using machine learning and provides AI-driven retention strategies.

---

## 📁 Project Structure

```
churnguard/
├── client/          ← React.js frontend (SaaS dashboard UI)
├── server/          ← Node.js + Express backend API
├── ai-model/        ← Python Flask ML service
│   ├── app.py       ← Flask API
│   ├── model.pkl    ← Trained Logistic Regression model
│   ├── scaler.pkl   ← Feature scaler
│   ├── encoders.pkl ← Label encoders
│   └── features.pkl ← Feature list
└── README.md
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+ and pip
- MongoDB (optional — app works without it)

---

### 1. Start the Python AI Service

```bash
cd ai-model
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5001
```

---

### 2. Start the Node.js Backend

```bash
cd server
npm install
cp .env.example .env   # Edit if needed
npm run dev
# Runs on http://localhost:4000
```

---

### 3. Start the React Frontend

```bash
cd client
npm install
npm start
# Opens at http://localhost:3000
```

---

## 🔐 Demo Login

Use this account to test without signing up:

```
Email:    demo@churnguard.ai
Password: demo1234
```

---

## 📊 Testing the App

1. Log in with demo credentials
2. Go to **Analyze Data**
3. Upload the included `client/public/sample.csv` (100 customers)
4. Click **Upload & Continue**, then **Run AI Analysis**
5. View results, charts, and retention strategies
6. Download a PDF report

---

## 📋 CSV Format

Your CSV must include these columns:

| Column | Type | Example |
|--------|------|---------|
| CustomerID | string | 1234-ABCD |
| Gender | Male/Female | Male |
| Senior Citizen | Yes/No | No |
| Partner | Yes/No | Yes |
| Dependents | Yes/No | No |
| Tenure Months | number | 24 |
| Phone Service | Yes/No | Yes |
| Multiple Lines | Yes/No/No phone | No |
| Internet Service | DSL/Fiber optic/No | DSL |
| Online Security | Yes/No | Yes |
| Online Backup | Yes/No | No |
| Device Protection | Yes/No | Yes |
| Tech Support | Yes/No | No |
| Streaming TV | Yes/No | Yes |
| Streaming Movies | Yes/No | No |
| Contract | Month-to-month/One year/Two year | Month-to-month |
| Paperless Billing | Yes/No | Yes |
| Payment Method | Electronic check/Mailed check/etc | Electronic check |
| Monthly Charges | number | 65.50 |
| Total Charges | number | 1580.00 |

---

## 🤖 AI Model

- **Algorithm**: Logistic Regression
- **Training data**: Telco Customer Churn dataset (7,043 customers)
- **Accuracy**: ~80.1%
- **Features**: 19 customer attributes
- **Output**: Churn probability (0-100%) + risk level + retention strategies

---

## 🔌 API Endpoints

### Node.js Backend (port 4000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Create account |
| POST | /api/auth/login | Login + get JWT |
| POST | /api/uploads | Upload CSV file |
| GET | /api/uploads/history | Upload history |
| POST | /api/predictions/analyze | Run AI analysis |
| GET | /api/predictions/history | Analysis history |
| GET | /api/dashboard/stats | Dashboard metrics |

### Python AI Service (port 5001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /predict | Predict churn for batch of customers |
| GET | /features | Get required feature list |
| GET | /health | Health check |

---

## ☁️ Deployment

### Frontend → Vercel
```bash
cd client && npm run build
# Deploy /build folder to Vercel
# Set REACT_APP_API_URL=https://your-backend.render.com/api
```

### Backend → Render
```bash
# Connect GitHub repo, set root to /server
# Add env vars: MONGO_URI, JWT_SECRET, AI_SERVICE_URL
```

### AI Service → Render (separate service)
```bash
# Connect GitHub repo, set root to /ai-model
# Start command: gunicorn app:app
```

---

## 🧠 How It Works

1. **User uploads CSV** → Node.js validates and parses it
2. **Node.js forwards data** → Python Flask AI service
3. **ML model processes** → Logistic Regression predicts churn probability
4. **Results returned** → with risk level + retention strategies
5. **Frontend displays** → charts, table, downloadable PDF report

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Recharts, React Router 6 |
| Backend | Node.js, Express 4, JWT, Multer |
| AI Service | Python, Flask, scikit-learn |
| Database | MongoDB (via Mongoose) |
| ML Model | Logistic Regression (sklearn) |
| Styling | Custom CSS with CSS variables |
| PDF | jsPDF + jsPDF-AutoTable |
