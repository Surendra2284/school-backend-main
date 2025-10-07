const express = require('express');
const router = express.Router();
const { addUser, editUser, deleteUser, findUser, getAllUsers } = require('../models/user');

// Get all users
router.get('/all', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Add a new user
router.post('/add', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await addUser(username, password);
    if (result.success) {
      res.status(201).json({ message: 'User added successfully!' });
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ message: 'Failed to add user' });
  }
});

// Update an existing user
router.put('/:id', async (req, res) => {
  try {
    const result = await editUser(req.params.id, req.body);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    res.status(200).json({ message: 'User updated successfully!', user: result.updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'An error occurred while updating the user' });
  }
});

// Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteUser(req.params.id);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
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
    const result = await findUser(req.params.id);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    res.status(200).json({ user: result.user });
  } catch (error) {
    console.error('Error finding user:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;