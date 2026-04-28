import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Search, Filter, TrendingDown,
  Phone, Mail, Tag, RefreshCw, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import './Results.css';

const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const COLORS = ['#ff4d6d', '#ffb830', '#6c63ff', '#00d68f'];
const CHANNEL_ICON = { call: Phone, email: Mail, discount: Tag };

function RiskBadge({ level }) {
  return <span className={`badge badge-${level}`}>{level}</span>;
}

function StrategyCard({ strategy }) {
  const Icon = CHANNEL_ICON[strategy.channel] || Mail;
  return (
    <div className="strategy-chip">
      <Icon size={12} />
      <span>{strategy.action}</span>
    </div>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const data = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('cg_last_results')); }
    catch { return null; }
  }, []);

  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterChurn, setFilterChurn] = useState('all');
  const [sortBy, setSortBy] = useState('prob_desc');
  const [expandedRow, setExpandedRow] = useState(null);

  if (!data) {
    return (
      <div className="results-empty">
        <AlertTriangle size={40} className="text-warning" />
        <h3>No Analysis Results</h3>
        <p className="text-muted">Upload a CSV file and run an analysis first.</p>
        <button className="btn btn-primary" onClick={() => navigate('/upload')}>Go to Upload</button>
      </div>
    );
  }

  const { predictions, summary } = data;

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...predictions];
    if (search) list = list.filter(r => r.customer_id?.toLowerCase().includes(search.toLowerCase()));
    if (filterRisk !== 'all') list = list.filter(r => r.risk_level === filterRisk);
    if (filterChurn !== 'all') list = list.filter(r => r.churn_prediction === filterChurn);
    list.sort((a, b) => {
      if (sortBy === 'prob_desc') return b.churn_probability - a.churn_probability;
      if (sortBy === 'prob_asc') return a.churn_probability - b.churn_probability;
      if (sortBy === 'risk') return RISK_ORDER[a.risk_level] - RISK_ORDER[b.risk_level];
      return 0;
    });
    return list;
  }, [predictions, search, filterRisk, filterChurn, sortBy]);

  // PDF export
  const downloadCSV = () => {
    const headers = ['CustomerID', 'ChurnProbability', 'ChurnPrediction', 'RiskLevel', 'Contract', 'MonthlyCharges', 'TenureMonths'];
    const rows = filtered.map(r => [
      r.customer_id, r.churn_probability, r.churn_prediction,
      r.risk_level, r.contract, r.monthly_charges, r.tenure_months
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'churnguard_predictions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadReport = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(108, 99, 255);
      doc.text('ChurnGuard Analysis Report', 14, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 140);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      // Summary box
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 40);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', 14, 42);

      const summaryData = [
        ['Total Customers', summary.total_customers],
        ['Predicted Churners', summary.predicted_churners],
        ['Churn Rate', `${summary.churn_rate}%`],
        ['Critical Risk', summary.critical_risk],
        ['High Risk', summary.high_risk],
        ['Avg Churn Score', `${summary.avg_churn_probability}%`],
      ];

      doc.autoTable({
        startY: 46,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [108, 99, 255], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        margin: { left: 14 },
        tableWidth: 80,
      });

      // Top at-risk customers
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Top At-Risk Customers', 14, doc.lastAutoTable.finalY + 16);

      const topRisk = filtered.filter(r => r.churn_prediction === 'Yes').slice(0, 20);
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Customer ID', 'Churn %', 'Risk Level', 'Contract', 'Monthly $']],
        body: topRisk.map(r => [r.customer_id, `${r.churn_probability}%`, r.risk_level, r.contract, `$${r.monthly_charges}`]),
        headStyles: { fillColor: [255, 77, 109], textColor: 255 },
        alternateRowStyles: { fillColor: [255, 245, 248] },
        margin: { left: 14 },
      });

      doc.save('ChurnGuard_Report.pdf');
    } catch (err) {
      console.error('PDF generation failed:', err);
      downloadCSV();
    }
  };

  const pieData = [
    { name: 'Critical', value: summary.critical_risk },
    { name: 'High', value: summary.high_risk },
    { name: 'Medium', value: summary.medium_risk },
    { name: 'Low', value: summary.low_risk },
  ];

  return (
    <div className="results-page">
      <div className="page-header fade-up">
        <div>
          <h1>Analysis Results</h1>
          <p className="text-muted">{summary.total_customers} customers analyzed · {summary.churn_rate}% predicted churn rate</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={downloadCSV}><Download size={15} /> Export CSV</button>
          <button className="btn btn-primary" onClick={downloadReport}><Download size={15} /> Download PDF Report</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="summary-cards fade-up">
        {[
          { label: 'Total Analyzed', value: summary.total_customers, color: '#6c63ff' },
          { label: 'Will Churn', value: summary.predicted_churners, color: '#ff4d6d' },
          { label: 'Churn Rate', value: `${summary.churn_rate}%`, color: '#ffb830' },
          { label: 'Critical Risk', value: summary.critical_risk, color: '#ff4d6d' },
          { label: 'High Risk', value: summary.high_risk, color: '#ffb830' },
          { label: 'Avg Score', value: `${summary.avg_churn_probability}%`, color: '#6c63ff' },
        ].map((s, i) => (
          <div key={i} className="sum-card" style={{ '--c': s.color }}>
            <div className="sum-value">{s.value}</div>
            <div className="sum-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="res-charts fade-up">
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v) => [v, 'Customers']} />
              <Legend formatter={v => <span style={{ color: '#9ca3af', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>Churn Probability Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { range: '0-20%', count: predictions.filter(r => r.churn_probability <= 20).length },
              { range: '20-40%', count: predictions.filter(r => r.churn_probability > 20 && r.churn_probability <= 40).length },
              { range: '40-60%', count: predictions.filter(r => r.churn_probability > 40 && r.churn_probability <= 60).length },
              { range: '60-80%', count: predictions.filter(r => r.churn_probability > 60 && r.churn_probability <= 80).length },
              { range: '80-100%', count: predictions.filter(r => r.churn_probability > 80).length },
            ]} barSize={28}>
              <XAxis dataKey="range" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" name="Customers" fill="#6c63ff" radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="res-filters card fade-up">
        <div className="search-wrap">
          <Search size={14} />
          <input
            placeholder="Search customer ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-row">
          <Filter size={14} className="text-muted" />
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filterChurn} onChange={e => setFilterChurn(e.target.value)}>
            <option value="all">All Predictions</option>
            <option value="Yes">Will Churn</option>
            <option value="No">Will Stay</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="prob_desc">Highest Risk First</option>
            <option value="prob_asc">Lowest Risk First</option>
            <option value="risk">By Risk Level</option>
          </select>
          <span className="text-muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
            {filtered.length} of {predictions.length} customers
          </span>
        </div>
      </div>

      {/* Predictions table */}
      <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="results-table full-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Churn Probability</th>
                <th>Prediction</th>
                <th>Risk Level</th>
                <th>Contract</th>
                <th>Internet</th>
                <th>Monthly $</th>
                <th>Tenure</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((r, i) => (
                <React.Fragment key={i}>
                  <tr
                    className={`pred-row ${expandedRow === i ? 'expanded' : ''}`}
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                  >
                    <td className="mono">{r.customer_id}</td>
                    <td>
                      <div className="prob-cell">
                        <div className="prob-track">
                          <div className="prob-fill" style={{
                            width: `${r.churn_probability}%`,
                            background: r.churn_probability > 60 ? 'var(--danger)' : r.churn_probability > 35 ? 'var(--warning)' : 'var(--success)'
                          }} />
                        </div>
                        <span className="prob-num">{r.churn_probability}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${r.churn_prediction === 'Yes' ? 'badge-critical' : 'badge-low'}`}>
                        {r.churn_prediction === 'Yes' ? '⚠ Yes' : '✓ No'}
                      </span>
                    </td>
                    <td><RiskBadge level={r.risk_level} /></td>
                    <td style={{ fontSize: 12 }}>{r.contract}</td>
                    <td style={{ fontSize: 12 }}>{r.internet_service}</td>
                    <td>${r.monthly_charges}</td>
                    <td>{r.tenure_months} mo</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {r.retention_strategies?.slice(0, 2).map((s, j) => (
                          <StrategyCard key={j} strategy={s} />
                        ))}
                      </div>
                    </td>
                  </tr>
                  {expandedRow === i && (
                    <tr className="expand-row">
                      <td colSpan={9}>
                        <div className="expand-content">
                          <strong>Retention Strategies:</strong>
                          <div className="strategy-list">
                            {r.retention_strategies?.map((s, j) => (
                              <div key={j} className="strategy-item">
                                <span className={`badge badge-${r.risk_level}`}>{s.channel}</span>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.action}</div>
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div style={{ padding: '14px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Showing 100 of {filtered.length} results — export CSV for full data
          </div>
        )}
      </div>
    </div>
  );
}
