/* ============================================================
   QUIZLER — js/nav.js
   Navigation bar: topbar user display, quiz dropdown,
   active link highlighting, admin link visibility.
   Depends on: db.js, state.js
   ============================================================ */

const Nav = {

  /** Call on every page load to sync nav state */
  init() {
    this.updateTopBar();
    this.populateDropdown();
    this.highlightActive();
    this.toggleAdminLink();
  },

  /* ── Top bar ── */
  updateTopBar() {
    const lbl = document.getElementById('top-login-label');
    if (!lbl) return;
    const user = State.currentUser;
    lbl.textContent = user ? '⊕ ' + user.username : 'Login';
  },

  topBarClick() {
    if (State.currentUser) {
      Auth.doLogout();
    } else {
      window.location.href = 'login.html';
    }
  },

  navAccount() {
    if (State.currentUser) window.location.href = 'account.html';
    else                   window.location.href = 'login.html';
  },

  /* ── Quiz dropdown ── */
  populateDropdown() {
    const el = document.getElementById('quiz-dropdown-items');
    if (!el) return;
    el.innerHTML = CATEGORIES.map(c =>
      `<a class="nav-dropdown-item" href="quizzes.html?cat=${c.id}">
        ${c.name} <span class="quiz-count">(${c.quizCount})</span>
       </a>`
    ).join('') +
    `<a class="nav-dropdown-item" href="quizzes.html">All Quizzes</a>`;
  },

  toggleDropdown() {
    const dd   = document.getElementById('quiz-dropdown');
    const link = document.getElementById('nav-quizzes');
    if (!dd) return;
    const isOpen = dd.classList.contains('open');
    this.closeDropdown();
    if (!isOpen) {
      dd.classList.add('open');
      link && link.classList.add('open');
    }
  },

  closeDropdown() {
    document.getElementById('quiz-dropdown')?.classList.remove('open');
    document.getElementById('nav-quizzes')?.classList.remove('open');
  },

  /* ── Active nav link ── */
  highlightActive() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const map  = {
      'index.html':      null,
      'leaderboards.html': 'nav-leaderboards',
      'account.html':    'nav-account',
      'quizzes.html':    'nav-quizzes',
      'quiz-detail.html':'nav-quizzes',
      'quiz-play.html':  'nav-quizzes',
      'admin.html':      'nav-admin',
    };
    const id = map[page];
    if (id) document.getElementById(id)?.classList.add('active');
  },

  /* ── Admin link visibility ── */
  toggleAdminLink() {
    const link = document.getElementById('nav-admin-wrap');
    if (!link) return;
    const user = State.currentUser;
    link.style.display = (user && user.role === 'admin') ? '' : 'none';
  },
};

/* Close dropdown on outside click */
document.addEventListener('click', e => {
  if (!e.target.closest('#nav-quizzes') && !e.target.closest('#quiz-dropdown')) {
    Nav.closeDropdown();
  }
});
