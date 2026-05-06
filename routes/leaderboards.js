/* ============================================================
   QUIZLER — routes/leaderboards.js
   GET /api/leaderboard/global
   GET /api/leaderboard/category/:id
   GET /api/leaderboard/quiz/:id
   ============================================================ */

const express = require('express');
const pool    = require('../db/pool');
const jwt     = require('jsonwebtoken');

const router = express.Router();

/* ── GET /api/leaderboard/global ─────────────────────────── */
router.get('/global', async (req, res) => {
  // Optionally identify the calling user (no hard auth requirement)
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      userId = decoded.id ?? null;
    } catch { /* invalid/expired token — treat as anonymous */ }
  }

  try {
    // Always fetch top 10
    const top10Result = await pool.query(
      `SELECT gl.rank, u.username AS user, gl.total_points AS score
       FROM global_leaderboard gl
       JOIN users u ON u.id = gl.user_id
       ORDER BY gl.rank ASC NULLS LAST, gl.total_points DESC
       LIMIT 10`
    );
    const rows = top10Result.rows;

    // If the logged-in user is outside the top 10, append their context rows
    if (userId !== null) {
      const meResult = await pool.query(
        `SELECT gl.rank
         FROM global_leaderboard gl
         WHERE gl.user_id = $1`,
        [userId]
      );
      if (meResult.rows.length > 0) {
        const myRank = Number(meResult.rows[0].rank);
        if (myRank > 10) {
          // Clamp lower bound to 11 so we never duplicate a top-10 entry
          const lowerBound = Math.max(myRank - 1, 11);
          const contextResult = await pool.query(
            `SELECT gl.rank, u.username AS user, gl.total_points AS score
             FROM global_leaderboard gl
             JOIN users u ON u.id = gl.user_id
             WHERE gl.rank BETWEEN $1 AND $2
             ORDER BY gl.rank ASC`,
            [lowerBound, myRank + 1]
          );
          rows.push(...contextResult.rows);
        }
      }
    }

    return res.json(rows);
  } catch (err) {
    console.error('GET /leaderboard/global error:', err);
    return res.status(500).json({ error: 'Failed to load global leaderboard.' });
  }
});

/* ── GET /api/leaderboard/category/:id ───────────────────── */
router.get('/category/:id', async (req, res) => {
  const catId = parseInt(req.params.id);
  if (isNaN(catId)) return res.status(400).json({ error: 'Invalid category ID.' });

  try {
    const result = await pool.query(
      `SELECT cl.rank, u.username AS user, cl.total_points AS score
       FROM category_leaderboards cl
       JOIN users u ON u.id = cl.user_id
       WHERE cl.category_id = $1
       ORDER BY cl.rank ASC NULLS LAST, cl.total_points DESC
       LIMIT 20`,
      [catId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(`GET /leaderboard/category/${catId} error:`, err);
    return res.status(500).json({ error: 'Failed to load category leaderboard.' });
  }
});

/* ── GET /api/leaderboard/quiz/:id ───────────────────────── */
router.get('/quiz/:id', async (req, res) => {
  const quizId = parseInt(req.params.id);
  if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID.' });

  try {
    const result = await pool.query(
      `SELECT ql.rank, u.username AS user, ql.best_score AS score
       FROM quiz_leaderboards ql
       JOIN users u ON u.id = ql.user_id
       WHERE ql.quiz_id = $1
       ORDER BY ql.rank ASC NULLS LAST, ql.best_score DESC
       LIMIT 20`,
      [quizId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(`GET /leaderboard/quiz/${quizId} error:`, err);
    return res.status(500).json({ error: 'Failed to load quiz leaderboard.' });
  }
});

module.exports = router;
