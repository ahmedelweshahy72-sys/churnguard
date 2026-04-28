import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Users, TrendingDown, AlertTriangle, BarChart2,
  ArrowUpRight, Upload, Activity
} from 'lucide-react';
import './Dashboard.css';

const COLORS = ['#ff4d6d', '#6c63ff', '#ffb830', '#00d68f'];

// Demo data shown when no real analysis yet
const DEMO_STATS = {
  churnByContract: [
    { name: 'Month-to-Month', churn: 42.7, safe: 57.3 },
    { name: 'One Year', churn: 11.3, safe: 88.7 },
    { name: 'Two Year', churn: 2.8, safe: 97.2 },
  ],
  riskDist: [
    { name: 'Critical', value: 12 },
    { name: 'High', value: 19 },
    { name: 'Medium', value: 28 },
    { name: 'Low', value: 41 },
  ],
  churnByService: [
    { name: 'Fiber Optic', rate: 41.9 },
    { name: 'DSL', rate: 19.0 },
    { name: 'No Internet', rate: 7.4 },
  ]
};

function StatCard({ icon: Icon, label, value, sub, color = 'accent', trend }) {
  return (
    <div className="stat-card fade-up">
      <div className={`stat-icon ${color}`}>
        <Icon size={20} />
      </div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
      {trend && (
        <div className={`stat-trend ${trend > 0 ? 'up' : 'down'}`}>
          <ArrowUpRight size={14} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="ct-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}%</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Try to get real stats from backend; fall back to demo
  useEffect(() => {
    axios.get(`${API}/dashboard/stats`)
      .then(r => setStats(r.data))
      .catch(() => setStats({ totalAnalyses: 0, totalCustomersAnalyzed: 0, avgChurnRate: 0, totalHighRisk: 0 }))
      .finally(() => setLoading(false));
  }, []);

  // Get last results from sessionStorage (set after analysis)
  const lastResults = (() => {
    try { return JSON.parse(sessionStorage.getItem('cg_last_results')); } catch { return null; }
  })();

  const summary = lastResults?.summary;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="page-header fade-up">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted">Welcome back, {user?.name?.split(' ')[0]}. Here's your churn intelligence overview.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/upload')}>
          <Upload size={16} />
          New Analysis
        </button>
      </div>

      {/* KPI cards */}
      <div className="stats-grid">
        <StatCard
          icon={Users}
          label="Customers Analyzed"
          value={summary?.total_customers ? summary.total_customers.toLocaleString() : (stats?.totalCustomersAnalyzed?.toLocaleString() || '—')}
          color="accent"
        />
        <StatCard
          icon={TrendingDown}
          label="Predicted Churners"
          value={summary?.predicted_churners ?? '—'}
          sub={summary?.churn_rate ? `${summary.churn_rate}% churn rate` : 'Run an analysis to see'}
          color="danger"
        />
        <StatCard
          icon={AlertTriangle}
          label="Critical Risk"
          value={summary?.critical_risk ?? stats?.totalHighRisk ?? '—'}
          sub="Need immediate action"
          color="warning"
        />
        <StatCard
          icon={BarChart2}
          label="Avg Churn Score"
          value={summary?.avg_churn_probability ? `${summary.avg_churn_probability}%` : '—'}
          color="success"
        />
      </div>

      {/* Charts row */}
      <div className="charts-row">
        {/* Churn by Contract */}
        <div className="card chart-card fade-up">
          <div className="chart-header">
            <div>
              <h3>Churn Rate by Contract Type</h3>
              <p className="text-muted" style={{ fontSize: 12 }}>Industry benchmark data</p>
            </div>
            <Activity size={16} className="text-accent" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DEMO_STATS.churnByContract} barSize={26}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="churn" name="Churn %" fill="#ff4d6d" radius={[5,5,0,0]} />
              <Bar dataKey="safe" name="Retained %" fill="#6c63ff" radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="card chart-card fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="chart-header">
            <div>
              <h3>Risk Distribution</h3>
              <p className="text-muted" style={{ fontSize: 12 }}>
                {summary ? 'Current analysis' : 'Demo data — run analysis to update'}
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={summary ? [
                  { name: 'Critical', value: summary.critical_risk },
                  { name: 'High', value: summary.high_risk },
                  { name: 'Medium', value: summary.medium_risk },
                  { name: 'Low', value: summary.low_risk },
                ] : DEMO_STATS.riskDist}
                innerRadius={55} outerRadius={90}
                paddingAngle={3} dataKey="value"
              >
                {DEMO_STATS.riskDist.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v, 'Customers']} />
              <Legend formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Churn by Internet Service */}
        <div className="card chart-card fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="chart-header">
            <div>
              <h3>Churn by Internet Service</h3>
              <p className="text-muted" style={{ fontSize: 12 }}>Industry benchmark</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DEMO_STATS.churnByService} layout="vertical" barSize={20}>
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rate" name="Churn Rate %" fill="#6c63ff" radius={[0,5,5,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CTA if no analysis */}
      {!summary && (
        <div className="card cta-card fade-up">
          <div className="cta-icon"><Upload size={28} /></div>
          <h3>Upload your first dataset</h3>
          <p className="text-muted">Upload a CSV file with customer data to get AI-powered churn predictions and retention recommendations.</p>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>
            Start Analysis
          </button>
        </div>
      )}

      {/* Latest predictions table */}
      {lastResults?.predictions && (
        <div className="card fade-up" style={{ marginTop: 24 }}>
          <div className="chart-header">
            <h3>Latest Prediction Results</h3>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate('/results')}>
              View All
            </button>
          </div>
          <div className="results-table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Churn Prob.</th>
                  <th>Prediction</th>
                  <th>Risk Level</th>
                  <th>Contract</th>
                  <th>Monthly $</th>
                </tr>
              </thead>
              <tbody>
                {lastResults.predictions.slice(0, 8).map((r, i) => (
                  <tr key={i}>
                    <td className="mono">{r.customer_id}</td>
                    <td>
                      <div className="prob-bar-wrap">
                        <div className="prob-bar" style={{ width: `${r.churn_probability}%`, background: r.churn_probability > 60 ? 'var(--danger)' : r.churn_probability > 35 ? 'var(--warning)' : 'var(--success)' }} />
                        <span>{r.churn_probability}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${r.churn_prediction === 'Yes' ? 'badge-critical' : 'badge-low'}`}>
                        {r.churn_prediction}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${r.risk_level}`}>{r.risk_level}</span>
                    </td>
                    <td className="text-dim">{r.contract}</td>
                    <td className="text-dim">${r.monthly_charges}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
