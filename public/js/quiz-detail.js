/* ============================================================
   QUIZLER — public/js/quiz-detail.js
   Quiz detail page: load from API, display info + leaderboard.
   ============================================================ */

function rankIcon(r) {
  if (r === 1) return '★';
  if (r === 2) return '✦';
  if (r === 3) return '✧';
  return r;
}

async function loadQuizDetail() {
  const params = new URLSearchParams(window.location.search);
  const quizId = parseInt(params.get('id'));
  if (!quizId) { window.location.href = 'quizzes.html'; return; }

  try {
    const quiz = await API.getQuiz(quizId);

    // Cache full quiz object for the play page (includes questions + answers)
    State.currentQuizId = quizId;
    State.currentQuiz   = quiz;

    // Hero
    document.getElementById('qd-name').textContent = quiz.title;
    document.getElementById('qd-desc').textContent = quiz.desc;

    // Completed badge (REQ 4.1)
    if (State.isLoggedIn()) {
      try {
        const history = await API.getHistory();
        const done    = history.some(h => h.quizId === quiz.id);
        if (done) document.getElementById('qd-completed-badge').style.display = 'inline-flex';
      } catch { /* ignore */ }
    }

    // Stats bar
    document.getElementById('qd-q-count').textContent = quiz.questions.length + ' questions';
    document.getElementById('qd-updated').textContent  = quiz.updated   || '—';
    document.getElementById('qd-diff').textContent     = quiz.difficulty + ' (×' + quiz.multiplier + ')';
    document.getElementById('qd-avg').textContent      = Math.round(quiz.avgScore);
    document.getElementById('qd-time').textContent     = quiz.timePerQ + 's';

    // Leaderboard
    const username = State.currentUser?.username;
    const rows = (quiz.leaderboard || []).slice(0, 5).map(e => {
      const isMe = username && e.user === username;
      return `
        <div class="qd-lb-row${isMe ? ' is-me' : ''}">
          <div class="qd-lb-rank">${rankIcon(e.rank)}</div>
          <div class="qd-lb-user">
            <div class="lb-avatar${isMe ? ' me' : ''}">${e.user.slice(0,2).toUpperCase()}</div>
            <div class="qd-lb-bar">${e.user}${isMe ? ' (You)' : ''}</div>
          </div>
          <div class="qd-lb-score">${e.score}</div>
        </div>`;
    }).join('');
    document.getElementById('qd-lb-rows').innerHTML =
      rows || '<div style="padding:18px;color:var(--gray-500)">No entries yet.</div>';

  } catch (e) {
    console.error('loadQuizDetail error:', e);
    window.location.href = 'quizzes.html';
  }
}

function startQuiz() {
  if (!State.isLoggedIn()) { window.location.href = 'login.html'; return; }
  window.location.href = 'quiz-play.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  await Nav.init();
  await loadQuizDetail();
  // Wire up Play button only after the quiz data is ready
  document.getElementById('play-btn')?.addEventListener('click', startQuiz);
});
