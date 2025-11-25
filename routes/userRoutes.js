const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Register a new user
router.post('/', async (req, res) => {
  try {
    const user = new User(req.body);
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});
// Bulk create or update users
router.post('/bulk', async (req, res) => {
  try {
    const users = req.body.users || [];

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: "No users provided" });
    }

    let inserted = 0, updated = 0, skipped = 0;
    const errors = [];

    for (const u of users) {
      try {
        // Validate required fields
        if (!u.username || !u.password || !u.role) {
          skipped++;
          continue;
        }

        // Remove unwanted spaces
        u.username = u.username.trim();

        // Find existing user
        const existing = await User.findOne({ username: u.username });

        if (existing) {
          // Compare plain password with hashed stored password
          const passwordMatches = await bcrypt.compare(u.password, existing.password);

          if (!passwordMatches) {
            // New password → Hash again
            u.password = await bcrypt.hash(u.password, 10);
          } else {
            // Password unchanged → do not overwrite
            u.password = await bcrypt.hash(u.password, 10);
          }

          await User.updateOne(
            { username: u.username },
            { $set: u }
          );

          updated++;
        } else {
          // NEW USER → hash password always
          u.password = await bcrypt.hash(u.password, 10);

          const newUser = new User(u);
          await newUser.save();

          inserted++;
        }

      } catch (err) {
        errors.push({ user: u.username, error: err.message });
      }
    }

    res.json({ inserted, updated, skipped, errors });

  } catch (error) {
    res.status(500).json({ message: "Bulk upload failed", error: error.message });
  }
});


// Get pending users (specific route before :id)
router.get('/pending-users', async (req, res) => {
  try {
    const users = await User.find({ isApproved: false });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending users', error: error.message });
  }
});

// Get users by approval status
router.get('/isApproved/:status', async (req, res) => {
  try {
    const isApproved = req.params.status === 'true';
    const users = await User.find({ isApproved });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// Approve user by ID
router.put('/approve-user/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User approved successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve user', error: error.message });
  }
});

// Update user by ID
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };

    // If password is provided → hash before saving
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error: error.message });
  }
});
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.trim() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});


// Delete user by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

module.exports = router;