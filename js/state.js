/* ============================================================
   QUIZLER — js/state.js
   Application state management with sessionStorage persistence.
   Depends on: db.js (loaded first)
   ============================================================ */

const State = {

  /* ── Users ──────────────────────────────────────────────── */

  /** Returns the registered-users array (merged default + any added this session) */
  getUsers() {
    const stored = sessionStorage.getItem('quizler_users');
    return stored ? JSON.parse(stored) : [...DEFAULT_USERS];
  },

  saveUsers(users) {
    sessionStorage.setItem('quizler_users', JSON.stringify(users));
  },

  /* ── Current logged-in user ─────────────────────────────── */

  get currentUser() {
    const u = sessionStorage.getItem('quizler_user');
    return u ? JSON.parse(u) : null;
  },

  set currentUser(user) {
    if (user) sessionStorage.setItem('quizler_user', JSON.stringify(user));
    else       sessionStorage.removeItem('quizler_user');
  },

  /** Re-read the current user from the users list (picks up any profile updates) */
  refreshCurrentUser() {
    const u = this.currentUser;
    if (!u) return null;
    const users = this.getUsers();
    const fresh = users.find(x => x.email === u.email);
    if (fresh) this.currentUser = fresh;
    return fresh || u;
  },

  /* ── Quiz History (per-user, keyed by email) ────────────── */

  _historyKey() {
    const u = this.currentUser;
    return u ? 'quizler_history_' + u.email : null;
  },

  getHistory() {
    const key = this._historyKey();
    if (!key) return [];
    const stored = sessionStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    // Only the demo account (User_67) pre-loads seed history from db.js.
    // Every other account — including newly registered ones — starts empty.
    const u = this.currentUser;
    if (u && u.email === 'user@quizler.com') return [...DEFAULT_QUIZ_HISTORY];
    return [];
  },

  saveHistory(history) {
    const key = this._historyKey();
    if (key) sessionStorage.setItem(key, JSON.stringify(history));
  },

  addHistoryEntry(entry) {
    const history = this.getHistory();
    history.unshift(entry);
    this.saveHistory(history);
  },

  /* ── Current quiz selection (for detail → play navigation) ─ */

  get currentQuizId() {
    const id = sessionStorage.getItem('quizler_quizId');
    return id !== null ? parseInt(id) : null;
  },

  set currentQuizId(id) {
    if (id !== null) sessionStorage.setItem('quizler_quizId', String(id));
    else             sessionStorage.removeItem('quizler_quizId');
  },

  get currentQuiz() {
    const id = this.currentQuizId;
    return id !== null ? QUIZZES.find(q => q.id === id) || null : null;
  },

  /* ── Carousel offsets (in-page, no persistence needed) ──── */
  catCarouselOffset:  0,
  quizCarouselOffset: 0,

  /* ── Completed quiz IDs for current user ────────────────── */

  getCompletedIds() {
    const history = this.getHistory();
    return new Set(history.map(h => h.quizId).filter(Boolean));
  },
};
