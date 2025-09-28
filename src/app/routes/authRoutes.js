const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { loginUser } = require('../services/authService');

router.use(bodyParser.json()); // Ensure the request body is parsed as JSON

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Received login request:', req.body); // Log the received data
  loginUser(email, password)
    .then(user => res.json(user))
    .catch(error => {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    });
});

module.exports = router;