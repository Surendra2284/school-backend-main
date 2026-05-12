// routes/attendance.js

const express = require('express');
const router = express.Router();

const Attendance = require('../models/Attendence');
const { VALID_STATUS } = require('../models/Attendence');

const Student = require('../models/Student');

const { emitNoticeChanged } = require('../server');

/* =========================================================
   DEBUG LOGGER
========================================================= */

router.use((req, res, next) => {

  console.log(
    '[attendance]',
    req.method,
    req.originalUrl
  );

  next();
});

/* =========================================================
   HELPERS
========================================================= */

// Normalize date to UTC day range
const toDayRange = (dateInput) => {

  const d = new Date(dateInput);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  const start = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate()
    )
  );

  const end = new Date(start);

  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
};

// Escape regex special chars
function escapeRegex(str) {

  return String(str).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}

/* =========================================================
   CREATE / UPSERT ATTENDANCE
========================================================= */

router.post('/attendance', async (req, res) => {

  try {

    const {
      studentId,
      studentIds,
      className,
      teacher,
      username,
      date,
      status
    } = req.body;

    // Validation
    if (
      !className ||
      !teacher ||
      !username ||
      !date ||
      !status
    ) {
      return res.status(400).json({
        message:
          'className, teacher, username, date and status are required.'
      });
    }

    if (!VALID_STATUS.includes(status)) {

      return res.status(400).json({
        message:
          `status must be one of ${VALID_STATUS.join(', ')}`
      });
    }

    let sidList = [];

    // Multiple students
    if (
      Array.isArray(studentIds) &&
      studentIds.length
    ) {

      sidList = studentIds
        .map(id => Number(id))
        .filter(id => !Number.isNaN(id));

    }

    // Single student
    else if (studentId != null) {

      const sid = Number(studentId);

      if (Number.isNaN(sid)) {

        return res.status(400).json({
          message: 'Invalid studentId.'
        });
      }

      sidList = [sid];
    }

    else {

      return res.status(400).json({
        message:
          'Provide studentId or studentIds.'
      });
    }

    if (!sidList.length) {

      return res.status(400).json({
        message:
          'No valid student IDs provided.'
      });
    }

    const range = toDayRange(date);

    if (!range) {

      return res.status(400).json({
        message: 'Invalid date.'
      });
    }

    // Bulk upsert
    const ops = sidList.map((sid) => ({

      updateOne: {

        filter: {
          studentId: sid,
          date: range.start
        },

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

    const result = await Attendance.bulkWrite(
      ops,
      { ordered: false }
    );

    // SSE EVENT
    emitNoticeChanged({

      type: 'attendance-bulk-saved',

      className,

      date,

      totalStudents: sidList.length
    });

    return res.status(200).json({

      message: 'Attendance saved successfully.',

      created:
        result.upsertedCount || 0,

      updated:
        result.modifiedCount || 0
    });

  } catch (error) {

    console.error(
      'Error saving attendance:',
      error
    );

    if (error?.code === 11000) {

      return res.status(409).json({
        message:
          'Duplicate attendance detected.'
      });
    }

    return res.status(500).json({
      message: 'Error saving attendance.',
      error: error.message
    });
  }
});

/* =========================================================
   GET ATTENDANCE
========================================================= */

router.get('/attendance', async (req, res) => {

  try {

    const {
      className,
      name,
      username,
      studentId,
      date,
      status,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};

    // Username filter
    if (username) {

      query.username = {

        $regex: String(username),

        $options: 'i'
      };
    }

    // Status filter
    if (
      status &&
      VALID_STATUS.includes(String(status))
    ) {

      query.status = String(status);
    }

    // Date filter
    if (date) {

      const range = toDayRange(date);

      if (!range) {

        return res.status(400).json({
          message: 'Invalid date.'
        });
      }

      query.date = {

        $gte: range.start,

        $lt: range.end
      };
    }

    // Student ID filter
    if (studentId != null) {

      const sid = Number(studentId);

      if (Number.isNaN(sid)) {

        return res.status(400).json({
          message: 'Invalid studentId.'
        });
      }

      query.studentId = sid;
    }

    // Resolve by class or name
    else if (className || name) {

      const stuQuery = {};

      if (className) {
        stuQuery.class = className;
      }

      if (name) {

        stuQuery.name = {

          $regex: String(name),

          $options: 'i'
        };
      }

      const students = await Student.find(
        stuQuery,
        { studentId: 1 }
      );

      const ids = students.map(
        s => s.studentId
      );

      query.studentId = { $in: ids };
    }

    const skip =
      (Math.max(1, Number(page)) - 1) *
      Math.max(1, Number(limit));

    const [list, total] = await Promise.all([

      Attendance.find(query)
        .sort({
          date: -1,
          _id: -1
        })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Attendance.countDocuments(query)
    ]);

    return res.status(200).json({

      total,

      page: Number(page),

      limit: Number(limit),

      data: list
    });

  } catch (error) {

    console.error(
      'Error retrieving attendance:',
      error
    );

    return res.status(500).json({
      message:
        'Error retrieving attendance.',
      error: error.message
    });
  }
});

/* =========================================================
   CORRECT ATTENDANCE
========================================================= */

router.patch('/attendance/correct', async (req, res) => {

  try {

    const {
      studentId,
      date,
      newStatus,
      reason,
      correctedBy
    } = req.body;

    if (
      studentId == null ||
      !date ||
      !newStatus
    ) {

      return res.status(400).json({
        message:
          'studentId, date and newStatus are required.'
      });
    }

    if (!VALID_STATUS.includes(newStatus)) {

      return res.status(400).json({
        message:
          `newStatus must be one of ${VALID_STATUS.join(', ')}`
      });
    }

    const sid = Number(studentId);

    if (Number.isNaN(sid)) {

      return res.status(400).json({
        message: 'Invalid studentId.'
      });
    }

    const range = toDayRange(date);

    if (!range) {

      return res.status(400).json({
        message: 'Invalid date.'
      });
    }

    const record = await Attendance.findOne({

      studentId: sid,

      date: {
        $gte: range.start,
        $lt: range.end
      }
    });

    if (!record) {

      return res.status(404).json({
        message:
          'Attendance record not found.'
      });
    }

    const oldStatus = record.status;

    record.status = newStatus;

    record.correctionHistory =
      record.correctionHistory || [];

    record.correctionHistory.push({

      changedAt: new Date(),

      changedBy:
        correctedBy || 'system',

      fromStatus: oldStatus,

      toStatus: newStatus,

      reason:
        reason || 'manual correction'
    });

    await record.save();

    // SSE EVENT
    emitNoticeChanged({

      type: 'attendance-corrected',

      studentId: sid,

      date,

      newStatus
    });

    return res.status(200).json({

      message:
        'Attendance corrected successfully.',

      record
    });

  } catch (error) {

    console.error(
      'Error correcting attendance:',
      error
    );

    return res.status(500).json({
      message:
        'Error correcting attendance.',
      error: error.message
    });
  }
});

/* =========================================================
   UPDATE ATTENDANCE
========================================================= */

router.patch('/attendance/:id', async (req, res) => {

  try {

    const { id } = req.params;

    const payload = {};

    if (req.body.status) {

      if (
        !VALID_STATUS.includes(req.body.status)
      ) {

        return res.status(400).json({
          message:
            `status must be one of ${VALID_STATUS.join(', ')}`
        });
      }

      payload.status = req.body.status;
    }

    if (req.body.teacher) {
      payload.teacher = req.body.teacher;
    }

    if (req.body.username) {
      payload.username = req.body.username;
    }

    if (req.body.className) {
      payload.className = req.body.className;
    }

    if (req.body.date) {

      const range = toDayRange(
        req.body.date
      );

      if (!range) {

        return res.status(400).json({
          message: 'Invalid date.'
        });
      }

      payload.date = range.start;
    }

    if (req.body.studentId != null) {

      const sid = Number(
        req.body.studentId
      );

      if (Number.isNaN(sid)) {

        return res.status(400).json({
          message: 'Invalid studentId.'
        });
      }

      payload.studentId = sid;
    }

    const existing =
      await Attendance.findById(id);

    if (!existing) {

      return res.status(404).json({
        message:
          'Attendance record not found.'
      });
    }

    // Update directly
    const updated =
      await Attendance.findByIdAndUpdate(

        id,

        { $set: payload },

        { new: true }
      );

    // Track history
    if (
      payload.status &&
      payload.status !== existing.status
    ) {

      updated.correctionHistory =
        updated.correctionHistory || [];

      updated.correctionHistory.push({

        changedAt: new Date(),

        changedBy:
          req.body.correctedBy ||
          req.body.username ||
          'system',

        fromStatus: existing.status,

        toStatus: payload.status,

        reason:
          req.body.reason ||
          'manual patch'
      });

      await updated.save();
    }

    // SSE EVENT
    emitNoticeChanged({

      type: 'attendance-updated',

      attendanceId: id
    });

    return res.status(200).json({

      message:
        'Attendance updated successfully.',

      record: updated
    });

  } catch (error) {

    console.error(
      'Error updating attendance:',
      error
    );

    return res.status(500).json({
      message:
        'Error updating attendance.',
      error: error.message
    });
  }
});

/* =========================================================
   DELETE ATTENDANCE
========================================================= */

router.delete('/attendance/:id', async (req, res) => {

  try {

    const { id } = req.params;

    const deleted =
      await Attendance.findByIdAndDelete(id);

    if (!deleted) {

      return res.status(404).json({
        message:
          'Attendance record not found.'
      });
    }

    // SSE EVENT
    emitNoticeChanged({

      type: 'attendance-deleted',

      attendanceId: id
    });

    return res.status(200).json({
      message:
        'Attendance deleted successfully.'
    });

  } catch (error) {

    console.error(
      'Error deleting attendance:',
      error
    );

    return res.status(500).json({
      message:
        'Error deleting attendance.',
      error: error.message
    });
  }
});

/* =========================================================
   GET BY USERNAME
========================================================= */

router.get('/attendance/ByUserName', async (req, res) => {

  try {

    const {
      username,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.query;

    if (!username) {

      return res.status(400).json({
        message:
          'username is required.'
      });
    }

    const query = {

      username: {

        $regex:
          `^${escapeRegex(username)}$`,

        $options: 'i'
      }
    };

    if (
      status &&
      VALID_STATUS.includes(status)
    ) {

      query.status = status;
    }

    if (dateFrom || dateTo) {

      query.date = {};

      if (dateFrom) {
        query.date.$gte =
          new Date(dateFrom);
      }

      if (dateTo) {

        const end = new Date(dateTo);

        end.setHours(
          23,
          59,
          59,
          999
        );

        query.date.$lte = end;
      }
    }

    const skip =
      (Number(page) - 1) *
      Number(limit);

    const [list, total] = await Promise.all([

      Attendance.find(query)
        .sort({
          date: -1,
          _id: -1
        })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Attendance.countDocuments(query)
    ]);

    return res.status(200).json({

      total,

      page: Number(page),

      limit: Number(limit),

      totalPages:
        Math.ceil(total / limit),

      data: list
    });

  } catch (error) {

    console.error(
      'Error retrieving attendance by username:',
      error
    );

    return res.status(500).json({
      message:
        'Error retrieving attendance.',
      error: error.message
    });
  }
});

/* =========================================================
   GET STUDENT ATTENDANCE BY NAME
========================================================= */

router.get('/ByStudentName', async (req, res) => {

  try {

    const name = req.query.name;

    const weeks =
      Math.max(
        1,
        Math.min(
          52,
          Number(req.query.weeks || 1)
        )
      );

    if (!name) {

      return res.status(400).json({
        message: 'name is required.'
      });
    }

    const student =
      await Student.findOne({

        name: {

          $regex:
            `^${escapeRegex(name)}$`,

          $options: 'i'
        }
      }).lean();

    if (
      !student ||
      student.studentId == null
    ) {

      return res.status(404).json({
        message:
          'Student not found.'
      });
    }

    const sid = Number(
      student.studentId
    );

    const now = new Date();

    const today = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      )
    );

    const mondayOffset =
      (today.getUTCDay() + 6) % 7;

    const thisWeekStart =
      new Date(
        today.getTime() -
        mondayOffset *
        24 *
        60 *
        60 *
        1000
      );

    const result = [];

    for (let i = 0; i < weeks; i++) {

      const start = new Date(
        thisWeekStart.getTime() -
        i * 7 * 24 * 60 * 60 * 1000
      );

      const end = new Date(start);

      end.setUTCDate(
        end.getUTCDate() + 6
      );

      end.setUTCHours(
        23,
        59,
        59,
        999
      );

      const records =
        await Attendance.find({

          studentId: sid,

          date: {
            $gte: start,
            $lte: end
          }
        })
          .sort({ date: 1 })
          .lean();

      result.push({

        weekStart:
          start.toISOString(),

        weekEnd:
          end.toISOString(),

        records
      });
    }

    return res.status(200).json({

      student,

      weeks: result
    });

  } catch (error) {

    console.error(
      'Error retrieving student attendance:',
      error
    );

    return res.status(500).json({
      message:
        'Error retrieving student attendance.',
      error: error.message
    });
  }
});

module.exports = router;