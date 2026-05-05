/* ============================================================
   QUIZLER — public/js/leaderboards.js
   Async leaderboard rendering: global, category, quiz.
   ============================================================ */

let _categories = [];
let _quizzes    = [];

function rankIcon(r) {
  if (r === 1) return '★';
  if (r === 2) return '✦';
  if (r === 3) return '✧';
  return String(r);
}

function avatarHTML(username, isMe) {
  return `<div class="lb-avatar${isMe ? ' me' : ''}">${username.slice(0,2).toUpperCase()}</div>`;
}

function lbRows(entries, username) {
  if (!entries || entries.length === 0) {
    return `<tr><td colspan="3" style="padding:18px;color:var(--gray-500);text-align:center">No entries yet.</td></tr>`;
  }
  return entries.map(e => {
    const isMe = username && e.user === username;
    return `<tr class="${isMe ? 'is-me' : ''}">
      <td><span class="rank-badge">${rankIcon(e.rank)}</span></td>
      <td><div class="lb-user-cell">${avatarHTML(e.user, isMe)}<span>${e.user}${isMe ? ' <strong>(You)</strong>' : ''}</span></div></td>
      <td class="lb-score">${Number(e.score).toLocaleString()}</td>
    </tr>`;
  }).join('');
}

// ── Global leaderboard ───────────────────────────────────────
async function renderGlobalLeaderboard() {
  const tbody  = document.getElementById('lb-global-body');
  const banner = document.getElementById('global-rank-banner');
  const user   = State.currentUser;
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3" style="padding:18px;color:var(--gray-500)">Loading…</td></tr>';

  try {
    const board    = await API.getGlobalLeaderboard();
    const username = user?.username;
    tbody.innerHTML = lbRows(board, username);

    if (banner && user) {
      const me = board.find(e => e.user === username);
      banner.innerHTML = me
        ? `Your global rank: <strong>#${me.rank}</strong> — ${Number(user.total_points || user.totalPoints || 0).toLocaleString()} total points`
        : 'Complete quizzes to appear on the global leaderboard!';
      banner.classList.add('show');
    }
  } catch {
    tbody.innerHTML = '<tr><td colspan="3" style="color:var(--red);padding:18px">Failed to load.</td></tr>';
  }
}

// ── Category carousel ─────────────────────────────────────────
function renderCatCarousel() {
  const el    = document.getElementById('cat-carousel');
  if (!el || !_categories.length) return;
  const start = State.catCarouselOffset;
  const cats  = _categories.slice(start, start + 3);
  const pads  = 3 - cats.length;

  el.innerHTML =
    cats.map(c => `
      <div class="lb-cat-card" onclick="showCatLB(${c.id}, this)">
        <div class="lb-cat-name">${c.name}</div>
        <div class="lb-cat-sub">${c.quizCount} quiz${c.quizCount !== 1 ? 'zes' : ''}</div>
      </div>`).join('') +
    Array(pads).fill('<div class="lb-cat-card" style="visibility:hidden;pointer-events:none;"></div>').join('');

  document.getElementById('cat-prev-btn').disabled = (start === 0);
  document.getElementById('cat-next-btn').disabled = (start >= _categories.length - 3);
}

async function showCatLB(catId, clickedEl) {
  document.querySelectorAll('#cat-carousel .lb-cat-card').forEach(c => c.classList.remove('selected'));
  clickedEl.classList.add('selected');
  const cat      = _categories.find(c => c.id === catId);
  const tbody    = document.getElementById('cat-lb-body');
  const username = State.currentUser?.username;
  document.getElementById('cat-lb-detail-title').textContent = (cat?.name || 'Category') + ' — Leaderboard';
  document.getElementById('cat-lb-detail').classList.add('show');
  tbody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:var(--gray-500)">Loading…</td></tr>';
  try {
    const entries = await API.getCategoryLeaderboard(catId);
    tbody.innerHTML = lbRows(entries, username);
  } catch {
    tbody.innerHTML = '<tr><td colspan="3" style="color:var(--red);padding:12px">Failed to load.</td></tr>';
  }
}

// ── Quiz carousel ─────────────────────────────────────────────
function renderQuizCarousel() {
  const el    = document.getElementById('quiz-carousel');
  if (!el || !_quizzes.length) return;
  const start   = State.quizCarouselOffset;
  const quizzes = _quizzes.slice(start, start + 3);
  const pads    = 3 - quizzes.length;

  el.innerHTML =
    quizzes.map(q => `
      <div class="lb-cat-card" onclick="showQuizLB(${q.id}, this)">
        <div class="lb-cat-name">${q.title}</div>
        <div class="lb-cat-sub">${q.difficulty} · ×${q.multiplier}</div>
      </div>`).join('') +
    Array(pads).fill('<div class="lb-cat-card" style="visibility:hidden;pointer-events:none;"></div>').join('');

  document.getElementById('quiz-prev-btn').disabled = (start === 0);
  document.getElementById('quiz-next-btn').disabled = (start >= _quizzes.length - 3);
}

async function showQuizLB(quizId, clickedEl) {
  document.querySelectorAll('#quiz-carousel .lb-cat-card').forEach(c => c.classList.remove('selected'));
  clickedEl.classList.add('selected');
  const quiz     = _quizzes.find(q => q.id === quizId);
  const tbody    = document.getElementById('quiz-lb-body');
  const username = State.currentUser?.username;
  document.getElementById('quiz-lb-detail-title').textContent = (quiz?.title || 'Quiz') + ' — Leaderboard';
  document.getElementById('quiz-lb-detail').classList.add('show');
  tbody.innerHTML = '<tr><td colspan="3" style="padding:12px;color:var(--gray-500)">Loading…</td></tr>';
  try {
    const entries = await API.getQuizLeaderboard(quizId);
    tbody.innerHTML = lbRows(entries, username);
  } catch {
    tbody.innerHTML = '<tr><td colspan="3" style="color:var(--red);padding:12px">Failed to load.</td></tr>';
  }
}

// ── Carousel navigation ───────────────────────────────────────
function carouselPrev(type) {
  if (type === 'cat') {
    if (State.catCarouselOffset > 0) { State.catCarouselOffset--; renderCatCarousel(); document.getElementById('cat-lb-detail').classList.remove('show'); }
  } else {
    if (State.quizCarouselOffset > 0) { State.quizCarouselOffset--; renderQuizCarousel(); document.getElementById('quiz-lb-detail').classList.remove('show'); }
  }
}
function carouselNext(type) {
  if (type === 'cat') {
    if (State.catCarouselOffset < _categories.length - 3) { State.catCarouselOffset++; renderCatCarousel(); document.getElementById('cat-lb-detail').classList.remove('show'); }
  } else {
    if (State.quizCarouselOffset < _quizzes.length - 3) { State.quizCarouselOffset++; renderQuizCarousel(); document.getElementById('quiz-lb-detail').classList.remove('show'); }
  }
}

// ── Tab switching ─────────────────────────────────────────────
function lbTab(el, panelId) {
  document.querySelectorAll('.lb-tab').forEach(t   => t.classList.remove('active'));
  document.querySelectorAll('.lb-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(panelId)?.classList.add('active');
}

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Nav.init();
  try {
    [_categories, _quizzes] = await Promise.all([API.getCategories(), API.getQuizzes()]);
  } catch { /* carousels stay empty */ }
  renderGlobalLeaderboard();
  renderCatCarousel();
  renderQuizCarousel();
});
