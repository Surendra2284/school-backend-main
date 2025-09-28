require("dotenv").config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session'); // For session handling
const MongoStore = require('connect-mongo'); // For storing sessions in MongoDB
const functions = require("firebase-functions");
const mongoUri1 = functions.config().mongodb.uri;

dotenv.config();
const app = express();

// Routes Import
const photoRoutes = require('../routes/photoRoutes');
const teacherRoutes = require('../routes/teacherRoutes');
const noticeRoutes = require('../routes/NoticeRoutes');
const attendanceRoutes = require('../routes/AttendenceRoutes');
const studentRoutes = require('../routes/studentRoutes');
const UserModel = require('../models/User'); // User model for authentication
console.log(mongoUrl1);
// Active Sessions Management
let activeSessions = {}; // In-memory session tracking
const PORT = 3000;


/** --- Middleware --- */
app.use(
  cors({
    origin: ['http://localhost:4200', 'https://fc9f-2409-40e3-1ec-74d0-286c-8069-36fa-1882.ngrok-free.app'], // Allow frontend origin and dev tunnel
    credentials: true, // Allow cookies/authentication headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  })
);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.json());

// Explicitly handle preflight OPTIONS requests
app.options('*', cors());

// Handle OPTIONS requests for authentication
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.status(200).send(); // Return OK for preflight requests
  } else {
    next(); // Continue to next middleware/routes
  }
});

// Session handling
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default-session-secret',
    resave: false,
    saveUninitialized: false, // Don't save empty sessions
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI, // MongoDB connection string from .env
      collectionName: 'sessions', // Collection to store sessions
      ttl: 24 * 60 * 60, // 1-day TTL in seconds
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // Cookie expiration: 1 day
    },
  })
);

/** --- MongoDB Connection --- */
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err.message));

/** --- Routes --- */
// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the backend server!' });
});

// Other routes
app.use('/photos', photoRoutes);
app.use('/notices', noticeRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/students', studentRoutes);
app.use('/teachers', teacherRoutes);

/** --- Middleware for Inactive Session Check --- */
function checkInactiveSession(req, res, next) {
  const username = req.body.username || req.query.username || req.session.username;

  if (username && activeSessions[username]) {
    const currentTime = Date.now();
    const lastActive = activeSessions[username].lastActive;

    // 10-minute inactivity timeout
    const inactivityTimeout = 10 * 60 * 1000;

    if (currentTime - lastActive > inactivityTimeout) {
      delete activeSessions[username]; // Clear session from activeSessions
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session for inactive user:', err);
        }
        console.log(`User ${username} has been logged out due to inactivity.`);
      });
    }
  }
  next();
}

/** --- Routes Implementation --- */
// User Sign-Up
app.post('/sign-up', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new UserModel({
      username: req.body.username,
      password: hashedPassword,
      role: req.body.role,
    });

    const savedUser = await user.save();
    res.status(201).json({ message: 'User created', result: savedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
});

// User Login
app.post('/login', checkInactiveSession, async (req, res) => {
  const { username, password, role } = req.body;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret || jwtSecret.trim() === '') {
    console.error('JWT_SECRET is not set or is invalid.');
    return res.status(500).json({ message: 'Server configuration error: Invalid JWT secret.' });
  }

  try {
    const user = await UserModel.findOne({ username });
    if (!user) return res.status(401).json({ message: 'User not found' });

    if (user.role !== role) return res.status(403).json({ message: 'Unauthorized role' });

    if (activeSessions[username] && activeSessions[username].sessionID !== req.sessionID) {
      return res.status(403).json({ message: 'User already logged in from another device.' });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) return res.status(401).json({ message: 'Incorrect password' });

    const token = jwt.sign({ username: user.username, userId: user._id, role: user.role }, jwtSecret, { expiresIn: '1h' });

    activeSessions[username] = { sessionID: req.sessionID, lastActive: Date.now() };
    res.status(200).json({ token, expiresIn: 3600 });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update Session Activity
app.post('/update-activity', (req, res) => {
  const { username } = req.body;

  if (username && activeSessions[username]) {
    activeSessions[username].lastActive = Date.now();
    res.status(200).json({ message: 'Session activity updated successfully.' });
  } else {
    res.status(400).json({ message: 'User session not found.' });
  }
});

// Logout
app.post('/logout', (req, res) => {
  const { username } = req.body;

  if (activeSessions[username]) {
    delete activeSessions[username];
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: 'Failed to log out' });
      res.status(200).json({ message: 'Logged out successfully' });
    });
  } else {
    res.status(400).json({ message: 'User is not logged in' });
  }
});

// Catch-All for Undefined Routes
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  console.log('Request headers:', req.headers);
  next();
});
module.exports = app;