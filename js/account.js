/* ============================================================
   QUIZLER — js/account.js
   Account page: profile display, stats, history, password change.
   Depends on: db.js, state.js, nav.js
   ============================================================ */

/* ── Guard: redirect if not logged in ── */
function requireLogin() {
  if (!State.currentUser) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/* ── Load profile info ── */
function loadAccountPage() {
  if (!requireLogin()) return;
  const user = State.refreshCurrentUser();

  document.getElementById('acct-email').value    = user.email;
  document.getElementById('acct-username').value = user.username;

  const roleEl = document.getElementById('acct-user-type');
  if (roleEl) roleEl.textContent = 'User Type: ' + (user.role === 'admin' ? 'Admin' : 'Player');

  const regEl = document.getElementById('acct-reg-date');
  if (regEl) regEl.textContent = 'Member since: ' + (user.registrationDate || '—');

  renderStats(user);
  renderHistory('date', 'desc');
}

/* ── Stats (REQ 2.2) ── */
function renderStats(user) {
  const history = State.getHistory();

  const totalCompleted = history.length;
  const avgScore = totalCompleted > 0
    ? Math.round(history.reduce((s, h) => s + h.score, 0) / totalCompleted)
    : 0;

  // Global rank
  const globalEntry = GLOBAL_LEADERBOARD.find(e => e.user === user.username);
  const globalRank  = globalEntry ? '#' + globalEntry.rank : '—';

  const el = id => document.getElementById(id);
  if (el('stat-completed'))  el('stat-completed').textContent  = totalCompleted;
  if (el('stat-avg-score'))  el('stat-avg-score').textContent  = avgScore;
  if (el('stat-rank'))       el('stat-rank').textContent       = globalRank;
  if (el('stat-points'))     el('stat-points').textContent     = (user.totalPoints || 0).toLocaleString();
}

/* ── Quiz History (REQ 2.5, 2.6) ── */
let _sortField = 'date';
let _sortDir   = 'desc';

function renderHistory(sortBy, dir) {
  _sortField = sortBy || _sortField;
  _sortDir   = dir    || _sortDir;

  let history = [...State.getHistory()];

  // Sort
  history.sort((a, b) => {
    let av = a[_sortField];
    let bv = b[_sortField];
    if (_sortField === 'date') {
      // Convert dd.mm.yyyy → comparable
      av = av ? av.split('.').reverse().join('') : '';
      bv = bv ? bv.split('.').reverse().join('') : '';
    }
    if (_sortField === 'score') { av = Number(av); bv = Number(bv); }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return _sortDir === 'asc' ? cmp : -cmp;
  });

  const tbody = document.getElementById('hist-body');
  if (!tbody) return;

  if (history.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="hist-empty">No quiz history yet. Complete a quiz to get started!</td></tr>';
    return;
  }

  tbody.innerHTML = history.map(h => `
    <tr>
      <td>${h.quiz}</td>
      <td>${h.category}</td>
      <td><strong>${h.score}</strong></td>
      <td>${h.date}</td>
    </tr>`).join('');

  // Update sort arrows
  ['quiz','category','score','date'].forEach(f => {
    const th = document.getElementById('th-' + f);
    if (!th) return;
    const arrow = th.querySelector('.sort-arrow');
    if (!arrow) return;
    th.classList.toggle('sorted', f === _sortField);
    arrow.textContent = f === _sortField ? (_sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅';
  });
}

function sortHistory(field) {
  if (_sortField === field) {
    _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _sortField = field;
    _sortDir   = field === 'score' ? 'desc' : 'asc';
  }
  renderHistory();
}

/* ── Panel switching ── */
function acctPanel(el, panelId) {
  document.querySelectorAll('.acct-item').forEach(i  => i.classList.remove('active'));
  document.querySelectorAll('.acct-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(panelId).classList.add('active');
  if (panelId === 'panel-history') renderHistory();
}

function toggleAcctSection(hdr) {
  const items = hdr.nextElementSibling;
  hdr.classList.toggle('open');
  items.style.display = hdr.classList.contains('open') ? '' : 'none';
}

/* ── Save main info (REQ 2.4, Profile Update decision table) ── */
function saveMainInfo() {
  const email  = document.getElementById('acct-email').value.trim();
  const uname  = document.getElementById('acct-username').value.trim();
  const err    = document.getElementById('main-info-error');
  const ok     = document.getElementById('main-info-success');
  err.classList.remove('show');
  ok.classList.remove('show');

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRx.test(email)) {
    err.textContent = 'Invalid email format.'; err.classList.add('show'); return;
  }

  const users   = State.getUsers();
  const current = State.currentUser;
  if (email && users.find(u => u.email === email && u.email !== current.email)) {
    err.textContent = 'Email already taken.'; err.classList.add('show'); return;
  }

  const idx = users.findIndex(u => u.email === current.email);
  if (idx !== -1) {
    if (email) users[idx].email    = email;
    if (uname) users[idx].username = uname;
    State.saveUsers(users);
    State.currentUser = users[idx];
    Nav.updateTopBar();
  }

  ok.textContent = 'Profile updated successfully!';
  ok.classList.add('show');
  setTimeout(() => ok.classList.remove('show'), 3000);
}

/* ── Save password ── */
function savePassword() {
  const cur  = document.getElementById('sec-cur-pass').value;
  const np   = document.getElementById('sec-new-pass').value;
  const cp   = document.getElementById('sec-conf-pass').value;
  const err  = document.getElementById('sec-error');
  const ok   = document.getElementById('sec-success');
  err.classList.remove('show');
  ok.classList.remove('show');

  const user = State.currentUser;
  if (!cur || !np || !cp) {
    err.textContent = 'Please fill all fields.'; err.classList.add('show'); return;
  }
  if (cur !== user.password) {
    err.textContent = 'Current password is incorrect.'; err.classList.add('show'); return;
  }
  if (np.length < 8) {
    err.textContent = 'Password must be at least 8 characters.'; err.classList.add('show'); return;
  }
  if (np !== cp) {
    err.textContent = 'New passwords do not match.'; err.classList.add('show'); return;
  }

  const users = State.getUsers();
  const idx   = users.findIndex(u => u.email === user.email);
  if (idx !== -1) {
    users[idx].password = np;
    State.saveUsers(users);
    State.currentUser = users[idx];
  }

  ['sec-cur-pass','sec-new-pass','sec-conf-pass'].forEach(id => {
    document.getElementById(id).value = '';
  });
  ok.textContent = 'Password updated successfully!';
  ok.classList.add('show');
  setTimeout(() => ok.classList.remove('show'), 3000);
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  Nav.init();
  loadAccountPage();
});
