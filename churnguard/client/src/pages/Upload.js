import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../context/AuthContext';
import {
  Upload as UploadIcon, FileText, CheckCircle, AlertCircle,
  ChevronRight, X, Eye
} from 'lucide-react';
import './Upload.css';

const REQUIRED_COLS = [
  'CustomerID', 'Gender', 'Senior Citizen', 'Partner', 'Dependents',
  'Tenure Months', 'Phone Service', 'Multiple Lines', 'Internet Service',
  'Online Security', 'Online Backup', 'Device Protection', 'Tech Support',
  'Streaming TV', 'Streaming Movies', 'Contract', 'Paperless Billing',
  'Payment Method', 'Monthly Charges', 'Total Charges'
];

export default function Upload() {
  const navigate = useNavigate();
  const inputRef = useRef();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploadData, setUploadData] = useState(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1=select, 2=preview, 3=analyzing

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      setError('Please upload a CSV file (.csv)');
      return;
    }
    setFile(f);
    setError('');

    // Quick local parse for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1, 6).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      });
      setPreview({ headers, rows, totalRows: lines.length - 1 });
    };
    reader.readAsText(f);
  }, []);

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/uploads`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadData(res.data);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadData) return;
    setAnalyzing(true); setStep(3); setError('');
    try {
      const res = await axios.post(`${API}/predictions/analyze`, {
        customers: uploadData.data,
        uploadId: uploadData.uploadId,
        filename: uploadData.filename
      });
      // Store in session for dashboard and results page
      sessionStorage.setItem('cg_last_results', JSON.stringify(res.data));
      navigate('/results');
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Is the AI service running?');
      setStep(2); setAnalyzing(false);
    }
  };

  return (
    <div className="upload-page">
      <div className="page-header fade-up">
        <div>
          <h1>Analyze Customer Data</h1>
          <p className="text-muted">Upload a CSV file to predict churn and get retention insights</p>
        </div>
      </div>

      {/* Steps */}
      <div className="steps fade-up">
        {['Upload CSV', 'Preview Data', 'AI Analysis'].map((s, i) => (
          <div key={i} className={`step ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`}>
            <div className="step-num">{step > i + 1 ? <CheckCircle size={14} /> : i + 1}</div>
            <span>{s}</span>
            {i < 2 && <ChevronRight size={14} className="step-arrow" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="upload-error fade-up">
          <AlertCircle size={15} /><span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Step 1: Drop zone */}
      {step === 1 && (
        <div
          className={`drop-zone card fade-up ${drag ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => !file && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".csv" hidden onChange={e => handleFile(e.target.files[0])} />

          {!file ? (
            <>
              <div className="drop-icon"><UploadIcon size={32} /></div>
              <h3>Drop your CSV file here</h3>
              <p className="text-muted">or click to browse — max 10MB</p>
              <div className="drop-hint">
                <FileText size={14} />
                Supports Telco customer churn CSV format
              </div>
            </>
          ) : (
            <div className="file-selected">
              <div className="file-icon"><FileText size={24} /></div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-meta text-muted">
                  {(file.size / 1024).toFixed(1)} KB
                  {preview && ` · ${preview.totalRows.toLocaleString()} rows · ${preview.headers.length} columns`}
                </div>
              </div>
              <button className="remove-file" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}>
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Preview when file selected */}
      {step === 1 && preview && (
        <div className="card fade-up preview-card">
          <div className="chart-header">
            <div>
              <h3><Eye size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Data Preview</h3>
              <p className="text-muted" style={{ fontSize: 12 }}>First 5 rows of {preview.totalRows} total</p>
            </div>
            <div className="col-check">
              {REQUIRED_COLS.every(c => preview.headers.includes(c))
                ? <span className="text-success" style={{ fontSize: 12 }}>✓ All required columns found</span>
                : <span className="text-warning" style={{ fontSize: 12 }}>⚠ Some columns may be missing</span>
              }
            </div>
          </div>
          <div className="preview-table-wrap">
            <table className="results-table">
              <thead>
                <tr>{preview.headers.slice(0, 8).map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i}>{preview.headers.slice(0, 8).map(h => <td key={h}>{row[h]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="upload-actions">
            <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? <><span className="spinner" /> Processing...</> : <><UploadIcon size={15} /> Upload & Continue</>}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Confirm & analyze */}
      {step === 2 && uploadData && (
        <div className="card fade-up confirm-card">
          <CheckCircle size={40} className="confirm-icon" />
          <h3>File Processed Successfully</h3>
          <p className="text-muted">
            <strong>{uploadData.rowCount.toLocaleString()}</strong> customer records ready for AI analysis.
          </p>

          <div className="confirm-stats">
            <div className="confirm-stat">
              <span className="stat-value">{uploadData.rowCount.toLocaleString()}</span>
              <span className="text-muted">Total Rows</span>
            </div>
            <div className="confirm-stat">
              <span className="stat-value">{uploadData.columns.length}</span>
              <span className="text-muted">Columns</span>
            </div>
            <div className="confirm-stat">
              <span className="stat-value">LR</span>
              <span className="text-muted">ML Model</span>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }} onClick={handleAnalyze}>
            Run AI Analysis <ChevronRight size={16} />
          </button>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => { setStep(1); setFile(null); setPreview(null); setUploadData(null); }}>
            Upload Different File
          </button>
        </div>
      )}

      {/* Step 3: Analyzing */}
      {step === 3 && (
        <div className="card fade-up analyzing-card">
          <div className="analyzing-anim">
            <div className="ring r1" />
            <div className="ring r2" />
            <div className="ring r3" />
            <div className="ring-center">AI</div>
          </div>
          <h3>Analyzing Your Data</h3>
          <p className="text-muted">Running Logistic Regression model on {uploadData?.rowCount?.toLocaleString()} customers…</p>
          <div className="analyze-steps">
            {['Sending data to AI service', 'Calculating churn probabilities', 'Generating retention insights'].map((s, i) => (
              <div key={i} className="analyze-step">
                <span className="spinner" style={{ width: 14, height: 14 }} />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required columns info */}
      {step === 1 && !file && (
        <div className="card fade-up cols-hint">
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Required CSV Columns</h3>
          <div className="cols-grid">
            {REQUIRED_COLS.map(c => (
              <span key={c} className="col-tag">{c}</span>
            ))}
          </div>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 12 }}>
            Download the <a href="/sample.csv" style={{ color: 'var(--accent)' }}>sample dataset</a> to see the expected format.
          </p>
        </div>
      )}
    </div>
  );
}
