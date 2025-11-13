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
// GET /attendance
// Put this where your other routes are defined
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

router.get('/attendance', async (req, res) => {
  try {
    // --- 0) debug: show incoming query ---
    console.log('GET /attendance query ->', req.query);

    const {
      className,
      name,
      username,
      student: studentParamRaw,
      studentId: studentIdParamRaw,
      date,
      status,
      page = 1,
      limit = 50
    } = req.query;

    const attQuery = {};

    // basic filters
    if (username) attQuery.username = { $regex: String(username), $options: 'i' };
    if (status && Array.isArray(Attendance.VALID_STATUS) && Attendance.VALID_STATUS.includes(String(status))) {
      attQuery.status = String(status);
    }

    if (date) {
      const r = toDayRange(date);
      if (!r) return res.status(400).json({ message: 'Invalid date.' });
      attQuery.date = { $gte: r.start, $lt: r.end };
    }

    // --- 1) Normalize student/studentId input into a single value if provided ---
    const studentParam = (studentParamRaw ?? '').toString().trim();
    const studentIdParam = (studentIdParamRaw ?? '').toString().trim();

    let appliedStudentFilter = false;

    // If explicit student param provided (preferred)
    const stud = studentParam || studentIdParam;
    if (stud) {
      // Build OR clauses to defensively match different storage shapes:
      //  - stored as ObjectId in "student"
      //  - stored as string in "student"
      //  - stored as numeric "studentId" on Attendance
      const orClauses = [];

      if (mongoose.isValidObjectId(stud)) {
        orClauses.push({ student: mongoose.Types.ObjectId(stud) });
        // defensive: if some documents store string ids
        orClauses.push({ student: stud });
      }

      if (!Number.isNaN(Number(stud))) {
        // numeric school id stored on attendance as `studentId`
        orClauses.push({ studentId: Number(stud) });

        // also try resolving to Student._id (if studentId represents Student.studentId)
        try {
          const stuDoc = await Student.findOne({ studentId: Number(stud) }, { _id: 1 });
          if (stuDoc) orClauses.push({ student: stuDoc._id });
        } catch (e) {
          console.warn('Student lookup by numeric studentId failed:', e && e.message);
        }
      }

      // If we couldn't build any clause, return 400 (invalid identifier)
      if (!orClauses.length) {
        return res.status(400).json({ message: 'Invalid student identifier.' });
      }

      // If one clause only -> use it, otherwise use $or
      if (orClauses.length === 1) {
        Object.assign(attQuery, orClauses[0]);
      } else {
        attQuery.$or = orClauses;
      }
      appliedStudentFilter = true;
    }

    // --- 2) If no explicit student filter, but className or name are provided,
    //     resolve matching students and apply attQuery.student = { $in: [...] }
    if (!appliedStudentFilter) {
      const needStudentFilter = Boolean(className || name);
      if (needStudentFilter) {
        const stuQuery = {};
        if (className) stuQuery.class = className;
        if (name) stuQuery.name = { $regex: String(name), $options: 'i' };

        const students = await Student.find(stuQuery, { _id: 1 });
        if (!students || !students.length) {
          // No matching students -> return empty paginated response (safe)
          return res.status(200).json({ total: 0, page: Number(page), limit: Number(limit), data: [] });
        }
        attQuery.student = { $in: students.map(s => s._id) };
      }
    }

    // --- debug: log final query object before running DB query ---
    console.log('Attendance query object ->', JSON.stringify(attQuery));

    // Execute query with pagination
    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
    const list = await Attendance.find(attQuery)
      .populate({ path: 'student', model: 'Student', select: 'name class studentId' })
      .sort({ date: -1, _id: -1 })
      .skip(skip)
      .limit(Math.max(1, Number(limit)));

    const total = await Attendance.countDocuments(attQuery);

    return res.status(200).json({ total, page: Number(page), limit: Number(limit), data: list });
  } catch (error) {
    console.error('Error retrieving attendance:', error);
    return res.status(500).json({ message: 'Error retrieving attendance.', error });
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
// GET /attendance/by-user?username=teacher1&page=1&limit=50&dateFrom=2025-11-01&dateTo=2025-11-13&status=Present
router.get('/attendance/by-user', async (req, res) => {
  try {
    const { username, status, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    if (!username || !String(username).trim()) {
      return res.status(400).json({ message: 'username query parameter is required.' });
    }

    // helper: escape regex chars in username
    const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // build query
    const attQuery = {};
    // case-insensitive exact match for username
    attQuery.username = { $regex: `^${escapeRegex(username.trim())}$`, $options: 'i' };

    // optional status filter (validate against Attendance.VALID_STATUS if available)
    if (status) {
      if (Array.isArray(Attendance.VALID_STATUS) && Attendance.VALID_STATUS.includes(String(status))) {
        attQuery.status = String(status);
      } else {
        return res.status(400).json({ message: 'Invalid status value.' });
      }
    }

    // optional date range filter
    if (dateFrom || dateTo) {
      const range = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid dateFrom.' });
        range.$gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid dateTo.' });
        // treat dateTo as inclusive end of day
        d.setHours(23, 59, 59, 999);
        range.$lt = new Date(d.getTime() + 1); // or use $lte with end of day
      }
      attQuery.date = range;
    }

    // pagination math
    const p = Math.max(1, Number(page));
    const lim = Math.max(1, Number(limit));
    const skip = (p - 1) * lim;

    // run query, populate student basic fields
    const [list, total] = await Promise.all([
      Attendance.find(attQuery)
        .populate({ path: 'student', model: 'Student', select: 'name class studentId' })
        .sort({ date: -1, _id: -1 })
        .skip(skip)
        .limit(lim),
      Attendance.countDocuments(attQuery)
    ]);

    return res.status(200).json({
      total,
      page: p,
      limit: lim,
      data: list
    });
  } catch (err) {
    console.error('Error in /attendance/by-user:', err);
    return res.status(500).json({ message: 'Error retrieving attendance.', error: err.message });
  }
});

module.exports = router;