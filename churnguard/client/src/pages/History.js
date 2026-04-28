import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { History as HistoryIcon, FileText, TrendingDown, Clock } from 'lucide-react';
import './History.css';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/predictions/history`)
      .then(r => setHistory(r.data.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;
  }

  return (
    <div className="history-page">
      <div className="page-header fade-up">
        <div>
          <h1>Analysis History</h1>
          <p className="text-muted">All your past churn prediction runs</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="card fade-up empty-history">
          <HistoryIcon size={40} className="text-muted" />
          <h3>No Analysis History Yet</h3>
          <p className="text-muted">Your past analyses will appear here after you run your first prediction.</p>
        </div>
      ) : (
        <div className="history-list fade-up">
          {history.map((item, i) => (
            <div key={i} className="card history-item">
              <div className="hi-icon"><FileText size={20} /></div>
              <div className="hi-body">
                <div className="hi-name">{item.filename || 'Unnamed Upload'}</div>
                <div className="hi-meta">
                  <span><Clock size={12} /> {new Date(item.date || item.createdAt).toLocaleDateString()}</span>
                  {item.total && <span>· {item.total} customers</span>}
                  {item.churnRate != null && <span className="text-danger">· {item.churnRate}% churn</span>}
                </div>
              </div>
              <div className="hi-stats">
                {item.churnRate != null && (
                  <div className="hi-stat">
                    <TrendingDown size={14} className="text-danger" />
                    <span>{item.churnRate}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
