const express = require('express');
const Student = require('../models/Student');
const router = express.Router();

/** --- Utility Function for Validation --- */
const validatePayload = (requiredFields, payload) => {
  for (const field of requiredFields) {
    if (!payload[field] || payload[field].toString().trim() === '') {
      return `${field} is required.`;
    }
  }
  return null;
};

/** --- Create a New Student --- */
router.post('/add', async (req, res) => {
  try {
    // Validate required fields
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

/** --- Get All Students (with Pagination and Filters) --- */
router.get('*', async (req, res) => {
  try {
    const filters = req.query; // Accept optional filters
    const limit = parseInt(req.query.limit) || 10; // Limit for pagination
    const skip = parseInt(req.query.skip) || 0; // Offset for pagination

    delete filters.limit; // Remove pagination-related keys from the filters
    delete filters.skip;

    const students = await Student.find(filters).limit(limit).skip(skip);
    res.status(200).json(students);
  } catch (error) {
    console.error('Error fetching students:', error.message);
    res.status(500).json({ error: error.message });
  }
});
router.get('/students', (req, res) => {
  // Check the Accept header for "application/json"
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    // Return JSON data
    res.json(Student); 
  } else {
    //  If the client doesn't explicitly ask for JSON (or prefers something else),
    // we'll still send JSON as a reasonable default.  In a more complex API, you 
    // might handle other formats (e.g., XML) here based on the Accept header.
    res.json(Student);
  }
});
/** --- Get a Single Student by ID --- */
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(200).json(student);
  } catch (error) {
    console.error('Error fetching student by ID:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/** --- Update a Student --- */
router.put('/update/:id', async (req, res) => {
  try {
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'No data provided for update.' });
    }

    const student = await Student.findOneAndUpdate({ studentId: req.params.id }, req.body, { new: true });
    if (!student) {
      return res.status(404).json({ message: 'Student not found!' });
    }
    res.status(200).json({ message: 'Student updated successfully!', student });
  } catch (error) {
    console.error('Error updating student:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/** --- Delete a Student --- */
router.delete('/delete/:id', async (req, res) => {
  try {
    const result = await Student.deleteOne({ studentId: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(200).json({ message: 'Student successfully deleted' });
  } catch (error) {
    console.error('Error deleting student:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/** --- Search Students by Class --- */
router.get('/class/:class', async (req, res) => {
  try {
    const className = req.params.class;
    const filters = req.query;

    if (!className || className.trim() === '') {
      return res.status(400).json({ message: 'Class name is required.' });
    }

    const query = { class: className, ...filters };
    const students = await Student.find(query);

    if (!students.length) {
      return res.status(404).json({ message: 'No students found for the specified class.' });
    }
    res.status(200).json(students);
  } catch (error) {
    console.error('Error searching students by class:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/** --- Search Students by Name --- */
router.get('/name/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const filters = req.query;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required.' });
    }

    const query = { name: { $regex: name, $options: 'i' }, ...filters };
    const students = await Student.find(query);

    if (!students.length) {
      return res.status(404).json({ message: 'No students found with the specified name.' });
    }
    res.status(200).json(students);
  } catch (error) {
    console.error('Error searching students by name:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;