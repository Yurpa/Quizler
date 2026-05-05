/* ============================================================
   QUIZLER — routes/leaderboards.js
   GET /api/leaderboard/global
   GET /api/leaderboard/category/:id
   GET /api/leaderboard/quiz/:id
   ============================================================ */

const express = require('express');
const pool    = require('../db/pool');

const router = express.Router();

/* ── GET /api/leaderboard/global ─────────────────────────── */
router.get('/global', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT gl.rank, u.username AS user, gl.total_points AS score
       FROM global_leaderboard gl
       JOIN users u ON u.id = gl.user_id
       ORDER BY gl.rank ASC NULLS LAST, gl.total_points DESC
       LIMIT 50`
    );
    return res.json(result.rows);
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
