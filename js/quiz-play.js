/* ============================================================
   QUIZLER — js/quiz-play.js
   Quiz play logic: session, timer, answer selection, scoring,
   and a full question-by-question review mode after completion.
   Depends on: db.js, state.js, nav.js
   ============================================================ */

// ── In-page session state ────────────────────────────────────
const Session = {
  quiz:          null,
  qIndex:        0,
  answers:       [],    // selected answer index per question (-1 = unanswered)
  timeLeftArr:   [],    // remaining seconds per question
  timerInterval: null,
  quizDone:      false,
  reviewMode:    false, // true after "Review Answers" is chosen
  reviewIndex:   0,     // which question is shown during review
};


// ── Initialise ───────────────────────────────────────────────
function initQuiz() {
  const quiz = State.currentQuiz;
  if (!quiz)               { window.location.href = 'quizzes.html'; return; }
  if (!State.currentUser)  { window.location.href = 'login.html';   return; }

  Session.quiz        = quiz;
  Session.qIndex      = 0;
  Session.answers     = new Array(quiz.questions.length).fill(-1);
  Session.timeLeftArr = new Array(quiz.questions.length).fill(quiz.timePerQ);
  Session.quizDone    = false;
  Session.reviewMode  = false;
  Session.reviewIndex = 0;

  document.getElementById('qp-quiz-title').textContent = quiz.title;

  // Make sure review nav is hidden at start
  document.getElementById('qp-review-nav').classList.add('hidden');
  document.getElementById('qp-continue-btn').classList.remove('hidden');
  document.getElementById('qp-timer').classList.remove('hidden');

  loadQuestion();
}


// ── Load a quiz question (play mode) ─────────────────────────
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

  // Progress bar
  document.getElementById('qp-progress-bar').style.width =
    (qIndex / quiz.questions.length * 100) + '%';

  // Render options (interactive)
  renderOptions(q, Session.answers[qIndex], false);

  startTimer();
}


// ── Render answer options ─────────────────────────────────────
// coloured=false: interactive play mode
// coloured=true:  review mode (green=correct, red=wrong user pick)
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
    const clickHandler = coloured ? '' : `onclick="selectOption(${i})"`;
    return `<div class="${cls}" id="opt-${i}" ${clickHandler}>
              <div class="qp-radio"></div>
              <div class="qp-opt-text">${o}</div>
            </div>`;
  }).join('');
}


// ── Answer selection ──────────────────────────────────────────
function selectOption(idx) {
  if (Session.reviewMode) return;  // locked in review mode
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
    const m  = Math.floor(secs / 60);
    const s  = secs % 60;
    const el = document.getElementById('qp-timer');
    el.textContent = `Time Left: ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    el.className   = 'qp-timer' + (secs <= 10 ? ' warning' : '');
    if (secs <= 0) {
      stopTimer();
      Session.timeLeftArr[Session.qIndex] = 0;
      continueQuiz(true);
    }
    secs--;
  };
  tick();
  Session.timerInterval = setInterval(tick, 1000);
}

function stopTimer() {
  if (Session.timerInterval) {
    clearInterval(Session.timerInterval);
    Session.timerInterval = null;
  }
}


// ── Continue / Submit (play mode only) ───────────────────────
function continueQuiz(timeUp = false) {
  // Guard: do nothing if quiz is already done — prevents any re-submission
  if (Session.quizDone) return;

  // REQ 4.6 — warn on unanswered questions
  if (!timeUp && Session.answers[Session.qIndex] === -1) {
    const warn = document.getElementById('qp-warn');
    warn.textContent = 'Please select an answer before continuing.';
    warn.classList.add('show');
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


// ── Score calculation and persistence ────────────────────────
function scoreAndFinish() {
  Session.quizDone = true;   // lock immediately — prevents re-entry
  const { quiz, answers, timeLeftArr } = Session;

  let correct = 0, skipped = 0, scoreRaw = 0, allInTime = true;

  quiz.questions.forEach((q, i) => {
    const ans      = answers[i];
    const timeLeft = timeLeftArr[i];

    if (ans === -1) { skipped++; allInTime = false; return; }
    if (timeLeft <= 0) allInTime = false;

    if (ans === q.correct) {
      correct++;
      // REQ 5.1 — points scaled by time remaining
      scoreRaw += (1 + (timeLeft / quiz.timePerQ));
    }
    // REQ 5.2 — zero points for incorrect answers
  });

  // REQ 5.3 — multiply by difficulty multiplier
  const finalScore    = Math.round(scoreRaw * quiz.multiplier * 100) / 100;
  const finalScoreInt = Math.round(finalScore * 10);

  // Populate modal
  document.getElementById('modal-stats').innerHTML =
    `You correctly answered <strong>${correct}</strong> out of ${quiz.questions.length} questions!<br>` +
    `You skipped <strong>${skipped}</strong> question${skipped !== 1 ? 's' : ''}.<br>` +
    (allInTime ? 'You answered all questions within the time limit!'
               : 'Some questions ran out of time.');
  document.getElementById('modal-score').textContent = finalScoreInt;

  // REQ 5.4 — persist attempt to per-user history
  const user = State.currentUser;
  if (user) {
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
    State.addHistoryEntry({
      quiz:     quiz.title,
      category: quiz.category,
      score:    finalScoreInt,
      date:     today,
      quizId:   quiz.id,
    });

    // REQ 5.5 — update user's total points
    const users = State.getUsers();
    const idx   = users.findIndex(u => u.email === user.email);
    if (idx !== -1) {
      users[idx].totalPoints = (users[idx].totalPoints || 0) + finalScoreInt;
      State.saveUsers(users);
      State.currentUser = users[idx];
    }
  }

  document.getElementById('completion-modal').classList.add('show');
}


// ── Modal: "Review Answers" button ───────────────────────────
function openReview() {
  document.getElementById('completion-modal').classList.remove('show');
  enterReviewMode();
}

// ── Modal: close (hides overlay only) ────────────────────────
function closeModal() {
  document.getElementById('completion-modal').classList.remove('show');
}


// ── Enter review mode ─────────────────────────────────────────
function enterReviewMode() {
  Session.reviewMode  = true;
  Session.reviewIndex = 0;

  stopTimer();

  // Swap play controls → review controls
  document.getElementById('qp-continue-btn').classList.add('hidden');
  document.getElementById('qp-timer').classList.add('hidden');
  document.getElementById('qp-warn').classList.remove('show');
  document.getElementById('qp-review-nav').classList.remove('hidden');

  // Fill progress bar to 100 %
  document.getElementById('qp-progress-bar').style.width = '100%';

  loadReviewQuestion();
}


// ── Load one question in review mode ─────────────────────────
function loadReviewQuestion() {
  const { quiz, reviewIndex, answers } = Session;
  const q     = quiz.questions[reviewIndex];
  const total = quiz.questions.length;

  document.getElementById('qp-counter').textContent =
    `Reviewing question ${reviewIndex + 1} of ${total}.`;
  document.getElementById('qp-question').textContent = q.text;

  // Colour-coded answers
  renderOptions(q, answers[reviewIndex], true);

  // Prev button — disabled on first question
  const prevBtn = document.getElementById('review-prev-btn');
  prevBtn.disabled      = (reviewIndex === 0);
  prevBtn.style.opacity = (reviewIndex === 0) ? '0.4' : '1';

  // Next/Back button label changes on last question
  const nextBtn = document.getElementById('review-next-btn');
  nextBtn.textContent = (reviewIndex === total - 1) ? 'Back to Quiz' : 'Next →';
}

function reviewPrev() {
  if (Session.reviewIndex > 0) {
    Session.reviewIndex--;
    loadReviewQuestion();
  }
}

function reviewNext() {
  const total = Session.quiz.questions.length;
  if (Session.reviewIndex < total - 1) {
    Session.reviewIndex++;
    loadReviewQuestion();
  } else {
    // End of review — return to quiz detail page
    window.location.href = 'quiz-detail.html?id=' + Session.quiz.id;
  }
}


// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Nav.init();
  initQuiz();
});
