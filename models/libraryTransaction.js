const mongoose = require('mongoose');

const libraryTransactionSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  type: { type: String, enum: ['ISSUE', 'RETURN'] },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LibraryTransaction', libraryTransactionSchema);
