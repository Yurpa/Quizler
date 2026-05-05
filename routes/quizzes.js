/* ============================================================
   QUIZLER — routes/quizzes.js
   GET /api/categories
   GET /api/quizzes           ?cat=<categoryId>  (no answers)
   GET /api/quizzes/:id       full quiz with questions + answers
   POST /api/attempts         submit a completed quiz attempt
   ============================================================ */

const express         = require('express');
const pool            = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/* ──────────────────────────────────────────────────────────
   GET /api/categories
   REQ 3.3, 3.4 — returns all categories with quiz counts
   ────────────────────────────────────────────────────────── */
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.description,
              COUNT(q.id)::int AS "quizCount"
       FROM categories c
       LEFT JOIN quizzes q ON q.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('GET /categories error:', err);
    return res.status(500).json({ error: 'Failed to load categories.' });
  }
});

/* ──────────────────────────────────────────────────────────
   GET /api/quizzes
   REQ 3.3, 3.5 — list quizzes, optionally filtered by category.
   Does NOT return questions/answers (performance).
   Optionally marks which quizzes the logged-in user has completed.
   ────────────────────────────────────────────────────────── */
router.get('/quizzes', async (req, res) => {
  const { cat } = req.query;
  try {
    const params = [];
    let where = '';
    if (cat) { params.push(parseInt(cat)); where = 'WHERE q.category_id = $1'; }

    const result = await pool.query(
      `SELECT q.id, q.title, q.category_id AS "categoryId",
              c.name AS category, q.difficulty,
              q.difficulty_multiplier::float AS multiplier,
              q.time_per_question AS "timePerQ",
              q.language,
              q.description AS desc,
              q.avg_score::float AS "avgScore",
              q.completed_count AS "completedCount",
              to_char(q.updated_at, 'DD.MM.YYYY') AS updated,
              (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id)::int AS "questionCount"
       FROM quizzes q
       JOIN categories c ON c.id = q.category_id
       ${where}
       ORDER BY q.id`,
      params
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('GET /quizzes error:', err);
    return res.status(500).json({ error: 'Failed to load quizzes.' });
  }
});

/* ──────────────────────────────────────────────────────────
   GET /api/quizzes/:id
   REQ 4.2 — full quiz with questions and answer options.
   Also returns the top-5 quiz leaderboard.
   NOTE: answer correct flags are included because the scoring
   logic runs server-side on POST /api/attempts.
   ────────────────────────────────────────────────────────── */
router.get('/quizzes/:id', async (req, res) => {
  const quizId = parseInt(req.params.id);
  if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID.' });

  try {
    // Quiz metadata
    const qResult = await pool.query(
      `SELECT q.id, q.title, q.category_id AS "categoryId",
              c.name AS category, q.difficulty,
              q.difficulty_multiplier::float AS multiplier,
              q.time_per_question AS "timePerQ",
              q.language,
              q.description AS desc,
              q.avg_score::float AS "avgScore",
              q.completed_count AS "completedCount",
              to_char(q.updated_at, 'DD.MM.YYYY') AS updated
       FROM quizzes q
       JOIN categories c ON c.id = q.category_id
       WHERE q.id = $1`,
      [quizId]
    );
    if (qResult.rows.length === 0) return res.status(404).json({ error: 'Quiz not found.' });
    const quiz = qResult.rows[0];

    // Questions
    const questResult = await pool.query(
      `SELECT id, question_text AS text, position
       FROM questions WHERE quiz_id = $1 ORDER BY position`,
      [quizId]
    );

    // Answer options for all questions in one query
    const qIds = questResult.rows.map(q => q.id);
    let optMap = {};
    if (qIds.length > 0) {
      const optResult = await pool.query(
        `SELECT question_id, option_text, is_correct, position
         FROM answer_options
         WHERE question_id = ANY($1)
         ORDER BY question_id, position`,
        [qIds]
      );
      for (const opt of optResult.rows) {
        if (!optMap[opt.question_id]) optMap[opt.question_id] = [];
        optMap[opt.question_id].push(opt);
      }
    }

    // Build questions array matching frontend shape: { text, opts[], correct }
    quiz.questions = questResult.rows.map(q => {
      const options  = optMap[q.id] || [];
      const opts     = options.map(o => o.option_text);
      const correct  = options.findIndex(o => o.is_correct);
      return { text: q.text, opts, correct };
    });

    // Top-5 quiz leaderboard
    const lbResult = await pool.query(
      `SELECT ql.rank, u.username AS user, ql.best_score AS score
       FROM quiz_leaderboards ql
       JOIN users u ON u.id = ql.user_id
       WHERE ql.quiz_id = $1
       ORDER BY ql.rank ASC
       LIMIT 5`,
      [quizId]
    );
    quiz.leaderboard = lbResult.rows;

    return res.json(quiz);
  } catch (err) {
    console.error(`GET /quizzes/${quizId} error:`, err);
    return res.status(500).json({ error: 'Failed to load quiz.' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /api/attempts
   Body: { quizId, answers: number[] }
   REQ 5.1–5.5: scores, saves, updates leaderboards.
   ────────────────────────────────────────────────────────── */
router.post('/attempts', requireAuth, async (req, res) => {
  const { quizId, answers, timeLeftArr } = req.body;
  if (!quizId || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'quizId and answers are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Load quiz + correct answers
    const quizRes = await client.query(
      `SELECT q.id, q.difficulty_multiplier::float AS multiplier,
              q.time_per_question AS "timePerQ"
       FROM quizzes q WHERE q.id = $1`,
      [quizId]
    );
    if (quizRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    const quiz = quizRes.rows[0];

    // Load questions ordered by position
    const questRes = await client.query(
      `SELECT q.id, ao.is_correct, ao.position AS opt_pos
       FROM questions q
       JOIN answer_options ao ON ao.question_id = q.id
       WHERE q.quiz_id = $1
       ORDER BY q.position, ao.position`,
      [quizId]
    );

    // Build a map: questionIndex → correct option position
    const questionMap = {};
    for (const row of questRes.rows) {
      if (!questionMap[row.id]) questionMap[row.id] = { correctPos: -1 };
      if (row.is_correct) questionMap[row.id].correctPos = row.opt_pos;
    }
    const questionIds = [...new Set(questRes.rows.map(r => r.id))];

    // REQ 5.1, 5.2 — score each answer
    let correct = 0, skipped = 0, scoreRaw = 0;
    const results = [];
    questionIds.forEach((qId, i) => {
      const userAnswer = answers[i] ?? -1;
      const timeLeft   = (timeLeftArr && timeLeftArr[i] != null) ? timeLeftArr[i] : 0;
      const correctPos = questionMap[qId]?.correctPos ?? -1;

      if (userAnswer === -1) {
        skipped++;
        results.push({ correct: false, skipped: true });
        return;
      }

      const isCorrect = (userAnswer === correctPos);
      if (isCorrect) {
        correct++;
        // REQ 5.1 — points scaled by time remaining
        scoreRaw += (1 + (timeLeft / quiz.timePerQ));
      }
      results.push({ correct: isCorrect, userAnswer, correctPos });
    });

    // REQ 5.3 — multiply by difficulty multiplier
    const finalScore = Math.round(scoreRaw * quiz.multiplier * 10);

    // REQ 5.4 — persist attempt
    await client.query(
      `INSERT INTO quiz_attempts (user_id, quiz_id, score, completed_at)
       VALUES ($1, $2, $3, NOW())`,
      [req.user.id, quizId, finalScore]
    );

    // REQ 5.5 — update user's total points
    await client.query(
      `UPDATE users SET total_points = total_points + $1 WHERE id = $2`,
      [finalScore, req.user.id]
    );

    // Update quiz_leaderboards (best score only)
    await client.query(
      `INSERT INTO quiz_leaderboards (quiz_id, user_id, best_score, rank, achieved_at)
       VALUES ($1, $2, $3, NULL, NOW())
       ON CONFLICT (quiz_id, user_id)
       DO UPDATE SET
         best_score  = GREATEST(quiz_leaderboards.best_score, EXCLUDED.best_score),
         achieved_at = CASE
           WHEN EXCLUDED.best_score > quiz_leaderboards.best_score
             THEN NOW()
           ELSE quiz_leaderboards.achieved_at
         END`,
      [quizId, req.user.id, finalScore]
    );

    // Recompute and persist quiz leaderboard ranks (REQ 6.3, 6.4)
    await client.query(
      `UPDATE quiz_leaderboards ql
       SET rank = sub.new_rank
       FROM (
         SELECT user_id,
                RANK() OVER (ORDER BY best_score DESC, achieved_at ASC) AS new_rank
         FROM quiz_leaderboards WHERE quiz_id = $1
       ) sub
       WHERE ql.quiz_id = $1 AND ql.user_id = sub.user_id`,
      [quizId]
    );

    // Update category leaderboard
    const catRes = await client.query('SELECT category_id FROM quizzes WHERE id = $1', [quizId]);
    if (catRes.rows.length > 0) {
      const catId = catRes.rows[0].category_id;
      const catTotal = await client.query(
        `SELECT COALESCE(SUM(qa.score), 0)::int AS total
         FROM quiz_attempts qa
         JOIN quizzes qz ON qz.id = qa.quiz_id
         WHERE qa.user_id = $1 AND qz.category_id = $2`,
        [req.user.id, catId]
      );
      const catPoints = catTotal.rows[0].total;
      await client.query(
        `INSERT INTO category_leaderboards (category_id, user_id, total_points, rank)
         VALUES ($1, $2, $3, NULL)
         ON CONFLICT (category_id, user_id)
         DO UPDATE SET total_points = EXCLUDED.total_points`,
        [catId, req.user.id, catPoints]
      );
      await client.query(
        `UPDATE category_leaderboards cl
         SET rank = sub.new_rank
         FROM (
           SELECT user_id,
                  RANK() OVER (ORDER BY total_points DESC) AS new_rank
           FROM category_leaderboards WHERE category_id = $1
         ) sub
         WHERE cl.category_id = $1 AND cl.user_id = sub.user_id`,
        [catId]
      );
    }

    // Update global leaderboard
    const globalTotal = await client.query(
      'SELECT total_points FROM users WHERE id = $1',
      [req.user.id]
    );
    const globalPoints = globalTotal.rows[0]?.total_points ?? 0;
    await client.query(
      `INSERT INTO global_leaderboard (user_id, total_points, rank, updated_at)
       VALUES ($1, $2, NULL, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET total_points = EXCLUDED.total_points, updated_at = NOW()`,
      [req.user.id, globalPoints]
    );
    await client.query(
      `UPDATE global_leaderboard gl
       SET rank = sub.new_rank
       FROM (
         SELECT user_id,
                RANK() OVER (ORDER BY total_points DESC, updated_at ASC) AS new_rank
         FROM global_leaderboard
       ) sub
       WHERE gl.user_id = sub.user_id`
    );

    await client.query('COMMIT');

    return res.json({
      score: finalScore,
      correct,
      skipped,
      total: questionIds.length,
      results,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /attempts error:', err);
    return res.status(500).json({ error: 'Failed to submit quiz attempt.' });
  } finally {
    client.release();
  }
});

module.exports = router;
