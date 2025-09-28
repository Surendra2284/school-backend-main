const express = require('express');
const router = express.Router();
const { addUser, editUser, deleteUser, findUser } = require('../../src/app/services/user');

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

module.exports = router;