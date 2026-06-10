const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  // "código do livro" de karaokê
  code: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 9999,
  },
  title: { type: String, required: true, trim: true },
  artist: { type: String, required: true, trim: true },
  genre: { type: String, trim: true, lowercase: true },
  language: { type: String, enum: ['pt', 'en', 'es'], default: 'pt' },
  // resolvido lazy via POST /api/songs/:id/resolve
  videoId: { type: String, default: null },
  searchQuery: { type: String, required: true, trim: true },
});

songSchema.index({ title: 'text', artist: 'text' });

module.exports = mongoose.model('Song', songSchema);
