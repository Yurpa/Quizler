/* ============================================================
   QUIZLER — routes/auth.js
   POST /api/auth/register
   POST /api/auth/login
   POST /api/auth/logout
   GET  /api/auth/me
   ============================================================ */

const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const pool     = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

/* ── Helper: sign a JWT (expires in 24 h per REQ 4.1) ── */
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/* ──────────────────────────────────────────────────────────
   POST /api/auth/register
   Body: { email, username, password }
   Decision table: Requirements Spec Table 5.1
   ────────────────────────────────────────────────────────── */
router.post('/register', async (req, res) => {
  const { email = '', username = '', password = '' } = req.body;

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email)                   return res.status(400).json({ error: 'Email is required.' });
  if (!emailRx.test(email))     return res.status(400).json({ error: 'Invalid email format.' });
  if (!username)                return res.status(400).json({ error: 'Username is required.' });
  if (!password)                return res.status(400).json({ error: 'Password is required.' });
  if (password.length < 8)      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    // REQ 1.3, 1.4 — uniqueness checks
    const dup = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1',
      [email, username]
    );
    if (dup.rows.length > 0) {
      const existing = dup.rows[0];
      // Re-query specifically to give accurate error message
      const emailExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (emailExists.rows.length > 0) return res.status(409).json({ error: 'Email already taken.' });
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // REQ 1.8 — default role is 'player'
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, registration_date, total_points)
       VALUES ($1, $2, $3, 'player', CURRENT_DATE, 0)
       RETURNING id, username, email, role, registration_date, total_points`,
      [username, email, password_hash]
    );

    const user  = result.rows[0];
    const token = signToken(user);

    // REQ 6.1 — add to global leaderboard with 0 points
    await pool.query(
      `INSERT INTO global_leaderboard (user_id, total_points, rank, updated_at)
       VALUES ($1, 0, NULL, NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    return res.status(201).json({ token, user: { ...user, password_hash: undefined } });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /api/auth/login
   Body: { identifier, password }  (identifier = email OR username)
   Decision table: Requirements Spec Table 5.2
   ────────────────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  const { identifier = '', password = '' } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Please fill all the fields in.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [identifier]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email/username or password.' });
    }

    const user  = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email/username or password.' });
    }

    const token = signToken(user);
    const { password_hash, ...safeUser } = user;
    // Stringify dates for consistent JSON format
    safeUser.registration_date = safeUser.registration_date?.toISOString?.().slice(0, 10) ?? safeUser.registration_date;
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /api/auth/logout
   JWT is stateless — logout is handled client-side by
   deleting the token from localStorage. This endpoint
   exists for completeness and future refresh-token support.
   ────────────────────────────────────────────────────────── */
router.post('/logout', requireAuth, (req, res) => {
  return res.json({ message: 'Logged out successfully.' });
});

/* ──────────────────────────────────────────────────────────
   GET /api/auth/me
   Returns the current user's fresh profile from the DB.
   ────────────────────────────────────────────────────────── */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, role,
              to_char(registration_date, 'DD.MM.YYYY') AS registration_date,
              total_points
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('/me error:', err);
    return res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

module.exports = router;
