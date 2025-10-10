const express = require('express');
const router = express.Router();
const { addUser, editUser, deleteUser, findUser } = require('../models/User');
const User = require('../models/User');
// Route to register a new user
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await addUser(username, password);
    if (result.success) {
      res.json({ success: true, message: 'User added successfully' });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to edit (update) a user
router.put('/edit/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const result = await editUser(id, updates);
    if (result.success) {
      res.json({ success: true, message: 'User updated successfully', updatedUser: result.updatedUser });
    } else {
      res.status(404).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to delete a user
router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await deleteUser(id);
    if (result.success) {
      res.json({ success: true, message: 'User deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to find a user by ID
router.get('/find/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await findUser(id);
    if (result.success) {
      res.json({ success: true, user: result.user });
    } else {
      res.status(404).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


 // Adjust path as needed

// ✅ Update isApproved status
router.put('/approve/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User approved successfully', user });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ message: 'Failed to approve user', error: error.message });
  }
});

// ✅ Get users by approval status
router.get('/isApproved/:status', async (req, res) => {
  try {
    const isApproved = req.params.status === 'true';
    const users = await User.find({ isApproved });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users by approval:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});


// ✅ Get all pending users (isApproved: false)
router.get('/pending-users', async (req, res) => {
  try {
    const pendingUsers = await User.find({ isApproved: false });
    res.json(pendingUsers);
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ message: 'Failed to fetch pending users', error: error.message });
  }
});

// ✅ Approve a user by ID
router.put('/approve-user/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User approved successfully', user });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ message: 'Failed to approve user', error: error.message });
  }
});


module.exports = router;