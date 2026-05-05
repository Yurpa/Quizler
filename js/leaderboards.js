/* ============================================================
   QUIZLER — js/leaderboards.js
   Leaderboard rendering: global, category carousel, quiz carousel.
   Depends on: db.js, state.js, nav.js
   ============================================================ */

// ── Helpers ──────────────────────────────────────────────────
function rankIcon(r) {
  if (r === 1) return '★';
  if (r === 2) return '✦';
  if (r === 3) return '✧';
  return String(r);
}

function avatarHTML(username, isMe) {
  const initials = username.slice(0, 2).toUpperCase();
  return `<div class="lb-avatar${isMe ? ' me' : ''}">${initials}</div>`;
}

function lbRows(entries, username) {
  if (!entries || entries.length === 0) {
    return `<tr><td colspan="3" style="padding:18px;color:var(--gray-500);text-align:center">
              No entries yet.</td></tr>`;
  }
  return entries.map(e => {
    const isMe = username && e.user === username;
    return `<tr class="${isMe ? 'is-me' : ''}">
      <td><span class="rank-badge">${rankIcon(e.rank)}</span></td>
      <td><div class="lb-user-cell">
            ${avatarHTML(e.user, isMe)}
            <span>${e.user}${isMe ? ' <strong>(You)</strong>' : ''}</span>
          </div></td>
      <td class="lb-score">${Number(e.score).toLocaleString()}</td>
    </tr>`;
  }).join('');
}


// ── Global leaderboard ───────────────────────────────────────
function renderGlobalLeaderboard() {
  const tbody = document.getElementById('lb-global-body');
  if (!tbody) return;

  const user     = State.currentUser;
  const username = user ? user.username : null;

  // Build a working copy of the leaderboard so we can inject the
  // current user's live points if they have earned more this session.
  let board = GLOBAL_LEADERBOARD.map(e => ({ ...e }));

  if (user) {
    const livePoints = user.totalPoints || 0;
    const existing   = board.find(e => e.user === username);
    if (existing) {
      existing.score = Math.max(existing.score, livePoints);
    }
    // Re-sort and re-rank after potential score update
    board.sort((a, b) => b.score - a.score);
    board.forEach((e, i) => { e.rank = i + 1; });
  }

  tbody.innerHTML = lbRows(board, username);

  // REQ 6.5 — "your rank" banner
  const banner = document.getElementById('global-rank-banner');
  if (banner && user) {
    const myEntry = board.find(e => e.user === username);
    if (myEntry) {
      banner.innerHTML =
        `Your global rank: <strong>#${myEntry.rank}</strong> — ${(user.totalPoints || 0).toLocaleString()} total points`;
    } else {
      banner.innerHTML = 'Complete quizzes to appear on the global leaderboard!';
    }
    banner.classList.add('show');
  }
}


// ── Category carousel ─────────────────────────────────────────
function renderCatCarousel() {
  const el = document.getElementById('cat-carousel');
  if (!el) return;

  const start = State.catCarouselOffset;
  const cats  = CATEGORIES.slice(start, start + 3);
  const pads  = 3 - cats.length;

  el.innerHTML =
    cats.map(c => `
      <div class="lb-cat-card" data-catid="${c.id}" onclick="showCatLB(${c.id}, this)">
        <div class="lb-cat-name">${c.name}</div>
        <div class="lb-cat-sub">${c.quizCount} quiz${c.quizCount !== 1 ? 'zes' : ''}</div>
      </div>`)
    .join('') +
    Array(pads).fill('<div class="lb-cat-card" style="visibility:hidden;pointer-events:none;"></div>').join('');

  // Update arrow button states
  document.getElementById('cat-prev-btn').disabled = (start === 0);
  document.getElementById('cat-next-btn').disabled = (start >= CATEGORIES.length - 3);
}

function carouselPrev(type) {
  if (type === 'cat') {
    if (State.catCarouselOffset > 0) {
      State.catCarouselOffset--;
      renderCatCarousel();
      hideCatDetail();
    }
  } else {
    if (State.quizCarouselOffset > 0) {
      State.quizCarouselOffset--;
      renderQuizCarousel();
      hideQuizDetail();
    }
  }
}

function carouselNext(type) {
  if (type === 'cat') {
    if (State.catCarouselOffset < CATEGORIES.length - 3) {
      State.catCarouselOffset++;
      renderCatCarousel();
      hideCatDetail();
    }
  } else {
    if (State.quizCarouselOffset < QUIZZES.length - 3) {
      State.quizCarouselOffset++;
      renderQuizCarousel();
      hideQuizDetail();
    }
  }
}

function hideCatDetail()  { document.getElementById('cat-lb-detail').classList.remove('show'); }
function hideQuizDetail() { document.getElementById('quiz-lb-detail').classList.remove('show'); }

function showCatLB(catId, clickedEl) {
  // Deselect all cards then select the clicked one
  document.querySelectorAll('#cat-carousel .lb-cat-card').forEach(c => c.classList.remove('selected'));
  clickedEl.classList.add('selected');

  const cat      = CATEGORIES.find(c => c.id === catId);
  const entries  = CAT_LEADERBOARDS[catId] || [];
  const username = State.currentUser ? State.currentUser.username : null;

  document.getElementById('cat-lb-detail-title').textContent =
    (cat ? cat.name : 'Category') + ' — Leaderboard';
  document.getElementById('cat-lb-body').innerHTML = lbRows(entries, username);
  document.getElementById('cat-lb-detail').classList.add('show');
}


// ── Quiz carousel ─────────────────────────────────────────────
function renderQuizCarousel() {
  const el = document.getElementById('quiz-carousel');
  if (!el) return;

  const start   = State.quizCarouselOffset;
  const quizzes = QUIZZES.slice(start, start + 3);
  const pads    = 3 - quizzes.length;

  el.innerHTML =
    quizzes.map(q => `
      <div class="lb-cat-card" data-quizid="${q.id}" onclick="showQuizLB(${q.id}, this)">
        <div class="lb-cat-name">${q.title}</div>
        <div class="lb-cat-sub">${q.difficulty} · ×${q.multiplier}</div>
      </div>`)
    .join('') +
    Array(pads).fill('<div class="lb-cat-card" style="visibility:hidden;pointer-events:none;"></div>').join('');

  document.getElementById('quiz-prev-btn').disabled = (start === 0);
  document.getElementById('quiz-next-btn').disabled = (start >= QUIZZES.length - 3);
}

function showQuizLB(quizId, clickedEl) {
  document.querySelectorAll('#quiz-carousel .lb-cat-card').forEach(c => c.classList.remove('selected'));
  clickedEl.classList.add('selected');

  const quiz     = QUIZZES.find(q => q.id === quizId);
  const username = State.currentUser ? State.currentUser.username : null;

  document.getElementById('quiz-lb-detail-title').textContent =
    (quiz ? quiz.title : 'Quiz') + ' — Leaderboard';
  document.getElementById('quiz-lb-body').innerHTML =
    lbRows(quiz ? quiz.leaderboard : [], username);
  document.getElementById('quiz-lb-detail').classList.add('show');
}


// ── Tab switching ─────────────────────────────────────────────
function lbTab(el, panelId) {
  document.querySelectorAll('.lb-tab').forEach(t   => t.classList.remove('active'));
  document.querySelectorAll('.lb-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add('active');
}


// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Nav.init();
  renderGlobalLeaderboard();
  renderCatCarousel();
  renderQuizCarousel();
});
