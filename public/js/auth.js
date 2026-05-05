/* ============================================================
   QUIZLER — public/js/auth.js
   Login, register, logout — all via the API.
   ============================================================ */

const Auth = {

  // ── Login ───────────────────────────────────────────────────
  async doLogin() {
    const identifier = document.getElementById('login-email').value.trim();
    const password   = document.getElementById('login-password').value;
    const err        = document.getElementById('login-error');
    err.classList.remove('show');

    try {
      const data = await API.login(identifier, password);
      State.token       = data.token;
      State.currentUser = data.user;
      window.location.href = 'index.html';
    } catch (e) {
      err.textContent = e.message;
      err.classList.add('show');
    }
  },

  // ── Register ────────────────────────────────────────────────
  async doRegister() {
    const email = document.getElementById('reg-email').value.trim();
    const uname = document.getElementById('reg-username').value.trim();
    const pw    = document.getElementById('reg-pass').value;
    const pw2   = document.getElementById('reg-pass2').value;
    const err   = document.getElementById('reg-error');
    const ok    = document.getElementById('reg-success');
    err.classList.remove('show');
    ok.classList.remove('show');

    if (pw !== pw2) {
      err.textContent = 'Passwords do not match.';
      err.classList.add('show');
      return;
    }

    try {
      await API.register(email, uname, pw);
      ok.textContent = 'Account created! Redirecting to login…';
      ok.classList.add('show');
      setTimeout(() => window.location.href = 'login.html', 1600);
    } catch (e) {
      err.textContent = e.message;
      err.classList.add('show');
    }
  },

  // ── Logout ──────────────────────────────────────────────────
  async doLogout() {
    try { await API.logout(); } catch { /* ignore – token already expired */ }
    State.clear();
    Nav.updateTopBar();
    window.location.href = 'index.html';
  },
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') Auth.doLogin();
  });
  document.getElementById('reg-pass2')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') Auth.doRegister();
  });
});
