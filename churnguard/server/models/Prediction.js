const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  uploadId: String,
  filename: String,
  summary: mongoose.Schema.Types.Mixed,
  predictions: [mongoose.Schema.Types.Mixed],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Prediction', PredictionSchema);
