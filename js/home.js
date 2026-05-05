/* ============================================================
   QUIZLER — js/home.js
   Home page: render latest quizzes.
   Depends on: db.js, state.js, nav.js
   ============================================================ */

function quizCardHTML(q, completedIds) {
  const isCompleted = completedIds && completedIds.has(q.id);
  const emoji = { 'Easy': '📗', 'Normal': '📘', 'Hard': '📕' }[q.difficulty] || '📄';
  return `
    <a class="quiz-card" href="quiz-detail.html?id=${q.id}">
      <div class="quiz-card-thumb">${emoji}</div>
      <div class="quiz-card-info">
        <div class="quiz-card-title">${q.title}</div>
        <div class="quiz-card-meta">
          <strong>Category:</strong> ${q.category}<br>
          <strong>Difficulty:</strong> ${q.difficulty} (×${q.multiplier})<br>
          <strong>Time:</strong> ${q.timePerQ}s/q &nbsp;
          <strong>Completed:</strong> ${q.completedCount} times
        </div>
      </div>
      ${isCompleted ? '<span class="quiz-card-completed">✓ Done</span>' : ''}
    </a>`;
}

document.addEventListener('DOMContentLoaded', () => {
  Nav.init();

  const completedIds = State.currentUser ? State.getCompletedIds() : new Set();
  const grid = document.getElementById('home-latest-quizzes');
  if (grid) {
    // Show the 3 most recently updated quizzes on home
    grid.innerHTML = QUIZZES.slice(0, 3).map(q => quizCardHTML(q, completedIds)).join('');
  }
});
