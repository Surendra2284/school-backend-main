// routes/attendance.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Attendance = require('../models/Attendance');
const { VALID_STATUS } = require('../models/Attendance'); // exported above
const Student = require('../models/Student');

// Normalize a date string/Date to [UTC day start, next day)
const toDayRange = (dateInput) => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 1);
  return { start, end };
};

/** -------------------------
 * CREATE / UPSERT (single or bulk)
 * - idempotent by (student, date) unique index
 * - request can contain studentId (school roll) or ObjectIds
 * ------------------------- */
router.post('/attendance', async (req, res) => {
  try {
    const { studentId, studentIds, className, teacher, username, date, status } = req.body;

    if (!className || !teacher || !username || !date || !status) {
      return res.status(400).json({ message: 'className, teacher, username, date, status are required.' });
    }
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ message: `status must be one of ${VALID_STATUS.join(', ')}` });
    }

    // Resolve student ObjectIds
    let ids = [];
    if (Array.isArray(studentIds) && studentIds.length) {
      const asStrings = studentIds.map(String);
      const objIds = asStrings.filter(mongoose.isValidObjectId);
      const schoolIds = asStrings.filter(s => !mongoose.isValidObjectId(s)).map(n => Number(n)).filter(n => !Number.isNaN(n));

      const byObj = objIds.length ? await Student.find({ _id: { $in: objIds } }, { _id: 1 }) : [];
      const bySchool = schoolIds.length ? await Student.find({ studentId: { $in: schoolIds } }, { _id: 1 }) : [];
      ids = [...byObj, ...bySchool].map(s => s._id);
      if (!ids.length) return res.status(404).json({ message: 'No matching students found.' });
    } else if (studentId != null) {
      let doc = null;
      if (mongoose.isValidObjectId(String(studentId))) {
        doc = await Student.findById(String(studentId), { _id: 1 });
      } else {
        const num = Number(studentId);
        if (!Number.isNaN(num)) doc = await Student.findOne({ studentId: num }, { _id: 1 });
      }
      if (!doc) return res.status(404).json({ message: 'Student not found.' });
      ids = [doc._id];
    } else {
      return res.status(400).json({ message: 'Provide studentId or studentIds.' });
    }

    const range = toDayRange(date);
    if (!range) return res.status(400).json({ message: 'Invalid date.' });

    // Bulk upsert (idempotent)
    const ops = ids.map(_id => ({
      updateOne: {
        filter: { student: _id, date: range.start },
        update: {
          $set: { className, teacher, username, date: range.start, status }
        },
        upsert: true
      }
    }));

    const result = await Attendance.bulkWrite(ops, { ordered: false });
    const upserts = (result.upsertedCount || 0);
    const updates = (result.modifiedCount || 0);

    return res.status(200).json({
      message: 'Attendance saved.',
      created: upserts,
      updated: updates
    });
  } catch (error) {
    // Handle duplicate key violations gracefully
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Duplicate (student, date) detected.', error });
    }
    console.error(error);
    res.status(500).json({ message: 'Error saving attendance.', error });
  }
});

/** -------------------------
 * READ with filters
 * ------------------------- */
router.get('/attendance', async (req, res) => {
  try {
    const { className, name, username, studentId, date, status, page = 1, limit = 50 } = req.query;

    const attQuery = {};
    if (username) attQuery.username = { $regex: String(username), $options: 'i' };
    if (status && VALID_STATUS.includes(String(status))) attQuery.status = status;

    if (date) {
      const r = toDayRange(date);
      if (!r) return res.status(400).json({ message: 'Invalid date.' });
      attQuery.date = { $gte: r.start, $lt: r.end };
    }

    // Student-based filters
    let needStudentFilter = false;
    const stuQuery = {};
    if (className) { stuQuery.class = className; needStudentFilter = true; }
    if (name) { stuQuery.name = { $regex: String(name), $options: 'i' }; needStudentFilter = true; }
    if (studentId) {
      const or = [];
      if (!Number.isNaN(Number(studentId))) or.push({ studentId: Number(studentId) });
      if (mongoose.isValidObjectId(String(studentId))) or.push({ _id: String(studentId) });
      if (or.length) { stuQuery.$or = or; needStudentFilter = true; }
    }

    if (needStudentFilter) {
      const students = await Student.find(stuQuery, { _id: 1 });
      attQuery.student = { $in: students.map(s => s._id) };
    }

    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
    const list = await Attendance.find(attQuery)
      .populate({ path: 'student', model: 'Student', select: 'name class studentId' })
      .sort({ date: -1, _id: -1 })
      .skip(skip)
      .limit(Math.max(1, Number(limit)));

    const total = await Attendance.countDocuments(attQuery);

    return res.status(200).json({ total, page: Number(page), limit: Number(limit), data: list });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving attendance.', error });
  }
});

/** -------------------------
 * CORRECT a record by student + date (idempotent)
 * - Use when you know the student + day, but not the record _id
 * - Adds to correctionHistory
 * ------------------------- */
router.patch('/attendance/correct', async (req, res) => {
  try {
    const { studentId, date, newStatus, reason, correctedBy } = req.body;
    if (!studentId || !date || !newStatus) {
      return res.status(400).json({ message: 'studentId, date, newStatus are required.' });
    }
    if (!VALID_STATUS.includes(newStatus)) {
      return res.status(400).json({ message: `newStatus must be one of ${VALID_STATUS.join(', ')}` });
    }

    // Resolve student ObjectId
    let studentDoc = null;
    if (mongoose.isValidObjectId(String(studentId))) {
      studentDoc = await Student.findById(String(studentId), { _id: 1 });
    } else {
      const num = Number(studentId);
      if (!Number.isNaN(num)) studentDoc = await Student.findOne({ studentId: num }, { _id: 1 });
    }
    if (!studentDoc) return res.status(404).json({ message: 'Student not found.' });

    const r = toDayRange(date);
    if (!r) return res.status(400).json({ message: 'Invalid date.' });

    const record = await Attendance.findOne({ student: studentDoc._id, date: { $gte: r.start, $lt: r.end } });
    if (!record) return res.status(404).json({ message: 'Attendance record not found for that day.' });

    const fromStatus = record.status;
    if (fromStatus === newStatus) {
      return res.status(200).json({ message: 'No change. Status already set.', record });
    }

    record.status = newStatus;
    record.correctionHistory = record.correctionHistory || [];
    record.correctionHistory.push({
      changedBy: correctedBy || req.body.username || 'system',
      fromStatus,
      toStatus: newStatus,
      reason: reason || 'manual correction'
    });

    await record.save();
    return res.status(200).json({ message: 'Attendance corrected successfully.', record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error correcting attendance.', error });
  }
});

/** -------------------------
 * UPDATE by _id (partial)
 * ------------------------- */
router.patch('/attendance/:id', async (req, res) => {
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
      const r = toDayRange(req.body.date);
      if (!r) return res.status(400).json({ message: 'Invalid date.' });
      payload.date = r.start;
    }
    if (req.body.teacher) payload.teacher = req.body.teacher;
    if (req.body.username) payload.username = req.body.username;
    if (req.body.className) payload.className = req.body.className;

    const prev = await Attendance.findById(id);
    if (!prev) return res.status(404).json({ message: 'Attendance record not found.' });

    const updated = await Attendance.findByIdAndUpdate(id, { $set: payload }, { new: true });
    if (payload.status && payload.status !== prev.status) {
      await Attendance.findByIdAndUpdate(id, {
        $push: {
          correctionHistory: {
            changedBy: req.body.correctedBy || req.body.username || 'system',
            fromStatus: prev.status,
            toStatus: payload.status,
            reason: req.body.reason || 'manual patch'
          }
        }
      });
    }
    const fresh = await Attendance.findById(id);
    res.status(200).json({ message: 'Attendance updated.', record: fresh });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating attendance.', error });
  }
});
/** -------------------------
 * DELETE by _id
 * ------------------------- */
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