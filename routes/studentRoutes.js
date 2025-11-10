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
router.post('/students/bulk', async (req, res) => {
  try {
    const { students } = req.body || {};
    const upsert = String(req.query.upsert || 'false') === 'true';

    if (!Array.isArray(students) || !students.length) {
      return res.status(400).json({ message: 'students must be a non-empty array' });
    }

    // Normalize + validate server-side
    const MOBILE_RE = /^[6-9]\d{9}$/;
    const clean = [];
    const errors = [];
    const seen = new Set();

    students.forEach((raw, i) => {
      const row = i + 2; // excel-like numbering
      const s = {
        studentId: Number(raw.studentId),
        name: (raw.name || '').trim(),
        class: (raw.class || '').trim(),
        mobileNo: String(raw.mobileNo || '').trim(),
        address: raw.address || '',
        Role: raw.Role || 'Student',
        Notice: raw.Notice || '',
        Email: (raw.Email || '').trim(),
        attendance: Number(raw.attendance || 0),
        photo: raw.photo || '',
        classteacher: raw.classteacher || ''
      };

      if (Number.isNaN(s.studentId)) errors.push({ row, error: 'StudentId must be a number' });
      if (!s.name) errors.push({ row, error: 'Name is required' });
      if (!s.class) errors.push({ row, error: 'Class is required' });
      if (!s.Email) errors.push({ row, error: 'Email is required' });
      if (!s.mobileNo || !MOBILE_RE.test(s.mobileNo)) errors.push({ row, error: 'Invalid MobileNo' });

      const key = s.studentId;
      if (seen.has(key)) errors.push({ row, error: `Duplicate StudentId in payload: ${key}` });
      else seen.add(key);

      clean.push(s);
    });

    if (errors.length) {
      return res.status(422).json({ message: 'Validation errors', inserted: 0, updated: 0, skipped: 0, errors });
    }

    // DB existence check
    const ids = clean.map(s => s.studentId);
    const existing = await Student.find({ studentId: { $in: ids } }, { studentId: 1 }).lean();
    const existingSet = new Set(existing.map(e => e.studentId));

    let inserted = 0, updated = 0, skipped = 0;
    const perRowErrors = [];

    if (upsert) {
      // Upsert one-by-one to get per-row status
      for (let i = 0; i < clean.length; i++) {
        const s = clean[i];
        try {
          const resDoc = await Student.findOneAndUpdate(
            { studentId: s.studentId },
            { $set: s },
            { upsert: true, new: true }
          );
          if (existingSet.has(s.studentId)) updated++;
          else inserted++;
        } catch (err) {
          perRowErrors.push({ row: i + 2, error: err?.message || 'Upsert failed' });
        }
      }
    } else {
      // Insert only new ones; skip duplicates
      const toInsert = clean.filter(s => !existingSet.has(s.studentId));
      skipped = clean.length - toInsert.length;

      if (toInsert.length) {
        try {
          const result = await Student.insertMany(toInsert, { ordered: false });
          inserted = result.length;
        } catch (err) {
          // insertMany with ordered:false may still report partial failures
          // `err.writeErrors` contains per-doc errors
          if (Array.isArray(err?.writeErrors)) {
            inserted = (err.result?.result?.nInserted) || 0;
            err.writeErrors.forEach((w) => {
              perRowErrors.push({ row: (w?.index ?? 0) + 2, error: w?.errmsg || 'Insert failed' });
            });
          } else {
            perRowErrors.push({ row: 'unknown', error: err?.message || 'Insert failed' });
          }
        }
      }
    }

    return res.status(200).json({ inserted, updated, skipped, errors: perRowErrors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Bulk import failed', error });
  }
});

module.exports = router;

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


module.exports = router;