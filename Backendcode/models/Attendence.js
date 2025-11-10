// models/Attendance.js
const mongoose = require('mongoose');

const VALID_STATUS = ['Present', 'Absent', 'Leave'];

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  className: { type: String, required: true, index: true },
  teacher: { type: String, required: true },
  username: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true }, // normalized to UTC day start
  status: { type: String, enum: VALID_STATUS, required: true },

  // optional audit trail for corrections
  correctionHistory: [{
    changedAt: { type: Date, default: Date.now },
    changedBy: String,       // username or admin id
    fromStatus: String,
    toStatus: String,
    reason: String
  }]
}, { timestamps: true });

// Ensure one record per (student, date)
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
module.exports.VALID_STATUS = VALID_STATUS;
