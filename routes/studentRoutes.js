const express = require('express');
const Student = require('../models/Student');
const router = express.Router();

const validatePayload = (requiredFields, payload) => {
  for (const field of requiredFields) {
    if (!payload[field] || payload[field].toString().trim() === '') {
      return `${field} is required.`;
    }
  }
  return null;
};

// Create
router.post('/add', async (req, res) => {
  try { console.log('Incoming student payload:', req.body);
    const validationError = validatePayload(['name', 'class', 'mobileNo', 'Email'], req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
    const student = new Student(req.body);
    await student.save();
    res.status(201).json({ message: 'Student created successfully!', student });
  } catch (error) {
    console.error('Error adding student:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all
router.get('/', async (req, res) => {
  try {
    const filters = { ...req.query };
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;
    delete filters.limit;
    delete filters.skip;

    const students = await Student.find(filters).limit(limit).skip(skip);
    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching students:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get by ID
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update
router.put('/update/:id', async (req, res) => {
  try {
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'No data provided for update.' });
    }
    const student = await Student.findOneAndUpdate(
      { studentId: req.params.id },
      req.body,
      { new: true }
    );
    if (!student) return res.status(404).json({ message: 'Student not found!' });
    res.status(200).json({ message: 'Student updated successfully!', student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete
router.delete('/delete/:id', async (req, res) => {
  try {
    const result = await Student.deleteOne({ studentId: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Student not found' });
    res.status(200).json({ message: 'Student successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Search by class
router.get('/class/:class', async (req, res) => {
  try {
    const className = req.params.class;
    if (!className || className.trim() === '') {
      return res.status(400).json({ message: 'Class name is required.' });
    }
    const students = await Student.find({ class: className, ...req.query });
    if (!students.length) return res.status(404).json({ message: 'No students found' });
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// POST /students/bulk?upsert=true|false



// Search by name
router.get('/name/:name', async (req, res) => {
  try {
    const name = req.params.name;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required.' });
    }
    const students = await Student.find({
      name: { $regex: name, $options: 'i' },
      ...req.query
    });
    if (!students.length) return res.status(404).json({ message: 'No students found' });
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/bulk', async (req, res) => {
  try {
    const { students } = req.body || {};
    const upsert = String(req.query.upsert || 'false') === 'true';

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'students must be a non-empty array' });
    }

    const MOBILE_RE = /^[6-9]\d{9}$/;
    const MAX_PHOTO_LEN = 2_000_000; // ~2MB guard

    const clean = [];
    const errors = [];
    const seen = new Set();

    students.forEach((raw, i) => {
      const row = i + 2; // Excel-like row numbering (1 header)

      const s = {
        studentId: Number(raw.studentId),
        name: (raw.name || '').trim(),
        class: (raw.class || '').trim(),
        mobileNo: String(raw.mobileNo || '').trim(),
        address: raw.address || '',
        Role: raw.Role || 'Student',
        Notice: raw.Notice || '',
        Email: (raw.Email || '').trim(),
        attendance: raw.attendance === '' || raw.attendance == null ? 0 : Number(raw.attendance),
        photo: raw.photo || '',
        classteacher: raw.classteacher || ''
      };

      // Validation
      if (Number.isNaN(s.studentId)) errors.push({ row, error: 'StudentId must be a number' });
      if (!s.name) errors.push({ row, error: 'Name is required' });
      if (!s.class) errors.push({ row, error: 'Class is required' });
      if (!s.Email) errors.push({ row, error: 'Email is required' });
      if (!s.mobileNo || !MOBILE_RE.test(s.mobileNo)) errors.push({ row, error: 'Invalid MobileNo' });

      // De-dup within file
      if (seen.has(s.studentId)) {
        errors.push({ row, error: `Duplicate StudentId in payload: ${s.studentId}` });
      } else {
        seen.add(s.studentId);
      }

      // Optional: drop oversize photo fields to avoid payload bloat
      if (s.photo && String(s.photo).length > MAX_PHOTO_LEN) {
        s.photo = '';
        errors.push({ row, warn: 'Photo removed due to size >2MB' });
      }

      clean.push(s);
    });

    if (errors.some(e => !e.warn)) {
      // Return only hard errors as 422; keep warns in payload too
      const hard = errors.filter(e => !e.warn);
      return res.status(422).json({ message: 'Validation errors', inserted: 0, updated: 0, skipped: 0, errors: hard });
    }

    // Check existing to compute inserted/updated/skipped
    const ids = clean.map(s => s.studentId);
    const existing = await Student.find({ studentId: { $in: ids } }, { studentId: 1 }).lean();
    const existingSet = new Set(existing.map(e => e.studentId));

    let inserted = 0, updated = 0, skipped = 0;
    const perRowErrors = [];

    if (upsert) {
      // Efficient upsert using bulkWrite
      const ops = clean.map((s) => ({
        updateOne: {
          filter: { studentId: s.studentId },
          update: { $set: s },
          upsert: true
        }
      }));

      try {
        const result = await Student.bulkWrite(ops, { ordered: false });

        // result summary is driver-dependent; cover common fields:
        const upsertedCount = result.upsertedCount ?? (result.result?.nUpserted ?? 0);
        const modifiedCount = result.modifiedCount ?? (result.result?.nModified ?? 0);
        const matchedCount  = result.matchedCount ?? (result.result?.nMatched ?? 0);

        // "updated" = docs that existed and were modified OR matched (we’ll approximate using existingSet)
        updated = clean.filter(s => existingSet.has(s.studentId)).length;
        inserted = upsertedCount || (clean.length - updated);
      } catch (err) {
        // Collect write errors if any
        if (Array.isArray(err?.writeErrors)) {
          err.writeErrors.forEach(w => {
            const idx = w?.index ?? 0;
            perRowErrors.push({ row: idx + 2, error: w?.errmsg || w?.err?.message || 'Upsert failed' });
          });
        } else {
          perRowErrors.push({ row: 'unknown', error: err?.message || 'Upsert failed' });
        }
      }
    } else {
      // Insert-only; skip duplicates
      const toInsert = clean.filter(s => !existingSet.has(s.studentId));
      skipped = clean.length - toInsert.length;

      if (toInsert.length) {
        try {
          const docs = await Student.insertMany(toInsert, { ordered: false });
          inserted = Array.isArray(docs) ? docs.length : (docs?.insertedCount ?? toInsert.length);
        } catch (err) {
          // Handle modern MongoBulkWriteError
          if (Array.isArray(err?.writeErrors)) {
            const okCount = err?.result?.result?.nInserted ?? err?.insertedDocs?.length ?? 0;
            inserted = okCount;
            err.writeErrors.forEach((w) => {
              perRowErrors.push({ row: (w?.index ?? 0) + 2, error: w?.errmsg || w?.err?.message || 'Insert failed' });
            });
          } else {
            perRowErrors.push({ row: 'unknown', error: err?.message || 'Insert failed' });
          }
        }
      }
    }

    return res.status(200).json({ inserted, updated, skipped, errors: perRowErrors.concat(errors.filter(e => e.warn)) });
  } catch (error) {
    console.error('Bulk import fatal:', error);
    return res.status(500).json({ message: 'Bulk import failed', error: error?.message || String(error) });
  }
});


module.exports = router;