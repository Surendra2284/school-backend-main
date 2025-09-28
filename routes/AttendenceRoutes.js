const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendence'); // Import Attendance model

// Add new attendance


const Student = require('../models/Student'); // Path to the student model

// Save attendance
router.post('/attendance/save', async (req, res) => {
    const { studentId, date, status } = req.body;
    try {
        const student = await Student.findOne({ studentId });
        if (student) {
            student.attendance.push({ date, status });
            await student.save();
            return res.status(200).json({ message: 'Attendance saved successfully.' });
        }
        res.status(404).json({ message: 'Student not found.' });
    } catch (error) {
        res.status(500).json({ message: 'Error saving attendance.', error });
    }
});

// Search students by class, name, or ID
router.get('/attendance/search', async (req, res) => {
    const { className, name, studentId } = req.query;
    try {
        const query = {};
        if (className) query.class = className;
        if (name) query.name = { $regex: name, $options: 'i' }; // Case-insensitive search
        if (studentId) query.studentId = studentId;
        const students = await Student.find(query);
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error searching students.', error });
    }
});

// Update attendance
router.put('/attendance/update/:id', async (req, res) => {
    const { id } = req.params;
    const { date, status } = req.body;
    try {
        const student = await Student.findById(id);
        if (student) {
            const record = student.attendance.find(att => att.date.toISOString() === new Date(date).toISOString());
            if (record) {
                record.status = status;
                await student.save();
                return res.status(200).json({ message: 'Attendance updated successfully.' });
            }
            return res.status(404).json({ message: 'Attendance record not found.' });
        }
        res.status(404).json({ message: 'Student not found.' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating attendance.', error });
    }
});

// Delete attendance
router.delete('/attendance/delete/:id', async (req, res) => {
    const { id } = req.params;
    const { date } = req.body;
    try {
        const student = await Student.findById(id);
        if (student) {
            student.attendance = student.attendance.filter(att => att.date.toISOString() !== new Date(date).toISOString());
            await student.save();
            return res.status(200).json({ message: 'Attendance deleted successfully.' });
        }
        res.status(404).json({ message: 'Student not found.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting attendance.', error });
    }
});


// Create attendance
router.post('/attendance', async (req, res) => {
    const { studentIds, date, status } = req.body; // studentIds is an array
    try {
        const attendanceRecords = studentIds.map(id => ({
            student: id,
            date,
            status
        }));
        await Attendance.insertMany(attendanceRecords);
        res.status(200).json({ message: 'Attendance saved successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error saving attendance.', error });
    }
});

// Get attendance with search filters
router.get('/attendance', async (req, res) => {
    const { className, name, classTeacher, studentId } = req.query;
    try {
        const query = {};

        if (className || name || classTeacher || studentId) {
            const studentQuery = {};
            if (className) studentQuery.class = className;
            if (name) studentQuery.name = { $regex: name, $options: 'i' }; // Case-insensitive
            if (classTeacher) studentQuery.classTeacher = { $regex: classTeacher, $options: 'i' };
            if (studentId) studentQuery.studentId = studentId;

            const students = await Student.find(studentQuery);
            query.student = { $in: students.map(s => s._id) };
        }

        const attendance = await Attendance.find(query).populate('student');
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving attendance.', error });
    }
});

// Update attendance
// Save attendance
router.post('/attendance', async (req, res) => {
  const { studentIds, className, teacher, username, date, status } = req.body; // Added username

  try {
      const attendanceRecords = studentIds.map(id => ({
          student: id,
          className,
          teacher,
          username, // Save the username
          date,
          status
      }));

      await Attendance.insertMany(attendanceRecords);
      res.status(200).json({ message: 'Attendance saved successfully.' });
  } catch (error) {
      res.status(500).json({ message: 'Error saving attendance.', error });
  }
});

router.get('/attendance/search', async (req, res) => {
  const { className, name, username } = req.query;
  const query = {};

  if (className && className.trim()) query.className = className;
  if (username && username.trim()) query.username = { $regex: username, $options: 'i' };
  if (name && name.trim()) {
      const students = await Student.find({ name: { $regex: name, $options: 'i' } });
      query.student = { $in: students.map(student => student._id) };
  }

  try {
      const attendance = await Attendance.find(query).populate('student');
      res.status(200).json(attendance);
  } catch (error) {
      res.status(500).json({ message: 'Error retrieving attendance.', error });
  }
});
// Delete attendance
router.delete('/attendance/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const attendance = await Attendance.findById(id);
        if (attendance) {
            await attendance.remove();
            return res.status(200).json({ message: 'Attendance deleted successfully.' });
        }
        res.status(404).json({ message: 'Attendance record not found.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting attendance.', error });
    }
});

module.exports = router;


