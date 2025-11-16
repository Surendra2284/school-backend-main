const express = require('express');
const router = express.Router();

const StudentProgress = require('../models/StudentProgress');
const Student = require('../models/Student');

// Helper: normalize date to YYYY-MM-DD
function normalizeDate(str) {
  if (!str) return null;
  return String(str).slice(0, 10);
}

/* ===========================================================
   POST /student-progress   (UPSERT SINGLE)
   =========================================================== */
router.post('/', async (req, res) => {
  try {
    const {
      studentId,
      className,
      section,
      subject,
      date,
      homework,
      teacher,
      username,
      progressNote,
      status,
      score,
      studentRemark,
      studentRemarkDate
    } = req.body;

    if (!studentId || !subject || !date || !homework || !teacher || !username) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const normDate = normalizeDate(date);

    const student = await Student.findOne({ studentId })
      .select('_id class section')
      .lean();

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const finalStatus = typeof status === 'string' ? status : 'Not Started';

    const doc = await StudentProgress.findOneAndUpdate(
      { studentId, date: normDate, subject },
      {
        $set: {
          student: student._id,
          studentId,
          className: className || student.class,
          section: section || student.section,
          subject,
          teacher,
          username,
          date: normDate,
          homework,
          progressNote: progressNote || '',
          status: finalStatus,
          score: typeof score === 'number' ? score : undefined,

          // ⭐ NEW FIELDS
          studentRemark: studentRemark || '',
          studentRemarkDate: studentRemarkDate || null
        },
      },
      { new: true, upsert: true }
    );

    res.json({ message: 'Student progress saved/updated successfully.', data: doc });

  } catch (err) {
    console.error('Error in POST /student-progress:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/* ===========================================================
   POST /student-progress/bulk  (BULK UPSERT)
   =========================================================== */
router.post('/bulk', async (req, res) => {
  try {
    const {
      className,
      section,
      subject,
      date,
      homework,
      teacher,
      username,
      entries,
    } = req.body;

    if (!className || !subject || !date || !homework || !teacher || !username) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'No entries provided.' });
    }

    const normDate = normalizeDate(date);

    const studentIds = entries.map((e) => e.studentId);
    const students = await Student.find({ studentId: { $in: studentIds } })
      .select('_id studentId class section')
      .lean();

    const studentMap = new Map();
    students.forEach((s) => studentMap.set(s.studentId, s));

    const ops = [];

    entries.forEach((entry) => {
      const s = studentMap.get(entry.studentId);
      if (!s) return;

      const finalStatus =
        typeof entry.status === 'string' ? entry.status : 'Not Started';

      ops.push({
        updateOne: {
          filter: {
            studentId: entry.studentId,
            date: normDate,
            subject,
          },
          update: {
            $set: {
              student: s._id,
              studentId: entry.studentId,
              className: className || s.class,
              section: section || s.section,
              subject,
              teacher,
              username,
              date: normDate,
              homework,
              progressNote: entry.progressNote || '',
              status: finalStatus,
              score: typeof entry.score === 'number' ? entry.score : undefined,

              // ⭐ NEW REMARK FIELDS FOR BULK
              studentRemark: entry.studentRemark || '',
              studentRemarkDate: entry.studentRemarkDate || null
            },
          },
          upsert: true,
        },
      });
    });

    if (!ops.length) {
      return res.status(400).json({ message: 'No valid students found.' });
    }

    const result = await StudentProgress.bulkWrite(ops, { ordered: false });

    res.json({
      message: 'Student progress saved/updated successfully.',
      result,
    });

  } catch (err) {
    console.error('Error in /student-progress/bulk:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/* ===========================================================
   GET /student-progress/class
   =========================================================== */
router.get('/class', async (req, res) => {
  try {
    const { className, date, subject } = req.query;

    if (!className) {
      return res.status(400).json({ message: 'className is required.' });
    }

    const filter = { className };

    if (date) filter.date = normalizeDate(date);
    if (subject) filter.subject = subject;

    const list = await StudentProgress.find(filter)
      .populate('student', 'name rollNo studentId')
      .sort({ date: -1 })
      .lean();

    res.json(list);

  } catch (err) {
    console.error('Error in GET /student-progress/class:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/* ===========================================================
   GET /student-progress/student/:studentId
   =========================================================== */
router.get('/student/:studentId', async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);

    if (!studentId) {
      return res.status(400).json({ message: 'Invalid studentId.' });
    }

    const { fromDate, toDate } = req.query;

    const filter = { studentId };

    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = normalizeDate(fromDate);
      if (toDate) filter.date.$lte = normalizeDate(toDate);
    }

    const list = await StudentProgress.find(filter)
      .sort({ date: -1, subject: 1 })
      .lean();

    res.json(list);

  } catch (err) {
    console.error('Error in GET /student-progress/student/:studentId:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/* ===========================================================
   PUT /student-progress/:id
   =========================================================== */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const payload = { ...req.body };

    if (payload.date) payload.date = normalizeDate(payload.date);

    if (!payload.studentRemark) payload.studentRemark = '';
    if (!payload.studentRemarkDate) payload.studentRemarkDate = null;

    const updated = await StudentProgress.findByIdAndUpdate(id, payload, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Record not found.' });
    }

    res.json(updated);

  } catch (err) {
    console.error('Error in PUT /student-progress/:id:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/* ===========================================================
   DELETE /student-progress/:id
   =========================================================== */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await StudentProgress.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Record not found.' });
    }

    res.json({ message: 'Deleted successfully.' });

  } catch (err) {
    console.error('Error in DELETE /student-progress/:id:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
