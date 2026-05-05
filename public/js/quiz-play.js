/* ============================================================
   QUIZLER — public/js/quiz-play.js
   Quiz play: timer, answer selection, scoring via API,
   and question-by-question review mode after completion.
   ============================================================ */

const Session = {
  quiz:          null,
  qIndex:        0,
  answers:       [],
  timeLeftArr:   [],
  timerInterval: null,
  quizDone:      false,
  reviewMode:    false,
  reviewIndex:   0,
};

// ── Init ─────────────────────────────────────────────────────
function initQuiz() {
  const quiz = State.currentQuiz;
  if (!quiz)              { window.location.href = 'quizzes.html'; return; }
  if (!State.isLoggedIn()) { window.location.href = 'login.html';  return; }

  Session.quiz        = quiz;
  Session.qIndex      = 0;
  Session.answers     = new Array(quiz.questions.length).fill(-1);
  Session.timeLeftArr = new Array(quiz.questions.length).fill(quiz.timePerQ);
  Session.quizDone    = false;
  Session.reviewMode  = false;
  Session.reviewIndex = 0;

  document.getElementById('qp-quiz-title').textContent = quiz.title;
  document.getElementById('qp-review-nav').classList.add('hidden');
  document.getElementById('qp-continue-btn').classList.remove('hidden');
  document.getElementById('qp-timer').classList.remove('hidden');

  loadQuestion();
}

// ── Render answer options ─────────────────────────────────────
function renderOptions(q, userAnswer, coloured) {
  const container = document.getElementById('qp-options');
  container.innerHTML = q.opts.map((o, i) => {
    let cls = 'qp-option';
    if (!coloured) {
      if (i === userAnswer) cls += ' selected';
    } else {
      if (i === q.correct)                          cls += ' correct';
      else if (i === userAnswer && i !== q.correct) cls += ' wrong';
    }
    const handler = coloured ? '' : `onclick="selectOption(${i})"`;
    return `<div class="${cls}" id="opt-${i}" ${handler}>
              <div class="qp-radio"></div>
              <div class="qp-opt-text">${o}</div>
            </div>`;
  }).join('');
}

// ── Load question (play mode) ─────────────────────────────────
function loadQuestion() {
  const { quiz, qIndex } = Session;
  const q = quiz.questions[qIndex];

  document.getElementById('qp-counter').textContent =
    `Question ${qIndex + 1} out of ${quiz.questions.length}.`;
  document.getElementById('qp-question').textContent =
    q.text + ' Choose the answer out of the following options:';
  document.getElementById('qp-warn').classList.remove('show');

  const isLast = qIndex === quiz.questions.length - 1;
  document.getElementById('qp-continue-btn').textContent = isLast ? 'Submit' : 'Continue';

  document.getElementById('qp-progress-bar').style.width =
    (qIndex / quiz.questions.length * 100) + '%';

  renderOptions(q, Session.answers[qIndex], false);
  startTimer();
}

// ── Answer selection ──────────────────────────────────────────
function selectOption(idx) {
  if (Session.reviewMode) return;
  Session.answers[Session.qIndex] = idx;
  document.querySelectorAll('.qp-option').forEach(o => o.classList.remove('selected'));
  document.getElementById('opt-' + idx)?.classList.add('selected');
}

// ── Timer ─────────────────────────────────────────────────────
function startTimer() {
  stopTimer();
  let secs = Session.timeLeftArr[Session.qIndex];
  const tick = () => {
    Session.timeLeftArr[Session.qIndex] = secs;
    const el = document.getElementById('qp-timer');
    el.textContent = `Time Left: ${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
    el.className   = 'qp-timer' + (secs <= 10 ? ' warning' : '');
    if (secs <= 0) { stopTimer(); Session.timeLeftArr[Session.qIndex] = 0; continueQuiz(true); }
    secs--;
  };
  tick();
  Session.timerInterval = setInterval(tick, 1000);
}
function stopTimer() {
  if (Session.timerInterval) { clearInterval(Session.timerInterval); Session.timerInterval = null; }
}

// ── Continue / Submit ─────────────────────────────────────────
function continueQuiz(timeUp = false) {
  if (Session.quizDone) return;
  if (!timeUp && Session.answers[Session.qIndex] === -1) {
    const w = document.getElementById('qp-warn');
    w.textContent = 'Please select an answer before continuing.';
    w.classList.add('show');
    return;
  }
  stopTimer();
  if (Session.qIndex >= Session.quiz.questions.length - 1) {
    scoreAndFinish();
  } else {
    Session.qIndex++;
    loadQuestion();
  }
}

// ── Score via API ─────────────────────────────────────────────
async function scoreAndFinish() {
  Session.quizDone = true;
  const { quiz, answers, timeLeftArr } = Session;

  // Disable submit button to prevent double-tap
  const btn = document.getElementById('qp-continue-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Scoring…'; }

  try {
    const result = await API.submitAttempt(quiz.id, answers, timeLeftArr);

    // Refresh user cache so updated total_points is available
    try {
      const fresh = await API.getMe();
      State.currentUser = fresh;
      Nav.updateTopBar();
    } catch { /* non-fatal */ }

    document.getElementById('modal-stats').innerHTML =
      `You correctly answered <strong>${result.correct}</strong> out of ${result.total} questions!<br>` +
      `You skipped <strong>${result.skipped}</strong> question${result.skipped !== 1 ? 's' : ''}.`;
    document.getElementById('modal-score').textContent = result.score;
    document.getElementById('completion-modal').classList.add('show');

  } catch (e) {
    document.getElementById('modal-stats').innerHTML =
      '<span style="color:var(--red)">Failed to submit results: ' + e.message + '</span>';
    document.getElementById('modal-score').textContent = '—';
    document.getElementById('completion-modal').classList.add('show');
  }
}

// ── Modal buttons ─────────────────────────────────────────────
function openReview() {
  document.getElementById('completion-modal').classList.remove('show');
  enterReviewMode();
}
function closeModal() {
  document.getElementById('completion-modal').classList.remove('show');
}

// ── Review mode ───────────────────────────────────────────────
function enterReviewMode() {
  Session.reviewMode  = true;
  Session.reviewIndex = 0;
  stopTimer();
  document.getElementById('qp-continue-btn').classList.add('hidden');
  document.getElementById('qp-timer').classList.add('hidden');
  document.getElementById('qp-warn').classList.remove('show');
  document.getElementById('qp-review-nav').classList.remove('hidden');
  document.getElementById('qp-progress-bar').style.width = '100%';
  loadReviewQuestion();
}

function loadReviewQuestion() {
  const { quiz, reviewIndex, answers } = Session;
  const q     = quiz.questions[reviewIndex];
  const total = quiz.questions.length;

  document.getElementById('qp-counter').textContent =
    `Reviewing question ${reviewIndex + 1} of ${total}.`;
  document.getElementById('qp-question').textContent = q.text;
  renderOptions(q, answers[reviewIndex], true);

  const prevBtn = document.getElementById('review-prev-btn');
  prevBtn.disabled      = (reviewIndex === 0);
  prevBtn.style.opacity = (reviewIndex === 0) ? '0.4' : '1';

  document.getElementById('review-next-btn').textContent =
    reviewIndex === total - 1 ? 'Back to Quiz' : 'Next →';
}

function reviewPrev() {
  if (Session.reviewIndex > 0) { Session.reviewIndex--; loadReviewQuestion(); }
}
function reviewNext() {
  if (Session.reviewIndex < Session.quiz.questions.length - 1) {
    Session.reviewIndex++;
    loadReviewQuestion();
  } else {
    window.location.href = 'quiz-detail.html?id=' + Session.quiz.id;
  }
}

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Nav.init();
  initQuiz();
});
