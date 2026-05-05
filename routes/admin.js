/* ============================================================
   QUIZLER — routes/admin.js
   GET    /api/admin/quizzes         — list all quizzes (admin view)
   POST   /api/admin/quizzes         — create quiz
   PUT    /api/admin/quizzes/:id     — edit quiz
   DELETE /api/admin/quizzes/:id     — delete quiz
   All routes require admin role (enforced by requireAdmin middleware).
   ============================================================ */

const express            = require('express');
const pool               = require('../db/pool');
const { requireAdmin }   = require('../middleware/auth');

const router = express.Router();

const MULTIPLIERS = { Easy: 0.75, Normal: 1.0, Hard: 1.5 };
const TIME_PER_Q  = { Easy: 30,   Normal: 45,  Hard: 60  };

/* ── Validation helper ── */
function validateQuizBody(body) {
  const { title, categoryId, difficulty, questions = [] } = body;
  if (!title)      return 'Quiz title is required.';
  if (!categoryId) return 'Category is required.';
  if (!MULTIPLIERS[difficulty]) return 'Difficulty level is required.';
  if (questions.length === 0)   return 'A quiz must have at least one question.';
  for (const q of questions) {
    if (!q.text || !q.text.trim()) return 'Each question must have question text.';
    if (!Array.isArray(q.opts) || q.opts.filter(o => o?.trim()).length < 2)
      return 'Each question must have between 2 and 6 answer options.';
  }
  return null;
}

/* ── GET /api/admin/quizzes ─────────────────────────────────
   Returns full quiz data including questions for the admin table.
   ────────────────────────────────────────────────────────── */
router.get('/quizzes', requireAdmin, async (req, res) => {
  try {
    const quizRes = await pool.query(
      `SELECT q.id, q.title, q.category_id AS "categoryId",
              c.name AS category, q.difficulty,
              q.difficulty_multiplier::float AS multiplier,
              q.time_per_question AS "timePerQ"
       FROM quizzes q JOIN categories c ON c.id = q.category_id
       ORDER BY q.id`
    );

    const quizzes = quizRes.rows;

    // Load all questions + options in bulk
    if (quizzes.length > 0) {
      const ids = quizzes.map(q => q.id);

      const qstRes = await pool.query(
        `SELECT id, quiz_id AS "quizId", question_text AS text, position
         FROM questions WHERE quiz_id = ANY($1) ORDER BY quiz_id, position`,
        [ids]
      );
      const aopRes = await pool.query(
        `SELECT ao.question_id AS "questionId", ao.option_text, ao.is_correct, ao.position
         FROM answer_options ao
         JOIN questions q ON q.id = ao.question_id
         WHERE q.quiz_id = ANY($1)
         ORDER BY ao.question_id, ao.position`,
        [ids]
      );

      const optsByQ = {};
      for (const opt of aopRes.rows) {
        if (!optsByQ[opt.questionId]) optsByQ[opt.questionId] = [];
        optsByQ[opt.questionId].push(opt);
      }

      const questByQuiz = {};
      for (const q of qstRes.rows) {
        if (!questByQuiz[q.quizId]) questByQuiz[q.quizId] = [];
        const opts    = optsByQ[q.id] || [];
        const correct = opts.findIndex(o => o.is_correct);
        questByQuiz[q.quizId].push({ text: q.text, opts: opts.map(o => o.option_text), correct });
      }

      for (const quiz of quizzes) {
        quiz.questions = questByQuiz[quiz.id] || [];
      }
    }

    return res.json(quizzes);
  } catch (err) {
    console.error('GET /admin/quizzes error:', err);
    return res.status(500).json({ error: 'Failed to load quizzes.' });
  }
});

/* ── POST /api/admin/quizzes — create ──────────────────────── */
router.post('/quizzes', requireAdmin, async (req, res) => {
  const validationError = validateQuizBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { title, categoryId, difficulty, questions } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const quizRes = await client.query(
      `INSERT INTO quizzes
         (title, category_id, difficulty, difficulty_multiplier, time_per_question,
          language, description, avg_score, completed_count, updated_at)
       VALUES ($1,$2,$3,$4,$5,'English',$6,0,0,CURRENT_DATE)
       RETURNING id`,
      [title, categoryId, difficulty, MULTIPLIERS[difficulty], TIME_PER_Q[difficulty],
       `${title} — a quiz on this topic.`]
    );
    const quizId = quizRes.rows[0].id;

    await insertQuestionsAndOptions(client, quizId, questions);

    await client.query('COMMIT');
    return res.status(201).json({ id: quizId, message: 'Quiz created successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /admin/quizzes error:', err);
    return res.status(500).json({ error: 'Failed to create quiz.' });
  } finally {
    client.release();
  }
});

/* ── PUT /api/admin/quizzes/:id — edit ─────────────────────── */
router.put('/quizzes/:id', requireAdmin, async (req, res) => {
  const quizId = parseInt(req.params.id);
  if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID.' });

  const validationError = validateQuizBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { title, categoryId, difficulty, questions } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const check = await client.query('SELECT id FROM quizzes WHERE id = $1', [quizId]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    await client.query(
      `UPDATE quizzes
       SET title = $1, category_id = $2, difficulty = $3,
           difficulty_multiplier = $4, time_per_question = $5, updated_at = CURRENT_DATE
       WHERE id = $6`,
      [title, categoryId, difficulty, MULTIPLIERS[difficulty], TIME_PER_Q[difficulty], quizId]
    );

    // Delete old questions (cascades to answer_options)
    await client.query(
      'DELETE FROM questions WHERE quiz_id = $1',
      [quizId]
    );

    await insertQuestionsAndOptions(client, quizId, questions);

    await client.query('COMMIT');
    return res.json({ message: 'Quiz updated successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`PUT /admin/quizzes/${quizId} error:`, err);
    return res.status(500).json({ error: 'Failed to update quiz.' });
  } finally {
    client.release();
  }
});

/* ── DELETE /api/admin/quizzes/:id ─────────────────────────── */
router.delete('/quizzes/:id', requireAdmin, async (req, res) => {
  const quizId = parseInt(req.params.id);
  if (isNaN(quizId)) return res.status(400).json({ error: 'Invalid quiz ID.' });

  try {
    const result = await pool.query(
      'DELETE FROM quizzes WHERE id = $1 RETURNING id',
      [quizId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quiz not found.' });
    return res.json({ message: 'Quiz deleted successfully.' });
  } catch (err) {
    console.error(`DELETE /admin/quizzes/${quizId} error:`, err);
    return res.status(500).json({ error: 'Failed to delete quiz.' });
  }
});

/* ── Shared helper: insert questions + answer options ── */
async function insertQuestionsAndOptions(client, quizId, questions) {
  for (let pos = 0; pos < questions.length; pos++) {
    const q = questions[pos];
    const qRes = await client.query(
      `INSERT INTO questions (quiz_id, question_text, position) VALUES ($1, $2, $3) RETURNING id`,
      [quizId, q.text.trim(), pos + 1]
    );
    const qId = qRes.rows[0].id;

    const opts = (q.opts || []).map(o => o?.trim()).filter(Boolean);
    for (let oi = 0; oi < opts.length; oi++) {
      await client.query(
        `INSERT INTO answer_options (question_id, option_text, is_correct, position)
         VALUES ($1, $2, $3, $4)`,
        [qId, opts[oi], oi === q.correct, oi]
      );
    }
  }
}

module.exports = router;
