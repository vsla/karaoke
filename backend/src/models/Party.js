const mongoose = require('mongoose');

const queueItemSchema = new mongoose.Schema(
  {
    queueId: { type: String, required: true },
    videoId: { type: String, required: true },
    title: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    singer: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    // 0 = ilimitado
    maxPerSinger: { type: Number, default: 0, min: 0, max: 10 },
    // bloqueia mesma música (videoId) repetida na fila
    blockDuplicates: { type: Boolean, default: false },
    // só permite músicas do livro (esconde busca no YouTube)
    catalogOnly: { type: Boolean, default: false },
  },
  { _id: false }
);

const partySchema = new mongoose.Schema({
  // 4 letras maiúsculas A-Z sem I e O
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: /^[A-HJ-NP-Z]{4}$/,
  },
  name: { type: String, trim: true, maxlength: 60 },
  hostName: { type: String, required: true, trim: true, maxlength: 30 },
  settings: { type: settingsSchema, default: () => ({}) },
  queue: { type: [queueItemSchema], default: [] },
  nowPlaying: { type: queueItemSchema, default: null },
  played: { type: [queueItemSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// Festa expira sozinha após 48h
partySchema.index({ createdAt: 1 }, { expireAfterSeconds: 48 * 60 * 60 });

module.exports = mongoose.model('Party', partySchema);
