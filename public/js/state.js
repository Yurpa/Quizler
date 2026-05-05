/* ============================================================
   QUIZLER — public/js/state.js
   Lightweight client-side state using localStorage for the
   JWT token + cached user object, and sessionStorage for the
   active quiz session.
   db.js is no longer loaded — all data comes from the API.
   ============================================================ */

const State = {

  // ── Auth token ──────────────────────────────────────────────
  get token() { return localStorage.getItem('quizler_token'); },
  set token(v) {
    if (v) localStorage.setItem('quizler_token', v);
    else   localStorage.removeItem('quizler_token');
  },

  // ── Current user (cached from login / /me) ──────────────────
  get currentUser() {
    const u = localStorage.getItem('quizler_user');
    return u ? JSON.parse(u) : null;
  },
  set currentUser(user) {
    if (user) localStorage.setItem('quizler_user', JSON.stringify(user));
    else      localStorage.removeItem('quizler_user');
  },

  isLoggedIn() { return !!this.token; },

  // ── Active quiz ID (quiz-detail → quiz-play handoff) ────────
  get currentQuizId() {
    const id = sessionStorage.getItem('quizler_quizId');
    return id !== null ? parseInt(id) : null;
  },
  set currentQuizId(id) {
    if (id !== null) sessionStorage.setItem('quizler_quizId', String(id));
    else             sessionStorage.removeItem('quizler_quizId');
  },

  // ── Full quiz object cached for the play page ───────────────
  get currentQuiz() {
    const q = sessionStorage.getItem('quizler_quiz');
    return q ? JSON.parse(q) : null;
  },
  set currentQuiz(quiz) {
    if (quiz) sessionStorage.setItem('quizler_quiz', JSON.stringify(quiz));
    else      sessionStorage.removeItem('quizler_quiz');
  },

  // ── Carousel offsets (in-memory only) ───────────────────────
  catCarouselOffset:  0,
  quizCarouselOffset: 0,

  // ── Logout: wipe everything ─────────────────────────────────
  clear() {
    localStorage.removeItem('quizler_token');
    localStorage.removeItem('quizler_user');
    sessionStorage.clear();
  },
};
