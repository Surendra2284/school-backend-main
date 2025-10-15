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