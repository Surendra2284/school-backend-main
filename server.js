const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // ✅ using bcryptjs (works on Render)
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');

dotenv.config();
const app = express();

// --- Import Routes ---
const UserModel = require('./models/User');
const userRoutes = require('./routes/userRoutes');
const photoRoutes = require('./routes/photoRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const noticeRoutes = require('./routes/NoticeRoutes');
const attendanceRoutes = require('./routes/AttendenceRoutes');
const studentRoutes = require('./routes/studentRoutes');
const StudentProgressRoutes = require('./routes/StudentProgressRoutes');
// --- Active Sessions In-Memory ---
let activeSessions = {};

/** --- Middleware --- */
app.use(
  cors({
    origin: ['http://localhost:4200','https://backend1-m4j8.onrender.com','https://school-frontend-6x4m.onrender.com'], // change later if Angular is deployed
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Request logger
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.path}`);
  next();
});

// Handle OPTIONS (CORS preflight)
app.options('*', cors());

// Session handling
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default-session-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

/** --- MongoDB Connection --- */
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

/** --- Routes --- */
// Root
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the backend server!' });
});
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  console.log('Request headers:', req.headers);
  next();
});

// ... routes ...
// Feature routes
app.use('/photos', photoRoutes);
app.use('/notices', noticeRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/students', studentRoutes);
app.use('/teachers', teacherRoutes);
app.use('/users', userRoutes);
app.use('/StudentProgress', StudentProgressRoutes);
/** --- Middleware: Inactive Session Check --- */
function checkInactiveSession(req, res, next) {
  const username = req.body.username || req.query.username || req.session.username;

  if (username && activeSessions[username]) {
    const now = Date.now();
    const lastActive = activeSessions[username].lastActive;
    const timeout = 10 * 60 * 1000; // 10 min

    if (now - lastActive > timeout) {
      delete activeSessions[username];
      req.session.destroy((err) => {
        if (err) console.error('Error destroying session:', err);
      });
      console.log(`⚠️ User ${username} logged out due to inactivity.`);
    }
  }
  next();
}

/** --- Auth Routes --- */
// Sign-Up
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

// Login
app.post('/login', checkInactiveSession, async (req, res) => {
  const { username, password, role } = req.body;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ message: 'Server misconfigured: missing JWT_SECRET' });
  }

  try {
    const user = await UserModel.findOne({ username });
    if (!user) return res.status(401).json({ message: 'User not found' });

    if (user.role !== role) return res.status(403).json({ message: 'Unauthorized role' });

    if (activeSessions[username] && activeSessions[username].sessionID !== req.sessionID) {
      return res.status(403).json({ message: 'Already logged in elsewhere.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    const token = jwt.sign(
      { username: user.username, userId: user._id, role: user.role },
      jwtSecret,
      { expiresIn: '1h' }
    );

    activeSessions[username] = { sessionID: req.sessionID, lastActive: Date.now() };
    res.status(200).json({ token, expiresIn: 3600 });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update activity
app.post('/update-activity', (req, res) => {
  const { username } = req.body;
  if (username && activeSessions[username]) {
    activeSessions[username].lastActive = Date.now();
    res.status(200).json({ message: 'Session updated' });
  } else {
    res.status(400).json({ message: 'Session not found' });
  }
});
app.post('/update-activity', checkInactiveSession, (req, res) => {
  const { username } = req.body;
  if (username && activeSessions[username]) {
    activeSessions[username].lastActive = Date.now();
    return res.status(200).json({ message: 'Session updated' });
  }
  return res.status(401).json({ message: 'Session expired or not found' });
});

// Logout
app.post('/logout', (req, res) => {
  const { username } = req.body;
  if (activeSessions[username]) {
    delete activeSessions[username];
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: 'Logout failed' });
      res.status(200).json({ message: 'Logged out successfully' });
    });
  } else {
    res.status(400).json({ message: 'User not logged in' });
  }
});

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

/** --- Start Server --- */
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

