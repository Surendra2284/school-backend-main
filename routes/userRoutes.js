const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// -------------------------
// GET ALL USERS
// -------------------------
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// -------------------------
// CREATE NEW USER (REGISTER)
// -------------------------
router.post('/', async (req, res) => {
  try {
    const body = { ...req.body };
    body.password = await bcrypt.hash(body.password, 10);

    const user = new User(body);
    const savedUser = await user.save();

    res.status(201).json(savedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// -------------------------
// BULK CREATE OR UPDATE USERS
// -------------------------
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
        if (!u.username || !u.password || !u.role) {
          skipped++;
          continue;
        }

        u.username = u.username.trim();

        const existing = await User.findOne({ username: u.username });

        if (existing) {
          const passwordMatches = await bcrypt.compare(u.password, existing.password);

          if (!passwordMatches) {
            u.password = await bcrypt.hash(u.password, 10);
          } else {
            delete u.password; // keep existing
          }

          await User.updateOne(
            { username: u.username },
            { $set: u }
          );

          updated++;
        } else {
          u.password = await bcrypt.hash(u.password, 10);
          await new User(u).save();
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

// -------------------------
// GET PENDING USERS
// -------------------------
router.get('/pending-users', async (req, res) => {
  try {
    const users = await User.find({ isApproved: false });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending users', error: error.message });
  }
});

// -------------------------
// GET USERS BY APPROVAL STATUS
// -------------------------
router.get('/isApproved/:status', async (req, res) => {
  try {
    const isApproved = req.params.status === 'true';
    const users = await User.find({ isApproved });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// -------------------------
// APPROVE USER
// -------------------------
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

// -------------------------
// UPDATE USER BY ID
// -------------------------
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };

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

// -------------------------
// GET USER BY USERNAME
// -------------------------
router.get('/by-username/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.trim() });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);

  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

// -------------------------
// DELETE USER BY ID
// -------------------------
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
