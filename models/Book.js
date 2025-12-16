const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  isbn: String,
  totalCopies: Number,
  availableCopies: Number
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
