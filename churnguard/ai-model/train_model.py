"""
ChurnGuard - ML Model Training Script
Run:  python train_model.py
"""
import os, pandas as pd, numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, 'data', 'sample_churn_data.csv')

FEATURES = ['Gender','Senior Citizen','Partner','Dependents','Tenure Months',
            'Phone Service','Multiple Lines','Internet Service','Online Security',
            'Online Backup','Device Protection','Tech Support','Streaming TV',
            'Streaming Movies','Contract','Paperless Billing','Payment Method',
            'Monthly Charges','Total Charges']
TARGET   = 'Churn Value'
NUM_COLS = ['Tenure Months','Monthly Charges','Total Charges']
CAT_COLS = [f for f in FEATURES if f not in NUM_COLS]

def train(path=DATA_PATH):
    print("=== ChurnGuard Model Training ===")
    df = pd.read_csv(path)
    print(f"Loaded {len(df)} rows")
    df['Total Charges'] = pd.to_numeric(df['Total Charges'], errors='coerce')
    for c in NUM_COLS: df[c] = df[c].fillna(df[c].median())
    for c in CAT_COLS: df[c] = df[c].fillna('Unknown').astype(str)

    encoders = {}
    for c in CAT_COLS:
        le = LabelEncoder()
        df[c] = le.fit_transform(df[c])
        encoders[c] = list(le.classes_)

    X = df[FEATURES].values.astype(float)
    y = df[TARGET].values
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    scaler = StandardScaler()
    model  = LogisticRegression(max_iter=1000, C=0.5, random_state=42)
    model.fit(scaler.fit_transform(X_tr), y_tr)
    preds = model.predict(scaler.transform(X_te))
    print(f"Accuracy: {accuracy_score(y_te, preds)*100:.2f}%")
    print(classification_report(y_te, preds, target_names=['Stay','Churn']))

    joblib.dump(model,    os.path.join(BASE_DIR,'model.pkl'))
    joblib.dump(scaler,   os.path.join(BASE_DIR,'scaler.pkl'))
    joblib.dump(encoders, os.path.join(BASE_DIR,'encoders.pkl'))
    joblib.dump(FEATURES, os.path.join(BASE_DIR,'features.pkl'))
    print("✅ All artifacts saved.")

if __name__ == '__main__':
    train()
