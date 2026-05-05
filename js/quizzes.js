/* ============================================================
   QUIZLER — js/quizzes.js
   Quiz listing page: filtering by category, search, display.
   Depends on: db.js, state.js, nav.js
   ============================================================ */

let currentCategoryFilter = null;

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
          <strong>Language:</strong> ${q.language} &nbsp;
          <strong>Time/Q:</strong> ${q.timePerQ}s<br>
          <strong>Completed:</strong> ${q.completedCount} times
        </div>
      </div>
      ${isCompleted ? '<span class="quiz-card-completed">✓ Done</span>' : ''}
    </a>`;
}

function renderAllQuizzes(list) {
  const grid = document.getElementById('quizzes-grid');
  const user = State.currentUser;
  const completedIds = user ? State.getCompletedIds() : new Set();

  if (list.length === 0) {
    grid.innerHTML = '<div class="no-results" style="grid-column:1/-1">No quizzes found.</div>';
  } else {
    grid.innerHTML = list.map(q => quizCardHTML(q, completedIds)).join('');
  }
}

function searchQuizzes() {
  const q    = document.getElementById('quiz-search-input').value.toLowerCase().trim();
  let   list = currentCategoryFilter
    ? QUIZZES.filter(x => x.categoryId === currentCategoryFilter)
    : QUIZZES;
  if (q) list = list.filter(x =>
    x.title.toLowerCase().includes(q) || x.category.toLowerCase().includes(q)
  );
  renderAllQuizzes(list);
}

document.addEventListener('DOMContentLoaded', () => {
  Nav.init();

  // Read category from URL ?cat=N
  const params   = new URLSearchParams(window.location.search);
  const catParam = params.get('cat');
  const catId    = catParam ? parseInt(catParam) : null;

  currentCategoryFilter = catId;
  const cat = catId ? CATEGORIES.find(c => c.id === catId) : null;

  const title = document.getElementById('quizzes-cat-title');
  if (title) title.textContent = cat ? 'Category: ' + cat.name : 'All Quizzes';

  const list = catId ? QUIZZES.filter(q => q.categoryId === catId) : QUIZZES;
  renderAllQuizzes(list);

  // Enter key on search
  document.getElementById('quiz-search-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchQuizzes();
  });
});
