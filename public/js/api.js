/* ============================================================
   QUIZLER — public/js/api.js
   Thin fetch() wrapper around every backend API route.
   All functions return parsed JSON or throw an Error with
   the server's error message string.
   ============================================================ */

const API = (() => {
  const BASE = '/api';

  function token() {
    return localStorage.getItem('quizler_token');
  }

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token()) headers['Authorization'] = 'Bearer ' + token();

    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  return {
    // ── Auth ──────────────────────────────────────────────────
    register(email, username, password) {
      return request('POST', '/auth/register', { email, username, password });
    },
    login(identifier, password) {
      return request('POST', '/auth/login', { identifier, password });
    },
    logout() {
      return request('POST', '/auth/logout');
    },
    getMe() {
      return request('GET', '/auth/me');
    },

    // ── Categories ────────────────────────────────────────────
    getCategories() {
      return request('GET', '/categories');
    },

    // ── Quizzes ───────────────────────────────────────────────
    getQuizzes(catId) {
      const q = catId ? `?cat=${catId}` : '';
      return request('GET', `/quizzes${q}`);
    },
    getQuiz(id) {
      return request('GET', `/quizzes/${id}`);
    },

    // ── Attempts ──────────────────────────────────────────────
    submitAttempt(quizId, answers, timeLeftArr) {
      return request('POST', '/attempts', { quizId, answers, timeLeftArr });
    },

    // ── Leaderboards ──────────────────────────────────────────
    getGlobalLeaderboard() {
      return request('GET', '/leaderboard/global');
    },
    getCategoryLeaderboard(catId) {
      return request('GET', `/leaderboard/category/${catId}`);
    },
    getQuizLeaderboard(quizId) {
      return request('GET', `/leaderboard/quiz/${quizId}`);
    },

    // ── Profile ───────────────────────────────────────────────
    getProfile() {
      return request('GET', '/profile');
    },
    updateProfile(data) {
      return request('PATCH', '/profile', data);
    },
    getHistory(sortBy, dir) {
      return request('GET', `/profile/history?sortBy=${sortBy || 'date'}&dir=${dir || 'desc'}`);
    },

    // ── Admin ─────────────────────────────────────────────────
    adminGetQuizzes() {
      return request('GET', '/admin/quizzes');
    },
    adminCreateQuiz(data) {
      return request('POST', '/admin/quizzes', data);
    },
    adminUpdateQuiz(id, data) {
      return request('PUT', `/admin/quizzes/${id}`, data);
    },
    adminDeleteQuiz(id) {
      return request('DELETE', `/admin/quizzes/${id}`);
    },
  };
})();
