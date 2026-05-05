/* ============================================================
   QUIZLER — server.js
   Express application entry point.
   Serves static frontend from /public and all API routes.
   ============================================================ */

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const path      = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes         = require('./routes/auth');
const quizRoutes         = require('./routes/quizzes');
const leaderboardRoutes  = require('./routes/leaderboards');
const profileRoutes      = require('./routes/profile');
const adminRoutes        = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ───────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:"],
    },
  },
}));

// ── CORS — allow same origin + any Render preview URLs ───────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [];

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (e.g. curl, Render health checks)
    if (!origin) return cb(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /\.onrender\.com$/.test(origin) ||
      process.env.NODE_ENV !== 'production'
    ) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

app.use(express.json());

// ── Rate limiting on auth routes (REQ 4.1 brute-force protection) ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── API routes ────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api',             quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile',     profileRoutes);
app.use('/api/admin',       adminRoutes);


// ── Static frontend ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// All non-API routes return index.html (allows direct URL access)
// ── Static frontend ───────────────────────────────────────────
app.use(express.static(path.join(dirname, 'public')));

// SPA fallback: only for non-API, non-.html paths
app.use(express.static(path.resolve('public')));

// SPA fallback
app.use(express.static(path.resolve('public')));

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found.' });
  }
  if (path.extname(req.path)) {
    return res.status(404).send('Not found.');
  }
  res.sendFile(path.resolve('public', 'index.html'));
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Quizler server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
