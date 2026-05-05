/* ============================================================
   QUIZLER — js/auth.js
   Authentication: login, register, logout.
   Depends on: db.js, state.js, nav.js
   ============================================================ */

const Auth = {

  /* ── Login ── */
  doLogin() {
    const identifier = document.getElementById('login-email').value.trim();
    const password   = document.getElementById('login-password').value;
    const err        = document.getElementById('login-error');
    err.classList.remove('show');

    // Decision table row 3: fields not filled
    if (!identifier || !password) {
      err.textContent = 'Please fill all the fields in.';
      err.classList.add('show');
      return;
    }

    const users = State.getUsers();
    const user  = users.find(u =>
      (u.email === identifier || u.username === identifier) && u.password === password
    );

    // Decision table rows 1–2: wrong credentials
    if (!user) {
      err.textContent = 'Invalid email/username or password.';
      err.classList.add('show');
      return;
    }

    // Decision table row 4: success
    State.currentUser = user;
    Nav.updateTopBar();
    window.location.href = 'index.html';
  },

  /* ── Register ── */
  doRegister() {
    const email = document.getElementById('reg-email').value.trim();
    const uname = document.getElementById('reg-username').value.trim();
    const pw    = document.getElementById('reg-pass').value;
    const pw2   = document.getElementById('reg-pass2').value;
    const err   = document.getElementById('reg-error');
    const ok    = document.getElementById('reg-success');
    err.classList.remove('show');
    ok.classList.remove('show');

    const users    = State.getUsers();
    const emailRx  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validation in decision-table order (Table 5.1 equivalent)
    if (!email)                              { return this._regErr(err, 'Email is required.'); }
    if (!emailRx.test(email))                { return this._regErr(err, 'Invalid email format.'); }
    if (users.find(u => u.email === email))  { return this._regErr(err, 'Email already taken.'); }
    if (!uname)                              { return this._regErr(err, 'Username is required.'); }
    if (users.find(u => u.username === uname)){ return this._regErr(err, 'Username already taken.'); }
    if (!pw)                                 { return this._regErr(err, 'Password is required.'); }
    if (pw.length < 8)                       { return this._regErr(err, 'Password must be at least 8 characters.'); }
    if (pw !== pw2)                          { return this._regErr(err, 'Passwords do not match.'); }

    // Create account with 'player' role
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
    const newUser = { email, username: uname, password: pw, role: 'player',
                      registrationDate: today, totalPoints: 0 };
    users.push(newUser);
    State.saveUsers(users);

    ok.textContent = 'Account created successfully! You can now log in.';
    ok.classList.add('show');
    setTimeout(() => window.location.href = 'login.html', 1800);
  },

  _regErr(el, msg) {
    el.textContent = msg;
    el.classList.add('show');
  },

  /* ── Logout ── */
  doLogout() {
    State.currentUser = null;
    Nav.updateTopBar();
    window.location.href = 'index.html';
  },
};

/* Enter-key shortcuts */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') Auth.doLogin();
  });
  document.getElementById('reg-pass2')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') Auth.doRegister();
  });
});
