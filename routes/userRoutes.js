const express = require('express');
const router = express.Router();
const UserModel = require('../models/User');
const bcrypt = require('bcryptjs');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await UserModel.find();
    const formatted = users.map(u => ({
      ...u.toObject(),
      userid: u.userid || u._id.toString(),
    }));
    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Add a new user
router.post('/', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const existing = await UserModel.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({ username, password: hashedPassword, role });
    await newUser.save();

    res.status(201).json({ message: 'User added successfully!' });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ message: 'Failed to add user' });
  }
});

// Update an existing user
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedUser = await UserModel.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found!' });
    }

    res.status(200).json({ message: 'User updated successfully!', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'An error occurred while updating the user' });
  }
});

// Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await UserModel.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found!' });
    }

    res.status(200).json({ message: 'User deleted successfully!' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Find a user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Error finding user:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;