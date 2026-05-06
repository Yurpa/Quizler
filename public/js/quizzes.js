/* ============================================================
   QUIZLER — public/js/quizzes.js
   Quiz listing page: search, category filter, display.
   ============================================================ */

let _allQuizzes = [];
let _catFilter  = null;

function quizCardHTML(q, completedIds) {
  const done  = completedIds && completedIds.has(q.id);
  const emoji = { Easy: '📗', Normal: '📘', Hard: '📕' }[q.difficulty] || '📄';
  return `
    <a class="quiz-card" href="quiz-detail.html?id=${q.id}">
      <div class="quiz-card-thumb">${emoji}</div>
      <div class="quiz-card-info">
        <div class="quiz-card-title">${q.title}</div>
        <div class="quiz-card-meta">
          <strong>Category:</strong> ${q.category}<br>
          <strong>Difficulty:</strong> ${q.difficulty} (×${q.multiplier})<br>
          <strong>Language:</strong> ${q.language} &nbsp;
          <strong>Time/Q:</strong> ${q.timePerQ}s
        </div>
      </div>
      ${done ? '<span class="quiz-card-completed">✓ Done</span>' : ''}
    </a>`;
}

function renderQuizzes(list, completedIds) {
  const grid = document.getElementById('quizzes-grid');
  if (!grid) return;
  if (list.length === 0) {
    grid.innerHTML = '<div class="no-results" style="grid-column:1/-1">No quizzes found.</div>';
  } else {
    grid.innerHTML = list.map(q => quizCardHTML(q, completedIds)).join('');
  }
}

function searchQuizzes() {
  const term = document.getElementById('quiz-search-input').value.toLowerCase().trim();
  let list   = _catFilter ? _allQuizzes.filter(q => q.categoryId === _catFilter) : _allQuizzes;
  if (term)  list = list.filter(q => q.title.toLowerCase().includes(term) || q.category.toLowerCase().includes(term));
  renderQuizzes(list, null);
}

document.addEventListener('DOMContentLoaded', async () => {
  await Nav.init();

  const params = new URLSearchParams(window.location.search);
  const catId  = params.get('cat') ? parseInt(params.get('cat')) : null;
  _catFilter   = catId;

  const titleEl = document.getElementById('quizzes-cat-title');

  const grid = document.getElementById('quizzes-grid');
  if (grid) grid.innerHTML = '<div style="grid-column:1/-1;color:var(--gray-500);padding:12px">Loading…</div>';

  try {
    const [quizzes, history] = await Promise.all([
      API.getQuizzes(catId),
      State.isLoggedIn() ? API.getHistory() : Promise.resolve([]),
    ]);
    _allQuizzes = quizzes;
    const completedIds = new Set(history.map(h => h.quizId).filter(Boolean));

    // Set page title
    if (catId && quizzes.length > 0) {
      if (titleEl) titleEl.textContent = 'Category: ' + quizzes[0].category;
    } else {
      if (titleEl) titleEl.textContent = 'All Quizzes';
    }

    renderQuizzes(quizzes, completedIds);
  } catch {
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;color:var(--red);padding:12px">Failed to load quizzes.</div>';
  }

  document.getElementById('quiz-search-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchQuizzes();
  });
});
