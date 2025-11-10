const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Attendance = require('../models/Attendence'); // your file name
const Student = require('../models/Student');       // exports model named 'Students'

const VALID_STATUS = ['Present', 'Absent', 'Late'];

const toDayRange = (dateStr) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 1);
  return { start, end };
};

/** CREATE (single or bulk) */
router.post('/attendance', async (req, res) => {
  try {
    const { studentId, studentIds, className, teacher, username, date, status } = req.body;

    if (!className || !teacher || !username || !date || !status) {
      return res.status(400).json({ message: 'className, teacher, username, date, status are required.' });
    }
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ message: `status must be one of ${VALID_STATUS.join(', ')}` });
    }

    // Resolve Student ObjectIds
    let ids = [];
    if (Array.isArray(studentIds) && studentIds.length) {
      const validIds = studentIds.filter(id => mongoose.isValidObjectId(id));
      if (!validIds.length) return res.status(400).json({ message: 'No valid studentIds.' });
      const found = await Student.find({ _id: { $in: validIds } }, { _id: 1 });
      if (!found.length) return res.status(404).json({ message: 'No matching students found.' });
      ids = found.map(s => s._id);
    } else if (studentId) {
      let doc = null;
      if (mongoose.isValidObjectId(String(studentId))) {
        doc = await Student.findById(studentId, { _id: 1 });
      } else {
        doc = await Student.findOne({ studentId: Number(studentId) }, { _id: 1 });
      }
      if (!doc) return res.status(404).json({ message: 'Student not found.' });
      ids = [doc._id];
    } else {
      return res.status(400).json({ message: 'Provide studentId or studentIds.' });
    }

    const range = toDayRange(date);
    if (!range) return res.status(400).json({ message: 'Invalid date.' });

    const docs = ids.map(_id => ({
      student: _id,
      className,
      teacher,
      username,
      date: range.start, // normalized to day start (UTC)
      status,
    }));

    const inserted = await Attendance.insertMany(docs);
    return res.status(200).json({ message: 'Attendance saved successfully.', inserted: inserted.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error saving attendance.', error });
  }
});

/** READ with filters */
router.get('/attendance', async (req, res) => {
  try {
    const { className, name, username, studentId, date, status } = req.query;

    const attQuery = {};
    if (username) attQuery.username = { $regex: String(username), $options: 'i' };
    if (status && VALID_STATUS.includes(String(status))) attQuery.status = status;

    if (date) {
      const range = toDayRange(date);
      if (!range) return res.status(400).json({ message: 'Invalid date.' });
      attQuery.date = { $gte: range.start, $lt: range.end };
    }

    // filters that rely on Student
    let needStudentFilter = false;
    const stuQuery = {};
    if (className) { stuQuery.class = className; needStudentFilter = true; } // Student field is 'class'
    if (name) { stuQuery.name = { $regex: String(name), $options: 'i' }; needStudentFilter = true; }
    if (studentId) {
      const or = [];
      if (!Number.isNaN(Number(studentId))) or.push({ studentId: Number(studentId) });
      if (mongoose.isValidObjectId(String(studentId))) or.push({ _id: studentId });
      if (or.length) { stuQuery.$or = or; needStudentFilter = true; }
    }

    if (needStudentFilter) {
      const students = await Student.find(stuQuery, { _id: 1 });
      attQuery.student = { $in: students.map(s => s._id) };
    }

    const list = await Attendance.find(attQuery)
      .populate({ path: 'student', model: 'Students', select: 'name class studentId' }) // IMPORTANT: model is 'Students'
      .sort({ date: -1, _id: -1 });

    return res.status(200).json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving attendance.', error });
  }
});

/** UPDATE (partial) */
router.put('/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = {};

    if (req.body.status) {
      if (!VALID_STATUS.includes(req.body.status)) {
        return res.status(400).json({ message: `status must be one of ${VALID_STATUS.join(', ')}` });
      }
      payload.status = req.body.status;
    }
    if (req.body.date) {
      const range = toDayRange(req.body.date);
      if (!range) return res.status(400).json({ message: 'Invalid date.' });
      payload.date = range.start;
    }
    if (req.body.teacher) payload.teacher = req.body.teacher;
    if (req.body.username) payload.username = req.body.username;
    if (req.body.className) payload.className = req.body.className;

    const updated = await Attendance.findByIdAndUpdate(id, { $set: payload }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Attendance record not found.' });
    res.status(200).json({ message: 'Attendance updated successfully.', record: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating attendance.', error });
  }
});

/** DELETE */
router.delete('/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Attendance.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Attendance record not found.' });
    res.status(200).json({ message: 'Attendance deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting attendance.', error });
  }
});

module.exports = router;
