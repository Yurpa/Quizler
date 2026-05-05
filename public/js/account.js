/* ============================================================
   QUIZLER — public/js/account.js
   Account page: profile, stats, history, password change.
   ============================================================ */

let _sortField = 'date';
let _sortDir   = 'desc';

// ── Init ─────────────────────────────────────────────────────
async function loadAccountPage() {
  if (!State.isLoggedIn()) { window.location.href = 'login.html'; return; }

  try {
    const profile = await API.getProfile();
    // Keep local cache up to date
    State.currentUser = profile;

    document.getElementById('acct-email').value    = profile.email;
    document.getElementById('acct-username').value = profile.username;

    const roleEl = document.getElementById('acct-user-type');
    if (roleEl) roleEl.textContent = 'User Type: ' + (profile.role === 'admin' ? 'Admin' : 'Player');

    const regEl = document.getElementById('acct-reg-date');
    if (regEl) regEl.textContent = 'Member since: ' + (profile.registration_date || '—');

    // Stats
    const el = id => document.getElementById(id);
    if (el('stat-completed'))  el('stat-completed').textContent  = profile.totalCompleted ?? 0;
    if (el('stat-avg-score'))  el('stat-avg-score').textContent  = profile.avgScore       ?? 0;
    if (el('stat-rank'))       el('stat-rank').textContent       = profile.globalRank ? '#' + profile.globalRank : '—';
    if (el('stat-points'))     el('stat-points').textContent     = Number(profile.total_points || 0).toLocaleString();

  } catch (e) {
    console.error('loadAccountPage:', e);
  }
}

// ── Panel switching ───────────────────────────────────────────
function acctPanel(el, panelId) {
  document.querySelectorAll('.acct-item').forEach(i  => i.classList.remove('active'));
  document.querySelectorAll('.acct-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(panelId)?.classList.add('active');
  if (panelId === 'panel-history') renderHistory();
  if (panelId === 'panel-stats')   loadAccountPage();
}

function toggleAcctSection(hdr) {
  const items = hdr.nextElementSibling;
  hdr.classList.toggle('open');
  items.style.display = hdr.classList.contains('open') ? '' : 'none';
}

// ── History ───────────────────────────────────────────────────
async function renderHistory(sortBy, dir) {
  if (sortBy) _sortField = sortBy;
  if (dir)    _sortDir   = dir;

  const tbody = document.getElementById('hist-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="hist-empty">Loading…</td></tr>';

  try {
    const history = await API.getHistory(_sortField, _sortDir);
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
  } catch {
    tbody.innerHTML = '<tr><td colspan="4" class="hist-empty" style="color:var(--red)">Failed to load history.</td></tr>';
  }

  // Update sort arrows
  ['quiz','category','score','date'].forEach(f => {
    const th = document.getElementById('th-' + f);
    if (!th) return;
    const arrow = th.querySelector('.sort-arrow');
    th.classList.toggle('sorted', f === _sortField);
    if (arrow) arrow.textContent = f === _sortField ? (_sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅';
  });
}

function sortHistory(field) {
  if (_sortField === field) _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
  else { _sortField = field; _sortDir = field === 'score' ? 'desc' : 'asc'; }
  renderHistory();
}

// ── Save main info ────────────────────────────────────────────
async function saveMainInfo() {
  const email = document.getElementById('acct-email').value.trim();
  const err   = document.getElementById('main-info-error');
  const ok    = document.getElementById('main-info-success');
  err.classList.remove('show');
  ok.classList.remove('show');

  try {
    await API.updateProfile({ email });
    // Refresh cached user
    const fresh = await API.getMe();
    State.currentUser = fresh;
    Nav.updateTopBar();
    ok.textContent = 'Profile updated successfully!';
    ok.classList.add('show');
    setTimeout(() => ok.classList.remove('show'), 3000);
  } catch (e) {
    err.textContent = e.message;
    err.classList.add('show');
  }
}

// ── Save password ─────────────────────────────────────────────
async function savePassword() {
  const cur = document.getElementById('sec-cur-pass').value;
  const np  = document.getElementById('sec-new-pass').value;
  const cp  = document.getElementById('sec-conf-pass').value;
  const err = document.getElementById('sec-error');
  const ok  = document.getElementById('sec-success');
  err.classList.remove('show');
  ok.classList.remove('show');

  if (np !== cp) {
    err.textContent = 'New passwords do not match.'; err.classList.add('show'); return;
  }

  try {
    await API.updateProfile({ currentPassword: cur, newPassword: np });
    ['sec-cur-pass','sec-new-pass','sec-conf-pass'].forEach(id => {
      document.getElementById(id).value = '';
    });
    ok.textContent = 'Password updated successfully!';
    ok.classList.add('show');
    setTimeout(() => ok.classList.remove('show'), 3000);
  } catch (e) {
    err.textContent = e.message;
    err.classList.add('show');
  }
}

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Nav.init();
  await loadAccountPage();
});
