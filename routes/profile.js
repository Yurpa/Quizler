/* ============================================================
   QUIZLER — routes/profile.js
   GET   /api/profile          — user profile + stats
   PATCH /api/profile          — update email or password
   GET   /api/profile/history  — quiz attempt history
   ============================================================ */

const express         = require('express');
const bcrypt          = require('bcrypt');
const pool            = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/* ── GET /api/profile ─────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userRes = await pool.query(
      `SELECT id, username, email, role,
              to_char(registration_date, 'DD.MM.YYYY') AS registration_date,
              total_points
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const user = userRes.rows[0];

    // REQ 2.2 — statistics
    const statsRes = await pool.query(
      `SELECT COUNT(*)::int          AS "totalCompleted",
              ROUND(AVG(score))::int AS "avgScore"
       FROM quiz_attempts WHERE user_id = $1`,
      [req.user.id]
    );
    const stats = statsRes.rows[0];

    // Global rank
    const rankRes = await pool.query(
      'SELECT rank FROM global_leaderboard WHERE user_id = $1',
      [req.user.id]
    );
    const globalRank = rankRes.rows[0]?.rank ?? null;

    return res.json({ ...user, ...stats, globalRank });
  } catch (err) {
    console.error('GET /profile error:', err);
    return res.status(500).json({ error: 'Failed to load profile.' });
  }
});

/* ── PATCH /api/profile ───────────────────────────────────── */
router.patch('/', requireAuth, async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  try {
    // Fetch current record for password comparison
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const user = userRes.rows[0];

    const updates = [];
    const values  = [];
    let   idx     = 1;

    // Email update
    if (email) {
      const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRx.test(email)) return res.status(400).json({ error: 'Invalid email format.' });
      const dup = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, req.user.id]);
      if (dup.rows.length > 0) return res.status(409).json({ error: 'Email already taken.' });
      updates.push(`email = $${idx++}`); values.push(email);
    }

    // Password update
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password is required to set a new one.' });
      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
      if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      const hash = await bcrypt.hash(newPassword, 12);
      updates.push(`password_hash = $${idx++}`); values.push(hash);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update.' });

    values.push(req.user.id);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );

    return res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('PATCH /profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

/* ── GET /api/profile/history ─────────────────────────────── */
router.get('/history', requireAuth, async (req, res) => {
  const { sortBy = 'date', dir = 'desc' } = req.query;

  // Whitelist sortable columns
  const colMap = {
    quiz:     'qz.title',
    category: 'c.name',
    score:    'qa.score',
    date:     'qa.completed_at',
  };
  const col    = colMap[sortBy] ?? 'qa.completed_at';
  const order  = dir === 'asc' ? 'ASC' : 'DESC';

  try {
    const result = await pool.query(
      `SELECT qz.title AS quiz, c.name AS category, qa.score,
              to_char(qa.completed_at, 'DD.MM.YYYY') AS date,
              qz.id AS "quizId"
       FROM quiz_attempts qa
       JOIN quizzes qz    ON qz.id = qa.quiz_id
       JOIN categories c  ON c.id  = qz.category_id
       WHERE qa.user_id = $1
       ORDER BY ${col} ${order}`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('GET /profile/history error:', err);
    return res.status(500).json({ error: 'Failed to load quiz history.' });
  }
});

module.exports = router;
