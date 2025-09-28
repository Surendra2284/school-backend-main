const mongoose = require('mongoose');

const activeSessionSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // Ensure one session per user
  token: { type: String, required: true }, // Store the JWT token
  createdAt: { type: Date, default: Date.now, expires: '1h' }, // Automatically expire the session after 1 hour
});

module.exports = mongoose.model('ActiveSession', activeSessionSchema);