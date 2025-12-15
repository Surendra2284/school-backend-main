const mongoose = require('mongoose');

const reportCardSchema = new mongoose.Schema({
  studentId: { type: Number, required: true },
  class: { type: String, required: true },
  marks: [
    {
      subject: String,
      marks: Number
    }
  ],
  total: Number,
  percentage: Number,
  grade: String
}, { timestamps: true });

module.exports = mongoose.model('ReportCard', reportCardSchema);
