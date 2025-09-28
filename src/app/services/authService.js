const express = require('express');
const app = express();
app.use(express.json());

const loginUser = (email, password) => {
  return new Promise((resolve, reject) => {
    // Replace with actual authentication logic
    if (email === 'test@example.com' && password === 'password') {
      resolve({ id: 1, email });
    } else {
      reject(new Error('Invalid credentials'));
    }
  });
};

// Define the login route
app.post('http://localhost:3000/api/login', (req, res) => {
  const { email, password } = req.body;
  loginUser(email, password)
    .then(user => res.json(user))
    .catch(err => res.status(401).json({ error: err.message }));
});

module.exports = {
  loginUser
};

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});