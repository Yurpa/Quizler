/* ============================================================
   QUIZLER — public/js/home.js
   Home page: load latest quizzes from API.
   ============================================================ */

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
          <strong>Time:</strong> ${q.timePerQ}s/q &nbsp;
          <strong>Completed:</strong> ${q.completedCount} times
        </div>
      </div>
      ${done ? '<span class="quiz-card-completed">✓ Done</span>' : ''}
    </a>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  await Nav.init();

  const grid = document.getElementById('home-latest-quizzes');
  if (!grid) return;
  grid.innerHTML = '<div style="color:var(--gray-500);padding:12px">Loading…</div>';

  try {
    const [quizzes, history] = await Promise.all([
      API.getQuizzes(),
      State.isLoggedIn() ? API.getHistory() : Promise.resolve([]),
    ]);
    const completedIds = new Set(history.map(h => h.quizId).filter(Boolean));
    grid.innerHTML = quizzes.slice(0, 3).map(q => quizCardHTML(q, completedIds)).join('');
  } catch {
    grid.innerHTML = '<div style="color:var(--red);padding:12px">Failed to load quizzes.</div>';
  }
}

);
