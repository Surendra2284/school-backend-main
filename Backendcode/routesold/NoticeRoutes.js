const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice'); // Import Notice model

// Add a new notice
router.post('/', async (req, res) => {
  try {
    const newNotice = new Notice(req.body);
    const savedNotice = await newNotice.save();
    res.status(201).json(savedNotice);
  } catch (error) {
    console.error('Error adding notice:', error);
    res.status(500).json({ message: 'Failed to add notice', error: error.message });
  }
});

// Get all notices
router.get('/', async (req, res) => {
  try {
    const notices = await Notice.find();
    res.status(200).json(notices);
  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({ message: 'Failed to fetch notices', error: error.message });
  }
});

// Edit a notice
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updatedNotice = await Notice.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedNotice) {
      return res.status(404).json({ message: 'Notice not found!' });
    }
    res.status(200).json(updatedNotice);
  } catch (error) {
    console.error('Error editing notice:', error);
    res.status(500).json({ message: 'Failed to edit notice', error: error.message });
  }
});

// Delete a notice
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const deletedNotice = await Notice.findByIdAndDelete(id);
    if (!deletedNotice) {
      return res.status(404).json({ message: 'Notice not found!' });
    }
    res.status(200).json({ message: 'Notice deleted successfully!' });
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ message: 'Failed to delete notice', error: error.message });
  }
});



// Route to find notices by classteacher
router.get('/classteacher/:classteacher', async (req, res) => {
  try {
    const classteacher = req.params.classteacher; // Get the classteacher parameter
    const notices = await Notice.find({ classteacher }); // Query notices by classteacher

    if (notices.length === 0) {
      return res.status(404).json({ message: 'No notices found for the specified class teacher.' });
    }

    res.status(200).json(notices); // Return the matching notices
  } catch (error) {
    console.error('Error fetching notices by classteacher:', error);
    res.status(500).json({ message: 'An error occurred while fetching notices', error: error.message });
  }
});

// Route to find notices by Role
router.get('/role/:role', async (req, res) => {
  try {
    const role = req.params.role; // Get the role parameter from the request URL
    const notices = await Notice.find({ Role: role }); // Query notices by Role

    if (notices.length === 0) {
      return res.status(404).json({ message: 'No notices found for the specified role.' });
    }

    res.status(200).json(notices); // Return the matching notices
  } catch (error) {
    console.error('Error fetching notices by role:', error);
    res.status(500).json({ message: 'An error occurred while fetching notices', error: error.message });
  }
});




module.exports = router;