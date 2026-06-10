const mongoose = require('mongoose');

const searchCacheSchema = new mongoose.Schema({
  // query normalizada (lowercase + trim)
  query: { type: String, required: true, unique: true },
  // array de { videoId, title, thumbnail, channel }
  results: { type: mongoose.Schema.Types.Mixed, default: [] },
  createdAt: { type: Date, default: Date.now },
});

// Cache expira em 7 dias
searchCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('SearchCache', searchCacheSchema);
