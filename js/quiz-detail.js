/* ============================================================
   QUIZLER — js/quiz-detail.js
   Quiz detail page: display info, leaderboard, and start quiz.
   Depends on: db.js, state.js, nav.js
   ============================================================ */

function rankIcon(r) {
  if (r === 1) return '★';
  if (r === 2) return '✦';
  if (r === 3) return '✧';
  return r;
}

function loadQuizDetail() {
  const params = new URLSearchParams(window.location.search);
  const quizId = parseInt(params.get('id'));
  if (!quizId) { window.location.href = 'quizzes.html'; return; }

  const quiz = QUIZZES.find(q => q.id === quizId);
  if (!quiz)  { window.location.href = 'quizzes.html'; return; }

  // Store for play page
  State.currentQuizId = quizId;

  // Hero
  document.getElementById('qd-name').textContent = quiz.title;
  document.getElementById('qd-desc').textContent = quiz.desc;

  // Completed badge (REQ 4.1)
  const user = State.currentUser;
  if (user) {
    const completedIds = State.getCompletedIds();
    if (completedIds.has(quiz.id)) {
      const badge = document.getElementById('qd-completed-badge');
      if (badge) badge.style.display = 'inline-flex';
    }
  }

  // Stats bar
  document.getElementById('qd-q-count').textContent = quiz.questions.length + ' questions';
  document.getElementById('qd-updated').textContent  = quiz.updated;
  document.getElementById('qd-diff').textContent     = quiz.difficulty + ' (×' + quiz.multiplier + ')';
  document.getElementById('qd-avg').textContent      = quiz.avgScore;
  document.getElementById('qd-time').textContent     = quiz.timePerQ + 's';

  // Leaderboard rows
  const username = user ? user.username : null;
  const rows = quiz.leaderboard.slice(0, 5).map(e => {
    const isMe = username && e.user === username;
    return `
      <div class="qd-lb-row${isMe ? ' is-me' : ''}">
        <div class="qd-lb-rank">${rankIcon(e.rank)}</div>
        <div class="qd-lb-user">
          <div class="lb-avatar${isMe ? ' me' : ''}">${e.user.slice(0,2).toUpperCase()}</div>
          <div class="qd-lb-bar">${e.user}${isMe ? ' (You)':''}</div>
        </div>
        <div class="qd-lb-score">${e.score}</div>
      </div>`;
  }).join('');
  document.getElementById('qd-lb-rows').innerHTML = rows;
}

function startQuiz() {
  if (!State.currentUser) {
    window.location.href = 'login.html';
    return;
  }
  window.location.href = 'quiz-play.html';
}

document.addEventListener('DOMContentLoaded', () => {
  Nav.init();
  loadQuizDetail();
});
