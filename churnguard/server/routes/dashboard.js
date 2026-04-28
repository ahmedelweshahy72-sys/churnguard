/**
 * Dashboard Routes - Aggregated stats for the UI
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');

router.get('/stats', auth, async (req, res) => {
  try {
    let stats = {
      totalAnalyses: 0,
      totalCustomersAnalyzed: 0,
      avgChurnRate: 0,
      totalHighRisk: 0,
      recentActivity: []
    };

    try {
      const predictions = await Prediction.find({ userId: req.user.userId });
      stats.totalAnalyses = predictions.length;
      stats.totalCustomersAnalyzed = predictions.reduce((s, p) => s + (p.summary?.total_customers || 0), 0);

      const rates = predictions.map(p => p.summary?.churn_rate || 0).filter(Boolean);
      stats.avgChurnRate = rates.length > 0
        ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length * 10) / 10
        : 0;

      stats.totalHighRisk = predictions.reduce((s, p) =>
        s + (p.summary?.critical_risk || 0) + (p.summary?.high_risk || 0), 0);

      stats.recentActivity = predictions
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(p => ({
          id: p._id,
          filename: p.filename,
          churnRate: p.summary?.churn_rate,
          total: p.summary?.total_customers,
          date: p.createdAt
        }));
    } catch (e) { /* MongoDB unavailable */ }

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
