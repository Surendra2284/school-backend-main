const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  teacherId: String,
  title: String,
  description: String,
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending'
  },
  remark: String
}, { timestamps: true });

module.exports = mongoose.model('TeacherTask', taskSchema);
