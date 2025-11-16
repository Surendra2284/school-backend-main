// models/Studentprogress.js
const mongoose = require('mongoose');

const VALID_STATUS = [
  'Not Started',
  'In Progress',
  'Completed',
  'Needs Attention',
];

const studentProgressSchema = new mongoose.Schema(
  {
    // Ref to Student document
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },

    // Flat studentId for faster queries
    studentId: {
      type: Number,
      required: true,
      index: true,
    },

    className: {
      type: String,
      required: true,
      index: true,
    },

    section: {
      type: String,
    },

    subject: {
      type: String,
      required: true,
      index: true,
    },

    teacher: {
      type: String,
      required: true,
    },

    username: {
      type: String,
      required: true,
    },

    // Stored as 'YYYY-MM-DD'
    date: {
      type: String,
      required: true,
      index: true,
    },

    homework: {
      type: String,
      required: true,
    },

    progressNote: {
      type: String,
      default: '',
    },

    status: {
      type: String,
      enum: VALID_STATUS,
      default: 'Not Started',
    },
    studentRemark: { type: String },
    studentRemarkDate: { type: String }, // 'YYYY-MM-DD'
    score: {
      type: Number,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

// Helpful compound indexes
studentProgressSchema.index({ className: 1, date: 1, subject: 1 });
studentProgressSchema.index(
  { studentId: 1, date: 1, subject: 1 },
  { unique: true } // one record per student + date + subject
);

module.exports = mongoose.model('StudentProgress', studentProgressSchema);
