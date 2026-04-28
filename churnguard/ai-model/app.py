"""
ChurnGuard AI Service - Flask API
Handles churn prediction using a trained Logistic Regression model
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import os

app = Flask(__name__)
CORS(app)

# Load model artifacts at startup
BASE_DIR = os.path.dirname(__file__)
model = joblib.load(os.path.join(BASE_DIR, 'model.pkl'))
scaler = joblib.load(os.path.join(BASE_DIR, 'scaler.pkl'))
encoders = joblib.load(os.path.join(BASE_DIR, 'encoders.pkl'))
features = joblib.load(os.path.join(BASE_DIR, 'features.pkl'))

NUM_COLS = ['Tenure Months', 'Monthly Charges', 'Total Charges']
CAT_COLS = [f for f in features if f not in NUM_COLS]


def preprocess_row(row: dict) -> np.ndarray:
    """Preprocess a single customer record for prediction."""
    processed = {}
    for col in features:
        val = row.get(col, None)
        if col in NUM_COLS:
            try:
                processed[col] = float(val) if val not in (None, '', 'nan') else 0.0
            except (ValueError, TypeError):
                processed[col] = 0.0
        else:
            # Encode categorical
            val_str = str(val) if val not in (None, '', 'nan') else 'Unknown'
            classes = encoders.get(col, [])
            if val_str in classes:
                processed[col] = float(classes.index(val_str))
            else:
                processed[col] = 0.0
    return np.array([processed[f] for f in features], dtype=float)


def get_retention_strategy(prob: float, row: dict) -> dict:
    """Generate retention strategy based on churn probability and customer data."""
    strategies = []
    priority = "low"

    if prob >= 0.7:
        priority = "critical"
        strategies.append({
            "action": "Immediate personal call",
            "description": "High-risk customer — assign to retention team for personal outreach within 24h",
            "channel": "call"
        })
        strategies.append({
            "action": "Offer loyalty discount",
            "description": "Provide 20-30% discount on next 3 months or upgrade to higher plan",
            "channel": "discount"
        })
    elif prob >= 0.4:
        priority = "high"
        strategies.append({
            "action": "Send retention email",
            "description": "Personalized email with exclusive offer or service upgrade",
            "channel": "email"
        })
        strategies.append({
            "action": "Offer contract upgrade",
            "description": "Incentivize switching from month-to-month to annual contract",
            "channel": "discount"
        })
    elif prob >= 0.2:
        priority = "medium"
        strategies.append({
            "action": "Engagement campaign",
            "description": "Send helpful tips about underused features and service benefits",
            "channel": "email"
        })
    else:
        priority = "low"
        strategies.append({
            "action": "Loyalty reward",
            "description": "Thank long-term customers with a small reward or feature unlock",
            "channel": "email"
        })

    # Contract-specific advice
    contract = str(row.get('Contract', ''))
    if 'month' in contract.lower():
        strategies.append({
            "action": "Long-term contract incentive",
            "description": "Offer 2 months free with annual or 2-year contract upgrade",
            "channel": "discount"
        })

    return {"priority": priority, "strategies": strategies}


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model": "LogisticRegression", "accuracy": "80.13%"})


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict churn for a batch of customers.
    Expects JSON: { "customers": [ {...}, ... ] }
    Returns: list of predictions with probabilities and retention strategies
    """
    try:
        data = request.get_json()
        if not data or 'customers' not in data:
            return jsonify({"error": "Missing 'customers' field"}), 400

        customers = data['customers']
        if not customers:
            return jsonify({"error": "Empty customer list"}), 400

        results = []
        for i, customer in enumerate(customers):
            try:
                x = preprocess_row(customer)
                x_scaled = scaler.transform([x])

                prob = float(model.predict_proba(x_scaled)[0][1])
                prediction = "Yes" if prob >= 0.5 else "No"

                retention = get_retention_strategy(prob, customer)

                results.append({
                    "customer_id": customer.get('CustomerID', f'CUST_{i+1}'),
                    "churn_probability": round(prob * 100, 1),
                    "churn_prediction": prediction,
                    "risk_level": retention["priority"],
                    "retention_strategies": retention["strategies"],
                    "monthly_charges": customer.get('Monthly Charges', 0),
                    "tenure_months": customer.get('Tenure Months', 0),
                    "contract": customer.get('Contract', 'Unknown'),
                    "internet_service": customer.get('Internet Service', 'Unknown'),
                })
            except Exception as e:
                results.append({
                    "customer_id": customer.get('CustomerID', f'CUST_{i+1}'),
                    "error": str(e),
                    "churn_probability": 0,
                    "churn_prediction": "Unknown"
                })

        # Summary stats
        churned = [r for r in results if r.get('churn_prediction') == 'Yes']
        summary = {
            "total_customers": len(results),
            "predicted_churners": len(churned),
            "churn_rate": round(len(churned) / len(results) * 100, 1) if results else 0,
            "critical_risk": len([r for r in results if r.get('risk_level') == 'critical']),
            "high_risk": len([r for r in results if r.get('risk_level') == 'high']),
            "medium_risk": len([r for r in results if r.get('risk_level') == 'medium']),
            "low_risk": len([r for r in results if r.get('risk_level') == 'low']),
            "avg_churn_probability": round(np.mean([r.get('churn_probability', 0) for r in results]), 1)
        }

        return jsonify({"predictions": results, "summary": summary})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/features', methods=['GET'])
def get_features():
    """Return expected feature names for CSV validation."""
    return jsonify({"features": features, "required": features})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
