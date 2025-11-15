const express = require('express');
const { register, login, editUser, deleteUser, findUser } = require('../controllers/authController');

const router = express.Router();

// Route to register a new user
router.post('/register', register);

// Route to log in a user
router.post('/login', login);

// Route to edit (update) a user
router.put('/edit/:id', editUser);

// Route to delete a user
router.delete('/delete/:id', deleteUser);

// Route to find a user by ID
router.get('/find/:id', findUser);

module.exports = router;