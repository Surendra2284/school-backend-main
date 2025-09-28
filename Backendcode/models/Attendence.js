const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    className: { type: String, required: true },
    teacher: { type: String, required: true }, // Save the teacher's name
    username: { type: String, required: true }, // Added this field
    date: { type: Date, required: true },
    status: { type: String, required: true } // e.g., 'present', 'absent'
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;