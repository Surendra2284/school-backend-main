const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');

// Get all teachers
router.get('/', async (req, res) => {
  try {
    const teachers = await Teacher.find();
    const formatted = teachers.map(t => ({
      ...t.toObject(),
      teacherid: t.teacherid || t._id.toString(),
    }));
    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ message: 'Failed to fetch teachers' });
  }
});

// Add a new teacher
router.post('/', async (req, res) => {
  try {
    const newTeacher = new Teacher(req.body);
    await newTeacher.save();
    res.status(201).json({ message: 'Teacher added successfully!' });
  } catch (error) {
    console.error('Error adding teacher:', error);
    res.status(500).json({ message: 'Failed to add teacher' });
  }
});

// Update an existing teacher
router.put('/:id', async (req, res) => {
  try {
    const updatedTeacher = await Teacher.findOneAndUpdate(
      { teacherid: req.params.id },
      req.body,
      { new: true }
    );

    if (!updatedTeacher) {
      return res.status(404).json({ message: 'Teacher not found!' });
    }

    res.status(200).json({ message: 'Teacher updated successfully!', teacher: updatedTeacher });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ message: 'An error occurred while updating the teacher' });
  }
});

// Delete a teacher
router.delete('/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findOneAndDelete({ teacherid: req.params.id });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.status(200).json({ message: 'Teacher deleted successfully!' });
  } catch (err) {
    console.error('Error deleting teacher:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
