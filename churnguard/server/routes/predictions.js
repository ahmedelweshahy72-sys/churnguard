/**
 * Predictions Routes - Forwards data to Python AI service and returns results
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// ─── POST /api/predictions/analyze ────────────────────────────────────────
router.post('/analyze', auth, async (req, res) => {
  try {
    const { customers, uploadId, filename } = req.body;

    if (!customers || !Array.isArray(customers)) {
      return res.status(400).json({ error: 'customers array is required' });
    }

    // Call Python AI service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, {
      customers
    }, { timeout: 30000 });

    const { predictions, summary } = aiResponse.data;

    // Save to DB
    try {
      const record = new Prediction({
        userId: req.user.userId,
        uploadId: uploadId || null,
        filename: filename || 'upload.csv',
        summary,
        predictions: predictions.slice(0, 500), // store max 500
        createdAt: new Date()
      });
      await record.save();
    } catch (e) { /* MongoDB unavailable */ }

    res.json({ predictions, summary });
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'AI service unavailable. Please make sure the Python service is running on port 5001.'
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/predictions/history ─────────────────────────────────────────
router.get('/history', auth, async (req, res) => {
  try {
    let history = [];
    try {
      history = await Prediction.find({ userId: req.user.userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('-predictions'); // Don't return full predictions in history list
    } catch (e) { /* MongoDB unavailable */ }

    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/predictions/:id ──────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await Prediction.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!record) return res.status(404).json({ error: 'Prediction not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
