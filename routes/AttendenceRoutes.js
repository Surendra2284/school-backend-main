// routes/attendance.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Attendance = require('../models/Attendence');
const { VALID_STATUS } = require('../models/Attendence');
const Student = require('../models/Student');

// --- middleware logger (debug) ---
router.use((req, res, next) => {
  console.log(
    '[attendance router]',
    req.method,
    req.originalUrl,
    req.query,
    'headers:',
    { origin: req.headers.origin, host: req.headers.host }
  );
  next();
});

// Normalize a date string/Date to [UTC day start, next day)
const toDayRange = (dateInput) => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 1);
  return { start, end };
};

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** -------------------------
 * CREATE / UPSERT (single or bulk) by studentId
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

    // collect studentId numbers
    let sidList = [];

    if (Array.isArray(studentIds) && studentIds.length) {
      sidList = studentIds
        .map(n => Number(n))
        .filter(n => !Number.isNaN(n));
    } else if (studentId != null) {
      const n = Number(studentId);
      if (Number.isNaN(n)) {
        return res.status(400).json({ message: 'Invalid studentId.' });
      }
      sidList = [n];
    } else {
      return res.status(400).json({ message: 'Provide studentId or studentIds.' });
    }

    if (!sidList.length) {
      return res.status(400).json({ message: 'No valid numeric studentId values provided.' });
    }

    const range = toDayRange(date);
    if (!range) return res.status(400).json({ message: 'Invalid date.' });

    // Bulk upsert (idempotent) by (studentId, date.start)
    const ops = sidList.map(sid => ({
      updateOne: {
        filter: { studentId: sid, date: range.start },
        update: {
          $set: {
            studentId: sid,
            className,
            teacher,
            username,
            date: range.start,
            status
          }
        },
        upsert: true
      }
    }));

    const result = await Attendance.bulkWrite(ops, { ordered: false });
    const created = result.upsertedCount || 0;
    const updated = result.modifiedCount || 0;

    return res.status(200).json({
      message: 'Attendance saved.',
      created,
      updated
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Duplicate (studentId, date) detected.', error });
    }
    console.error('Error saving attendance:', error);
    return res.status(500).json({ message: 'Error saving attendance.', error });
  }
});

/** -------------------------
 * READ with filters (uses studentId only, joins Student to get name)
 * ------------------------- */
// GET /attendance
router.get('/attendance', async (req, res) => {
  try {
    console.log('GET /attendance query ->', req.query);

    const {
      className,
      name,
      username,
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

    // --- filter by studentId when provided ---
    const sidStr = (studentIdParamRaw ?? '').toString().trim();
    if (sidStr) {
      const sidNum = Number(sidStr);
      if (Number.isNaN(sidNum)) {
        return res.status(400).json({ message: 'Invalid studentId query parameter.' });
      }
      attQuery.studentId = sidNum;
    }

    // --- If no explicit studentId, but className or name is provided,
    //     resolve matching students and apply attQuery.studentId = { $in: [...] }
    if (!attQuery.studentId && (className || name)) {
      const stuQuery = {};
      if (className) stuQuery.class = className;
      if (name) stuQuery.name = { $regex: String(name), $options: 'i' };

      const students = await Student.find(stuQuery, { studentId: 1 });
      if (!students || !students.length) {
        return res.status(200).json({ total: 0, page: Number(page), limit: Number(limit), data: [] });
      }
      attQuery.studentId = { $in: students.map(s => s.studentId).filter(n => !Number.isNaN(n)) };
    }

    console.log('Attendance query object ->', JSON.stringify(attQuery));

    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

    const list = await Attendance.find(attQuery)
      .sort({ date: -1, _id: -1 })
      .skip(skip)
      .limit(Math.max(1, Number(limit)))
      .lean();

    const total = await Attendance.countDocuments(attQuery);

    // join student info by studentId (for display – no student ObjectId in Attendance)
 // NO join, just return plain attendance docs with studentId only
return res.status(200).json({
  total,
  page: Number(page),
  limit: Number(limit),
  data: list
});

  } catch (error) {
    console.error('Error retrieving attendance:', error);
    return res.status(500).json({ message: 'Error retrieving attendance.', error });
  }
});

/** -------------------------
 * CORRECT a record by studentId + date
 * ------------------------- */
router.patch('/attendance/correct', async (req, res) => {
  try {
    const { studentId, date, newStatus, reason, correctedBy } = req.body;
    if (studentId == null || !date || !newStatus) {
      return res.status(400).json({ message: 'studentId, date, newStatus are required.' });
    }
    if (!VALID_STATUS.includes(newStatus)) {
      return res.status(400).json({ message: `newStatus must be one of ${VALID_STATUS.join(', ')}` });
    }

    const sidNum = Number(studentId);
    if (Number.isNaN(sidNum)) {
      return res.status(400).json({ message: 'Invalid studentId.' });
    }

    const r = toDayRange(date);
    if (!r) return res.status(400).json({ message: 'Invalid date.' });

    const record = await Attendance.findOne({
      studentId: sidNum,
      date: { $gte: r.start, $lt: r.end }
    });

    if (!record) return res.status(404).json({ message: 'Attendance record not found for that day.' });

    const fromStatus = record.status;
    if (fromStatus === newStatus) {
      return res.status(200).json({ message: 'No change. Status already set.', record });
    }

    record.status = newStatus;
    record.correctionHistory = record.correctionHistory || [];
    record.correctionHistory.push({
      changedAt: new Date(),
      changedBy: correctedBy || req.body.username || 'system',
      fromStatus,
      toStatus: newStatus,
      reason: reason || 'manual correction'
    });

    await record.save();
    return res.status(200).json({ message: 'Attendance corrected successfully.', record });
  } catch (error) {
    console.error('Error correcting attendance:', error);
    return res.status(500).json({ message: 'Error correcting attendance.', error });
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
    if (req.body.studentId != null) {
      const sidNum = Number(req.body.studentId);
      if (Number.isNaN(sidNum)) return res.status(400).json({ message: 'Invalid studentId.' });
      payload.studentId = sidNum;
    }

    const prev = await Attendance.findById(id);
    if (!prev) return res.status(404).json({ message: 'Attendance record not found.' });

    await Attendance.findByIdAndUpdate(id, { $set: payload }, { new: true });

    if (payload.status && payload.status !== prev.status) {
      await Attendance.findByIdAndUpdate(id, {
        $push: {
          correctionHistory: {
            changedAt: new Date(),
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
    console.error('Error updating attendance:', error);
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
    console.error('Error deleting attendance:', error);
    res.status(500).json({ message: 'Error deleting attendance.', error });
  }
});

/** -------------------------
 * GET by username (teacher) – still works, joins student by studentId if needed
 * ------------------------- */
// GET /attendance/by-user
router.get('/attendance/ByUserName', async (req, res) => {
  try {
    console.log('GET /attendance/by-user query ->', req.query);

    const {
      username: rawUsername,
      status: rawStatus,
      dateFrom: rawDateFrom,
      dateTo: rawDateTo,
      page: rawPage = '1',
      limit: rawLimit = '50'
    } = req.query;

    if (!rawUsername || !String(rawUsername).trim()) {
      return res.status(400).json({ message: 'username query parameter is required.' });
    }
    const username = String(rawUsername).trim();

    const page = Math.max(1, parseInt(String(rawPage), 10) || 1);
    let limit = Math.max(1, parseInt(String(rawLimit), 10) || 50);
    const MAX_LIMIT = 500;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const attQuery = {};
    const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    attQuery.username = { $regex: `^${esc(username)}$`, $options: 'i' };

    if (rawStatus != null && String(rawStatus).trim() !== '') {
      const status = String(rawStatus).trim();
      if (Array.isArray(Attendance.VALID_STATUS) && !Attendance.VALID_STATUS.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
      }
      attQuery.status = status;
    }

    if (rawDateFrom || rawDateTo) {
      const range = {};
      if (rawDateFrom) {
        const dFrom = new Date(String(rawDateFrom));
        if (Number.isNaN(dFrom.getTime())) return res.status(400).json({ message: 'Invalid dateFrom.' });
        range.$gte = dFrom;
      }
      if (rawDateTo) {
        const dTo = new Date(String(rawDateTo));
        if (Number.isNaN(dTo.getTime())) return res.status(400).json({ message: 'Invalid dateTo.' });
        dTo.setHours(23, 59, 59, 999);
        range.$lte = dTo;
      }
      attQuery.date = range;
    }

    console.debug('Attendance by-user query ->', JSON.stringify(attQuery));

    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      Attendance.find(attQuery)
        .sort({ date: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(attQuery)
    ]);

    const ids = [...new Set(list.map(r => r.studentId).filter(n => !Number.isNaN(n)))];
    const stuDocs = ids.length
      ? await Student.find({ studentId: { $in: ids } }, { studentId: 1, name: 1, class: 1 }).lean()
      : [];
    const stuMap = new Map(stuDocs.map(s => [s.studentId, s]));

    const data = list.map(rec => ({
      ...rec,
      student: stuMap.get(rec.studentId) || null
    }));

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      total,
      page,
      limit,
      totalPages,
      data
    });
  } catch (err) {
    console.error('Error in /attendance/by-user:', err);
    return res.status(500).json({ message: 'Error retrieving attendance.' });
  }
});

/** -------------------------
 * GET by student name – uses Student to find studentId, then attendance by studentId
 * ------------------------- */
// GET /student-by-name?name=Ishaan%20kushwaha&weeks=1
router.get('/ByStudentName', async (req, res) => {
  try {
    const nameRaw = req.query.name;
    const weeksRaw = req.query.weeks;
    if (!nameRaw || !String(nameRaw).trim()) {
      return res.status(400).json({ message: 'name query parameter is required.' });
    }
    const name = String(nameRaw).trim();
    const weeks = Math.max(1, Math.min(52, parseInt(String(weeksRaw || '1'), 10) || 1)); // 1..52

    // find student by name and get studentId
    const student = await Student.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
    }).lean();

    if (!student || student.studentId == null) {
      return res.status(404).json({ message: `Student not found for name: ${name}` });
    }

    const sid = Number(student.studentId);

    // Compute current week's Monday (UTC)
    const now = new Date();
    const todayUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const monIndex = (todayUtcMidnight.getUTCDay() + 6) % 7;
    const thisWeekStart = new Date(todayUtcMidnight.getTime() - monIndex * 24 * 60 * 60 * 1000);
    const weekMillis = 7 * 24 * 60 * 60 * 1000;

    const weeksOut = [];

    for (let i = 0; i < weeks; i++) {
      const start = new Date(thisWeekStart.getTime() - i * weekMillis);
      const end = new Date(start.getTime() + weekMillis - 1);

      const records = await Attendance.find({
        studentId: sid,
        date: { $gte: start, $lte: end }
      })
        .sort({ date: 1 })
        .lean();

      weeksOut.push({
        weekStart: start.toISOString(),
        weekEnd: end.toISOString(),
        records
      });
    }

    return res.status(200).json({ student, weeks: weeksOut });
  } catch (err) {
    console.error('Error in GET /student-by-name:', err);
    return res.status(500).json({ message: 'Error retrieving student attendance.' });
  }
});

module.exports = router;
