const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    videoId: { type: String, required: true },
    title: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    artist: { type: String },
    songCode: { type: Number },
  },
  { _id: false }
);

const partyHistorySchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, default: '' },
    role: { type: String, enum: ['host', 'guest'], default: 'guest' },
    lastSeen: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  // nome em lowercase para unicidade case-insensitive
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 2,
    maxlength: 20,
  },
  // nome original como o usuário digitou
  displayName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 20,
  },
  pinHash: { type: String, required: true },
  favorites: { type: [favoriteSchema], default: [] },
  partyHistory: { type: [partyHistorySchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
