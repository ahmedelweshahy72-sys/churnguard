const mongoose = require('mongoose');

const UploadSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  filename: String,
  rowCount: Number,
  columns: [String],
  status: { type: String, default: 'processed' },
  createdAt: { type: Date, default: Date.now }
});

const PredictionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  uploadId: String,
  filename: String,
  summary: mongoose.Schema.Types.Mixed,
  predictions: [mongoose.Schema.Types.Mixed],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Upload', UploadSchema);
