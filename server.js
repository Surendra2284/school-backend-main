const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');

dotenv.config();
const app = express();

/** --- Models & Routes --- */
const UserModel = require('./models/User');
const userRoutes = require('./routes/userRoutes');
const photoRoutes = require('./routes/photoRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const noticeRoutes = require('./routes/NoticeRoutes');
const attendanceRoutes = require('./routes/AttendenceRoutes');
const studentRoutes = require('./routes/studentRoutes');
const StudentProgressRoutes = require('./routes/StudentProgressRoutes');
const teacherImportRouter = require('./routes/teacherimport');
const complainRoutes = require('./routes/complainRoutes');
const teacherTaskRoutes = require('./routes/teachertaskroutes');

/** --- CORS --- */
const allowedOrigins = [
  'http://localhost:4200',
  'https://school-frontend-6x4m.onrender.com',
  'https://backend1-m4j8.onrender.com',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  'http://localhost:8080'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      console.log('❌ CORS blocked:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Simple request logger (single instance)
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin || 'N/A');
  console.log('User-Agent:', req.headers['user-agent'] || 'N/A');
  next();
});

// Handle OPTIONS preflight
app.options('*', cors());

/** --- Body Parsing --- */
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/** --- Sessions (Mongo-backed, Render‑friendly) --- */
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default-session-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60,
      autoRemove: 'native',
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    },
  })
);

/** --- MongoDB Connection (Mongoose 7/8 friendly) --- */
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    bufferCommands: false,
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

/** --- Routes --- */
// Health/root
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the backend server!' });
});

// API routes
app.use('/photos', photoRoutes);
app.use('/notices', noticeRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/students', studentRoutes);
app.use('/teachers', teacherRoutes);
app.use('/users', userRoutes);
app.use('/StudentProgress', StudentProgressRoutes);
app.use('/api', teacherImportRouter);
app.use('/complains', complainRoutes);
app.use('/teachertask', teacherTaskRoutes);

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
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ message: 'Server misconfigured: missing JWT_SECRET' });
  }

  try {
    const user = await UserModel.findOne({ username });
    if (!user) return res.status(401).json({ message: 'User not found' });

    if (user.role !== role) return res.status(403).json({ message: 'Unauthorized role' });

    if (!user.isApproved) {
      return res.status(403).json({ message: 'Your account is not approved by admin yet.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    const token = jwt.sign(
      { username: user.username, userId: user._id, role: user.role },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // store minimal user info in MongoDB-backed session
    req.session.user = { username: user.username, role: user.role };
    res.status(200).json({ token, expiresIn: 3600 });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout
app.post('/logout', (req, res) => {
  if (!req.session.user) {
    return res.status(400).json({ message: 'User not logged in' });
  }

  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

// Optional: simple activity endpoint if frontend needs ping
app.post('/update-activity', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Session expired or not found' });
  }
  return res.status(200).json({ message: 'Session is active' });
});

/** --- 404 Handler --- */
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
});

/** --- Global Error Handler --- */
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

/** --- Start Server --- */
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
