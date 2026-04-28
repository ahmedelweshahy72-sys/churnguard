/**
 * Upload Routes - Handle CSV file uploads and processing
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const Upload = require('../models/Upload');

// Store uploads in memory (temp)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// ─── POST /api/uploads ─────────────────────────────────────────────────────
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse CSV from buffer
    const rows = [];
    const content = req.file.buffer.toString('utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
      rows.push(row);
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Save record to DB
    let uploadRecord = {
      _id: `upload_${Date.now()}`,
      userId: req.user.userId,
      filename: req.file.originalname,
      rowCount: rows.length,
      columns: headers,
      status: 'processed',
      createdAt: new Date()
    };

    try {
      const newUpload = new Upload({
        userId: req.user.userId,
        filename: req.file.originalname,
        rowCount: rows.length,
        columns: headers,
        status: 'processed'
      });
      uploadRecord = await newUpload.save();
    } catch (e) { /* MongoDB unavailable */ }

    res.json({
      uploadId: uploadRecord._id,
      filename: req.file.originalname,
      rowCount: rows.length,
      columns: headers,
      preview: rows.slice(0, 5),    // First 5 rows for preview
      data: rows                     // All rows for prediction
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/uploads/history ──────────────────────────────────────────────
router.get('/history', auth, async (req, res) => {
  try {
    let uploads = [];
    try {
      uploads = await Upload.find({ userId: req.user.userId })
        .sort({ createdAt: -1 })
        .limit(20);
    } catch (e) { /* MongoDB unavailable */ }

    res.json({ uploads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
