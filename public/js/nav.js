/* ============================================================
   QUIZLER — public/js/nav.js
   Navigation bar: top bar, quiz category dropdown (async),
   active link highlighting, admin link visibility.
   ============================================================ */

const Nav = {

  async init() {
    this.updateTopBar();
    await this.populateDropdown();
    this.highlightActive();
    this.toggleAdminLink();
  },

  // ── Top bar ────────────────────────────────────────────────
  updateTopBar() {
    const lbl  = document.getElementById('top-login-label');
    if (!lbl) return;
    const user = State.currentUser;
    lbl.textContent = user ? '⊕ ' + user.username : 'Login';
  },

  topBarClick() {
    if (State.isLoggedIn()) Auth.doLogout();
    else                    window.location.href = 'login.html';
  },

  navAccount() {
    window.location.href = State.isLoggedIn() ? 'account.html' : 'login.html';
  },

  // ── Quiz dropdown ───────────────────────────────────────────
  async populateDropdown() {
    const el = document.getElementById('quiz-dropdown-items');
    if (!el) return;
    try {
      const cats = await API.getCategories();
      el.innerHTML =
        cats.map(c =>
          `<a class="nav-dropdown-item" href="quizzes.html?cat=${c.id}">
             ${c.name} <span class="quiz-count">(${c.quizCount})</span>
           </a>`
        ).join('') +
        `<a class="nav-dropdown-item" href="quizzes.html">All Quizzes</a>`;
    } catch {
      el.innerHTML = '<div class="nav-dropdown-item" style="color:var(--gray-500)">Failed to load</div>';
    }
  },

  toggleDropdown() {
    const dd   = document.getElementById('quiz-dropdown');
    const link = document.getElementById('nav-quizzes');
    if (!dd) return;
    const isOpen = dd.classList.contains('open');
    this.closeDropdown();
    if (!isOpen) {
      dd.classList.add('open');
      link?.classList.add('open');
    }
  },

  closeDropdown() {
    document.getElementById('quiz-dropdown')?.classList.remove('open');
    document.getElementById('nav-quizzes')?.classList.remove('open');
  },

  // ── Active link ─────────────────────────────────────────────
  highlightActive() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const map  = {
      'index.html':        null,
      'leaderboards.html': 'nav-leaderboards',
      'account.html':      'nav-account',
      'quizzes.html':      'nav-quizzes',
      'quiz-detail.html':  'nav-quizzes',
      'quiz-play.html':    'nav-quizzes',
      'admin.html':        'nav-admin',
    };
    const id = map[page];
    if (id) document.getElementById(id)?.classList.add('active');
  },

  // ── Admin link ──────────────────────────────────────────────
  toggleAdminLink() {
    const wrap = document.getElementById('nav-admin-wrap');
    if (!wrap) return;
    const user = State.currentUser;
    wrap.style.display = (user && user.role === 'admin') ? '' : 'none';
  },
};

document.addEventListener('click', e => {
  if (!e.target.closest('#nav-quizzes') && !e.target.closest('#quiz-dropdown')) {
    Nav.closeDropdown();
  }
});
