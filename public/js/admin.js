/* ============================================================
   QUIZLER — public/js/admin.js
   Admin dashboard: quiz CRUD via API.
   ============================================================ */

let _adminQuizzes = [];
let editingQuizId = null;
let questionCount = 0;

// ── Init ─────────────────────────────────────────────────────
async function initAdminPage() {
  await Nav.init();
  const user = State.currentUser;

  if (!State.isLoggedIn()) { window.location.href = 'login.html'; return; }
  if (user?.role !== 'admin') {
    document.getElementById('admin-content').style.display = 'none';
    document.getElementById('access-denied').style.display = 'block';
    return;
  }

  await loadAdminQuizzes();

  // Populate category select from API
  try {
    const cats = await API.getCategories();
    const sel  = document.getElementById('form-category');
    if (sel) {
      sel.innerHTML = '<option value="">Select a category…</option>' +
        cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  } catch { /* ignore */ }
}

async function loadAdminQuizzes() {
  const tbody = document.getElementById('admin-quiz-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="padding:16px;color:var(--gray-500)">Loading…</td></tr>';
  try {
    _adminQuizzes = await API.adminGetQuizzes();
    renderQuizTable();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--red);padding:16px">Failed to load quizzes: ${e.message}</td></tr>`;
  }
}

function renderQuizTable() {
  const tbody = document.getElementById('admin-quiz-tbody');
  if (!tbody) return;
  tbody.innerHTML = _adminQuizzes.map(q => `
    <tr>
      <td>${q.id}</td>
      <td>${q.title}</td>
      <td>${q.category}</td>
      <td>${q.difficulty}</td>
      <td>${(q.questions || []).length}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-sm btn-outline" onclick="openEditForm(${q.id})">Edit</button>
          <button class="btn btn-sm btn-danger"  onclick="deleteQuiz(${q.id})">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── Create form ───────────────────────────────────────────────
function openCreateForm() {
  editingQuizId = null;
  document.getElementById('admin-form-title').textContent = 'Create New Quiz';
  resetForm();
  addQuestion();
  document.getElementById('admin-form-wrap').classList.add('show');
  document.getElementById('admin-form-wrap').scrollIntoView({ behavior: 'smooth' });
}

// ── Edit form ─────────────────────────────────────────────────
function openEditForm(quizId) {
  editingQuizId = quizId;
  const quiz = _adminQuizzes.find(q => q.id === quizId);
  if (!quiz) return;

  document.getElementById('admin-form-title').textContent = 'Edit Quiz: ' + quiz.title;
  resetForm();
  document.getElementById('form-title').value      = quiz.title;
  document.getElementById('form-category').value   = quiz.categoryId;
  document.getElementById('form-difficulty').value = quiz.difficulty;
  (quiz.questions || []).forEach(q => addQuestion(q));
  document.getElementById('admin-form-wrap').classList.add('show');
  document.getElementById('admin-form-wrap').scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  document.getElementById('form-title').value      = '';
  document.getElementById('form-category').value   = '';
  document.getElementById('form-difficulty').value = '';
  document.getElementById('questions-container').innerHTML = '';
  document.getElementById('admin-form-error').classList.remove('show');
  document.getElementById('admin-form-success').classList.remove('show');
  questionCount = 0;
}

function cancelForm() {
  document.getElementById('admin-form-wrap').classList.remove('show');
  resetForm();
}

// ── Question block ────────────────────────────────────────────
function addQuestion(existing = null) {
  questionCount++;
  const num  = questionCount;
  const opts = existing ? existing.opts : ['', '', '', ''];
  const ci   = existing ? existing.correct : 0;
  const div  = document.createElement('div');
  div.className = 'question-item';
  div.id        = 'question-' + num;
  div.innerHTML = `
    <div class="question-item-head">
      <span class="question-num">Question ${num}</span>
      <button class="btn btn-sm btn-danger question-remove" onclick="removeQuestion(${num})" type="button">Remove</button>
    </div>
    <div class="admin-form-group">
      <label class="admin-form-label">Question Text</label>
      <input class="admin-input" id="q${num}-text" type="text" placeholder="Enter the question" value="${existing ? escHtml(existing.text) : ''}">
    </div>
    <div class="admin-form-label">Answer Options <span style="color:var(--gray-500);font-weight:400">(select the correct one)</span></div>
    <div id="q${num}-options">${opts.map((o, i) => answerRowHTML(num, i, o, i === ci)).join('')}</div>
    <button class="add-option-btn" onclick="addOption(${num})" type="button">+ Add option</button>`;
  document.getElementById('questions-container').appendChild(div);
}

function answerRowHTML(qNum, optIdx, value = '', isCorrect = false) {
  return `<div class="answer-row" id="q${qNum}-opt-row-${optIdx}">
    <input type="radio" name="q${qNum}-correct" value="${optIdx}" ${isCorrect ? 'checked' : ''} title="Mark as correct">
    <label>Correct?</label>
    <input class="admin-input" id="q${qNum}-opt-${optIdx}" type="text" placeholder="Option ${optIdx + 1}" value="${escHtml(value)}">
  </div>`;
}

function addOption(qNum) {
  const container = document.getElementById(`q${qNum}-options`);
  if (!container) return;
  const n = container.querySelectorAll('.answer-row').length;
  if (n >= 6) { alert('Maximum 6 answer options per question.'); return; }
  container.insertAdjacentHTML('beforeend', answerRowHTML(qNum, n));
}

function removeQuestion(num) {
  document.getElementById('question-' + num)?.remove();
}

// ── Save quiz ─────────────────────────────────────────────────
async function saveQuiz() {
  const err = document.getElementById('admin-form-error');
  const ok  = document.getElementById('admin-form-success');
  err.classList.remove('show');
  ok.classList.remove('show');

  const title      = document.getElementById('form-title').value.trim();
  const categoryId = parseInt(document.getElementById('form-category').value);
  const difficulty = document.getElementById('form-difficulty').value;

  if (!title)      { return _adminErr(err, 'Quiz title is required.'); }
  if (!categoryId) { return _adminErr(err, 'Category is required.'); }
  if (!difficulty) { return _adminErr(err, 'Difficulty level is required.'); }

  const questionEls = document.querySelectorAll('.question-item');
  const questions   = [];
  for (const qEl of questionEls) {
    const m = qEl.id.match(/question-(\d+)/);
    if (!m) continue;
    const qNum = m[1];
    const text = document.getElementById(`q${qNum}-text`)?.value.trim() || '';
    if (!text) { return _adminErr(err, 'Each question must have question text.'); }
    const optEls = qEl.querySelectorAll('[id^="q' + qNum + '-opt-"]');
    const opts   = [...optEls].map(i => i.value.trim()).filter(Boolean);
    if (opts.length < 2) { return _adminErr(err, 'Each question must have between 2 and 6 answer options.'); }
    const radio   = qEl.querySelector(`input[name="q${qNum}-correct"]:checked`);
    const correct = radio ? parseInt(radio.value) : 0;
    questions.push({ text, opts, correct });
  }
  if (questions.length === 0) { return _adminErr(err, 'A quiz must have at least one question.'); }

  const payload = { title, categoryId, difficulty, questions };

  try {
    if (editingQuizId !== null) {
      await API.adminUpdateQuiz(editingQuizId, payload);
      ok.textContent = 'Quiz updated successfully!';
    } else {
      await API.adminCreateQuiz(payload);
      ok.textContent = 'Quiz created successfully!';
    }
    ok.classList.add('show');
    await loadAdminQuizzes();
    setTimeout(cancelForm, 2000);
  } catch (e) {
    _adminErr(err, e.message);
  }
}

// ── Delete quiz ───────────────────────────────────────────────
async function deleteQuiz(quizId) {
  const quiz = _adminQuizzes.find(q => q.id === quizId);
  if (!quiz) return;
  if (!confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return;
  try {
    await API.adminDeleteQuiz(quizId);
    await loadAdminQuizzes();
  } catch (e) {
    alert('Delete failed: ' + e.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────
function _adminErr(el, msg) { el.textContent = msg; el.classList.add('show'); }
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', initAdminPage);
