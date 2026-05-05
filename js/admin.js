/* ============================================================
   QUIZLER — js/admin.js
   Admin dashboard: quiz creation, editing, deletion.
   Only accessible to users with role === 'admin'.
   Depends on: db.js, state.js, nav.js
   ============================================================ */

let editingQuizId = null;   // null = create mode, number = edit mode
let questionCount = 0;      // tracks dynamically added question blocks

/* ── Access guard (REQ 1.12) ── */
function initAdminPage() {
  Nav.init();
  const user = State.currentUser;

  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  if (user.role !== 'admin') {
    document.getElementById('admin-content').style.display  = 'none';
    document.getElementById('access-denied').style.display  = 'block';
    return;
  }

  renderQuizTable();
}

/* ── Quiz list table ── */
function renderQuizTable() {
  const tbody = document.getElementById('admin-quiz-tbody');
  if (!tbody) return;
  tbody.innerHTML = QUIZZES.map(q => `
    <tr>
      <td>${q.id}</td>
      <td>${q.title}</td>
      <td>${q.category}</td>
      <td>${q.difficulty}</td>
      <td>${q.questions.length}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-sm btn-outline" onclick="openEditForm(${q.id})">Edit</button>
          <button class="btn btn-sm btn-danger"  onclick="deleteQuiz(${q.id})">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

/* ── Open create form ── */
function openCreateForm() {
  editingQuizId = null;
  document.getElementById('admin-form-title').textContent = 'Create New Quiz';
  resetForm();
  addQuestion(); // start with one question
  document.getElementById('admin-form-wrap').classList.add('show');
  document.getElementById('admin-form-wrap').scrollIntoView({ behavior: 'smooth' });
}

/* ── Open edit form ── */
function openEditForm(quizId) {
  editingQuizId = quizId;
  const quiz = QUIZZES.find(q => q.id === quizId);
  if (!quiz) return;

  document.getElementById('admin-form-title').textContent = 'Edit Quiz: ' + quiz.title;
  resetForm();

  document.getElementById('form-title').value      = quiz.title;
  document.getElementById('form-category').value   = quiz.categoryId;
  document.getElementById('form-difficulty').value = quiz.difficulty;

  quiz.questions.forEach(q => addQuestion(q));
  document.getElementById('admin-form-wrap').classList.add('show');
  document.getElementById('admin-form-wrap').scrollIntoView({ behavior: 'smooth' });
}

/* ── Reset form ── */
function resetForm() {
  document.getElementById('form-title').value      = '';
  document.getElementById('form-category').value   = '';
  document.getElementById('form-difficulty').value = '';
  document.getElementById('questions-container').innerHTML = '';
  document.getElementById('admin-form-error').classList.remove('show');
  document.getElementById('admin-form-success').classList.remove('show');
  questionCount = 0;
}

/* ── Cancel / close form ── */
function cancelForm() {
  document.getElementById('admin-form-wrap').classList.remove('show');
  resetForm();
}

/* ── Add question block ── */
function addQuestion(existing = null) {
  questionCount++;
  const num = questionCount;
  const container = document.getElementById('questions-container');
  const div = document.createElement('div');
  div.className = 'question-item';
  div.id        = 'question-' + num;

  // Default to 4 answer options
  const opts = existing ? existing.opts : ['', '', '', ''];
  const correctIdx = existing ? existing.correct : 0;

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
    <div id="q${num}-options">
      ${opts.map((o, i) => answerRowHTML(num, i, o, i === correctIdx)).join('')}
    </div>
    <button class="add-option-btn" onclick="addOption(${num})" type="button">+ Add option</button>`;

  container.appendChild(div);
}

function answerRowHTML(qNum, optIdx, value = '', isCorrect = false) {
  return `
    <div class="answer-row" id="q${qNum}-opt-row-${optIdx}">
      <input type="radio" name="q${qNum}-correct" value="${optIdx}" ${isCorrect ? 'checked' : ''} title="Mark as correct">
      <label>Correct?</label>
      <input class="admin-input" id="q${qNum}-opt-${optIdx}" type="text" placeholder="Option ${optIdx + 1}" value="${escHtml(value)}">
    </div>`;
}

function addOption(qNum) {
  const container  = document.getElementById(`q${qNum}-options`);
  if (!container) return;
  const currentCount = container.querySelectorAll('.answer-row').length;
  if (currentCount >= 6) { alert('Maximum 6 answer options per question.'); return; }
  container.insertAdjacentHTML('beforeend', answerRowHTML(qNum, currentCount));
}

function removeQuestion(num) {
  document.getElementById('question-' + num)?.remove();
}

/* ── Save quiz (create or update) — uses decision table 5.5 logic ── */
function saveQuiz() {
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

  // Collect questions
  const questionEls = document.querySelectorAll('.question-item');
  const questions   = [];

  for (const qEl of questionEls) {
    const qNumMatch = qEl.id.match(/question-(\d+)/);
    if (!qNumMatch) continue;
    const qNum = qNumMatch[1];

    const text = document.getElementById(`q${qNum}-text`)?.value.trim() || '';
    if (!text) { return _adminErr(err, 'Each question must have a question text.'); }

    const optEls  = qEl.querySelectorAll('[id^="q' + qNum + '-opt-"]');
    const opts    = [...optEls].map(i => i.value.trim()).filter(v => v !== '');
    if (opts.length < 2) {
      return _adminErr(err, 'Each question must have between 2 and 6 answer options.');
    }

    const correctRadio = qEl.querySelector(`input[name="q${qNum}-correct"]:checked`);
    const correctIdx   = correctRadio ? parseInt(correctRadio.value) : 0;
    questions.push({ text, opts, correct: correctIdx });
  }

  if (questions.length === 0) {
    return _adminErr(err, 'A quiz must have at least one question.');
  }

  const cat        = CATEGORIES.find(c => c.id === categoryId);
  const multiplier = { 'Easy': 0.75, 'Normal': 1.0, 'Hard': 1.5 }[difficulty] || 1.0;
  const timePerQ   = { 'Easy': 30,   'Normal': 45,  'Hard': 60  }[difficulty] || 45;
  const today      = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');

  if (editingQuizId !== null) {
    // Edit existing
    const idx = QUIZZES.findIndex(q => q.id === editingQuizId);
    if (idx !== -1) {
      QUIZZES[idx] = {
        ...QUIZZES[idx],
        title, categoryId, category: cat.name, difficulty,
        multiplier, timePerQ, updated: today, questions,
      };
    }
    ok.textContent = 'Quiz updated successfully!';
  } else {
    // Create new
    const newId = Math.max(...QUIZZES.map(q => q.id)) + 1;
    QUIZZES.push({
      id: newId, title, categoryId, category: cat.name, difficulty,
      multiplier, timePerQ, language: 'English', updated: today,
      avgScore: 0, completedCount: 0,
      desc: title + ' — a quiz on ' + cat.name + '.',
      questions,
      leaderboard: [],
    });
    ok.textContent = 'Quiz created successfully!';
  }

  renderQuizTable();
  ok.classList.add('show');
  setTimeout(cancelForm, 2000);
}

/* ── Delete quiz (REQ 3.11) ── */
function deleteQuiz(quizId) {
  const quiz = QUIZZES.find(q => q.id === quizId);
  if (!quiz) return;
  if (!confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return;
  const idx = QUIZZES.findIndex(q => q.id === quizId);
  if (idx !== -1) QUIZZES.splice(idx, 1);
  renderQuizTable();
}

/* ── Helpers ── */
function _adminErr(el, msg) {
  el.textContent = msg; el.classList.add('show');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', initAdminPage);
