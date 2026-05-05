-- ============================================================
--  QUIZLER — database.sql
--  PostgreSQL database schema and seed data.
--
--  Implements every table described in the System Design
--  Description (Section 2.4 Data Decomposition List, Section 3.2
--  Data Dependency) and the data requirements of the
--  Requirements Specification.
--
--  Tables:
--    users                  — registered user accounts
--    categories             — quiz topic categories
--    quizzes                — quiz metadata
--    questions              — individual questions belonging to a quiz
--    answer_options         — answer choices for each question
--    quiz_attempts          — every quiz completion by a registered user
--    global_leaderboard     — ranking of all users by total points
--    category_leaderboards  — per-category rankings
--    quiz_leaderboards      — per-quiz best-score rankings
--
--  Usage:
--    psql -U <user> -d <database> -f database.sql
-- ============================================================


-- ============================================================
-- 0. SETUP — extensions and clean re-run support
-- ============================================================

-- Enable pgcrypto for password hashing helpers (if available)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop dependent tables first (reverse FK order)
DROP TABLE IF EXISTS quiz_leaderboards      CASCADE;
DROP TABLE IF EXISTS category_leaderboards  CASCADE;
DROP TABLE IF EXISTS global_leaderboard     CASCADE;
DROP TABLE IF EXISTS quiz_attempts          CASCADE;
DROP TABLE IF EXISTS answer_options         CASCADE;
DROP TABLE IF EXISTS questions              CASCADE;
DROP TABLE IF EXISTS quizzes                CASCADE;
DROP TABLE IF EXISTS categories             CASCADE;
DROP TABLE IF EXISTS users                  CASCADE;


-- ============================================================
-- 1. USERS
--    Stores core account information for every registered user.
--    REQ 1.1, 1.3, 1.4, 1.5, 1.8 — registration fields + role.
--    REQ 4.1 — total_points supports global scoring.
-- ============================================================

CREATE TABLE users (
    id                SERIAL        PRIMARY KEY,
    username          VARCHAR(50)   NOT NULL UNIQUE,
    email             VARCHAR(150)  NOT NULL UNIQUE,
    -- NOTE: In production use crypt(password, gen_salt('bf')) from pgcrypto.
    --       Prototype seeds use bcrypt-format placeholder hashes.
    password_hash     VARCHAR(255)  NOT NULL,
    role              VARCHAR(10)   NOT NULL DEFAULT 'player'
                          CHECK (role IN ('player', 'admin')),
    registration_date DATE          NOT NULL DEFAULT CURRENT_DATE,
    total_points      INTEGER       NOT NULL DEFAULT 0
                          CHECK (total_points >= 0)
);

COMMENT ON TABLE  users                  IS 'Registered user accounts.';
COMMENT ON COLUMN users.password_hash    IS 'bcrypt hash (cost 12). Never store plain-text passwords.';
COMMENT ON COLUMN users.role             IS 'player (default) or admin. REQ 1.8, 1.12.';
COMMENT ON COLUMN users.total_points     IS 'Cumulative points across all quiz attempts. REQ 5.3.';


-- ============================================================
-- 2. CATEGORIES
--    Topic groups that organise quizzes.
--    REQ 3.1, 3.3, 3.4 — browsable scrollable list with counts.
-- ============================================================

CREATE TABLE categories (
    id          SERIAL        PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL UNIQUE,
    description TEXT
);

COMMENT ON TABLE categories IS 'Quiz topic categories. REQ 3.1–3.4.';


-- ============================================================
-- 3. QUIZZES
--    Metadata for each quiz; questions are in a separate table.
--    REQ 3.2  — each quiz belongs to exactly one category.
--    REQ 3.7  — title, category, difficulty are required.
--    REQ 5.3  — difficulty_multiplier is used during score calc.
-- ============================================================

CREATE TABLE quizzes (
    id                   SERIAL          PRIMARY KEY,
    title                VARCHAR(200)    NOT NULL,
    category_id          INTEGER         NOT NULL
                             REFERENCES categories(id) ON DELETE RESTRICT,
    difficulty           VARCHAR(10)     NOT NULL
                             CHECK (difficulty IN ('Easy', 'Normal', 'Hard')),
    difficulty_multiplier DECIMAL(4, 2)  NOT NULL
                             CHECK (difficulty_multiplier > 0),
    time_per_question    INTEGER         NOT NULL  -- seconds per question
                             CHECK (time_per_question > 0),
    language             VARCHAR(50)     NOT NULL DEFAULT 'English',
    description          TEXT,
    avg_score            DECIMAL(8, 2)   NOT NULL DEFAULT 0,
    completed_count      INTEGER         NOT NULL DEFAULT 0
                             CHECK (completed_count >= 0),
    updated_at           DATE,
    created_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  quizzes                       IS 'Quiz metadata. REQ 3.1–3.11.';
COMMENT ON COLUMN quizzes.difficulty_multiplier IS 'Score multiplier: Easy=0.75, Normal=1.0, Hard=1.5. REQ 5.3.';
COMMENT ON COLUMN quizzes.time_per_question     IS 'Seconds allowed per question. REQ 4.4.';


-- ============================================================
-- 4. QUESTIONS
--    Individual questions belonging to a quiz.
--    REQ 3.8 — multiple-choice, one correct answer.
--    REQ 3.9 — each question has 2–6 answer options.
-- ============================================================

CREATE TABLE questions (
    id            SERIAL   PRIMARY KEY,
    quiz_id       INTEGER  NOT NULL
                      REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT     NOT NULL,
    position      INTEGER  NOT NULL   -- 1-based display order within quiz
                      CHECK (position >= 1)
);

COMMENT ON TABLE questions IS 'Individual quiz questions. REQ 3.8, 4.2.';


-- ============================================================
-- 5. ANSWER_OPTIONS
--    The possible answers for each question; exactly one
--    option per question must have is_correct = TRUE.
--    REQ 3.9  — 2–6 options per question.
--    REQ 4.3  — users select exactly one answer per question.
--    REQ 4.9  — correct answer is shown after quiz submission.
-- ============================================================

CREATE TABLE answer_options (
    id           SERIAL    PRIMARY KEY,
    question_id  INTEGER   NOT NULL
                     REFERENCES questions(id) ON DELETE CASCADE,
    option_text  TEXT      NOT NULL,
    is_correct   BOOLEAN   NOT NULL DEFAULT FALSE,
    position     INTEGER   NOT NULL  -- 0-based display order (A, B, C …)
                     CHECK (position >= 0)
);

COMMENT ON TABLE answer_options IS 'Answer options per question (2–6). REQ 3.9, 4.3, 4.9.';

-- Enforce: every question has at most one correct answer
CREATE UNIQUE INDEX uq_one_correct_per_question
    ON answer_options (question_id)
    WHERE is_correct = TRUE;


-- ============================================================
-- 6. QUIZ_ATTEMPTS
--    Every completion of a quiz by a registered user.
--    REQ 5.4 — stores user_id, quiz_id, score, timestamp.
--    REQ 5.5 — application layer reads this to determine best score.
-- ============================================================

CREATE TABLE quiz_attempts (
    id            SERIAL     PRIMARY KEY,
    user_id       INTEGER    NOT NULL
                      REFERENCES users(id)   ON DELETE CASCADE,
    quiz_id       INTEGER    NOT NULL
                      REFERENCES quizzes(id) ON DELETE CASCADE,
    score         INTEGER    NOT NULL
                      CHECK (score >= 0),
    completed_at  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE quiz_attempts IS 'Each quiz completion record. REQ 5.4, 5.5.';

-- Index for fast quiz-history lookups per user (REQ 2.3, 2.5)
CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);


-- ============================================================
-- 7. GLOBAL_LEADERBOARD
--    Ranking of all users by total accumulated points.
--    REQ 6.1 — maintained separately for performance.
--    REQ 6.3 — updated after each quiz completion.
--    REQ 6.4 — tie-breaking: earlier achieved_at ranks higher.
-- ============================================================

CREATE TABLE global_leaderboard (
    id           SERIAL     PRIMARY KEY,
    user_id      INTEGER    NOT NULL UNIQUE
                     REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER    NOT NULL DEFAULT 0
                     CHECK (total_points >= 0),
    rank         INTEGER,
    updated_at   TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE global_leaderboard IS 'Global ranking by total points. REQ 6.1, 6.3–6.5.';
CREATE INDEX idx_global_lb_points ON global_leaderboard(total_points DESC);


-- ============================================================
-- 8. CATEGORY_LEADERBOARDS
--    Per-category rankings by aggregate quiz score within the
--    category.
--    REQ 6.1 — separate leaderboard per category.
-- ============================================================

CREATE TABLE category_leaderboards (
    id           SERIAL    PRIMARY KEY,
    category_id  INTEGER   NOT NULL
                     REFERENCES categories(id) ON DELETE CASCADE,
    user_id      INTEGER   NOT NULL
                     REFERENCES users(id)      ON DELETE CASCADE,
    total_points INTEGER   NOT NULL DEFAULT 0
                     CHECK (total_points >= 0),
    rank         INTEGER,
    UNIQUE (category_id, user_id)
);

COMMENT ON TABLE category_leaderboards IS 'Per-category user rankings. REQ 6.1.';
CREATE INDEX idx_cat_lb_category ON category_leaderboards(category_id, total_points DESC);


-- ============================================================
-- 9. QUIZ_LEADERBOARDS
--    Per-quiz rankings based on each user's best attempt score.
--    REQ 6.1  — individual quiz leaderboard.
--    REQ 5.5  — only best score is kept here (all attempts in quiz_attempts).
--    REQ 6.4  — achieved_at used for tie-breaking.
-- ============================================================

CREATE TABLE quiz_leaderboards (
    id           SERIAL     PRIMARY KEY,
    quiz_id      INTEGER    NOT NULL
                     REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id      INTEGER    NOT NULL
                     REFERENCES users(id)   ON DELETE CASCADE,
    best_score   INTEGER    NOT NULL DEFAULT 0
                     CHECK (best_score >= 0),
    rank         INTEGER,
    achieved_at  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (quiz_id, user_id)
);

COMMENT ON TABLE quiz_leaderboards IS 'Per-quiz best-score rankings. REQ 5.5, 6.1, 6.4.';
CREATE INDEX idx_quiz_lb_quiz ON quiz_leaderboards(quiz_id, best_score DESC);


-- ============================================================
-- ============================================================
--  S E E D   D A T A
-- ============================================================
-- ============================================================


-- ============================================================
-- USERS
--
--  Primary accounts (accessible in the frontend prototype):
--    user@quizler.com   / User_67  / password: password123
--    admin@quizler.com  / Admin    / password: admin12345
--
--  Leaderboard NPC accounts (simulate other players):
--    Passwords are random bcrypt placeholder hashes.
--    These accounts exist to populate leaderboards; they
--    cannot be logged into in the prototype.
--
--  NOTE: password_hash values below are bcrypt (cost 12)
--  placeholders.  In a real deployment run:
--    UPDATE users SET password_hash = crypt(plain_pw, gen_salt('bf', 12))
--  ============================================================

INSERT INTO users (id, username, email, password_hash, role, registration_date, total_points) VALUES
-- ── Primary accounts ──────────────────────────────────────────
( 1, 'User_67',       'user@quizler.com',           '$2b$12$O6U1cCszpUr4X9DMjz5UV.tj5MzsHSIbI25bSQy2ggcUQx9hc5pze', 'player', '2025-01-01',  728),
( 2, 'Admin',         'admin@quizler.com',           '$2b$12$WfKuV9oI.ilAZduC5dfEce9e9G0wTXOosG7AjUTwnQuzihYEVuorO', 'admin',  '2025-01-01',    0),
-- ── Leaderboard NPC accounts ──────────────────────────────────
( 3, 'SciencePro',    'sciencepro@quizler.com',      '$2a$12$FakeHashForScienceProAAAAA.BBBBBBBBBBBBBBBBBBBBBBBBBB', 'player', '2025-01-05', 1380),
( 4, 'MathWiz',       'mathwiz@quizler.com',         '$2a$12$FakeHashForMathWizAAAAAAA.BBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'player', '2025-01-06', 1245),
( 5, 'PhysicsGuru',   'physicsguru@quizler.com',     '$2a$12$FakeHashForPhysicsGuruAAA.BBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'player', '2025-01-08', 1120),
( 6, 'ChemWiz',       'chemwiz@quizler.com',         '$2a$12$FakeHashForChemWizAAAAAAA.BBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'player', '2025-01-09', 1058),
( 7, 'BioNerd',       'bionerd@quizler.com',         '$2a$12$FakeHashForBioNerdAAAAAAA.BBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'player', '2025-01-10',  980),
( 8, 'GeoGenius',     'geogenius@quizler.com',       '$2a$12$FakeHashForGeoGeniusAAAAA.BBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'player', '2025-01-11',  912),
( 9, 'AlgebraKing',   'algebraking@quizler.com',     '$2a$12$FakeHashForAlgebraKingAAA.BBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'player', '2025-01-12',  855),
(10, 'WorldExplorer', 'worldexplorer@quizler.com',   '$2a$12$FakeHashForWorldExplorerA.BBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'player', '2025-01-13',  790),
(11, 'QuizKing',      'quizking@quizler.com',        '$2a$12$FakeHashForQuizKingAAAAA.BBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'player', '2025-01-14',  651),
(12, 'LevR',          'levr@quizler.com',            '$2a$12$FakeHashForLevRAAAAAAAAA.BBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'player', '2025-01-15',  352);

-- Reset sequence to avoid PK collisions after manual IDs
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));


-- ============================================================
-- CATEGORIES
-- ============================================================

INSERT INTO categories (id, name, description) VALUES
(1, 'Algebra',   'Equations, functions, polynomials and algebraic structures.'),
(2, 'Geometry',  'Shapes, angles, area, volume and geometric proofs.'),
(3, 'Geography', 'Countries, capitals, physical geography and geopolitics.'),
(4, 'Chemistry', 'Atomic structure, periodic table, reactions and bonding.'),
(5, 'Physics',   'Forces, motion, energy, waves and electromagnetism.'),
(6, 'Biology',   'Cells, genetics, evolution and biological systems.');

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));


-- ============================================================
-- QUIZZES
-- ============================================================

INSERT INTO quizzes
    (id, title, category_id, difficulty, difficulty_multiplier,
     time_per_question, language, description, avg_score, completed_count, updated_at)
VALUES
( 1, 'Algebra Fundamentals',          1, 'Easy',   0.75, 30, 'English',
     'Test your knowledge of core algebra concepts including equations, inequalities, and basic functions.',
      68, 52, '2025-04-10'),
( 2, 'Advanced Algebra Challenge',    1, 'Hard',   1.50, 60, 'English',
     'Push your algebra skills with complex equations, systems of equations, and polynomial expressions.',
     145, 19, '2025-04-14'),
( 3, 'Geometry Basics',               2, 'Easy',   0.75, 30, 'English',
     'Explore the fundamentals of plane geometry including shapes, angles, area, and perimeter.',
      72, 44, '2025-04-08'),
( 4, 'Geometry: Circles & Solids',    2, 'Normal', 1.00, 45, 'English',
     'Deepen your understanding of circle theorems and 3D solid geometry.',
     103, 27, '2025-04-12'),
( 5, 'World Geography Essentials',    3, 'Easy',   0.75, 30, 'English',
     'Test your knowledge of countries, capitals, continents, and major geographical features.',
      65, 61, '2025-04-05'),
( 6, 'Physical Geography Deep Dive',  3, 'Normal', 1.00, 45, 'English',
     'Explore climate zones, tectonic plates, ocean currents, and the physical processes shaping our planet.',
      96, 33, '2025-04-18'),
( 7, 'Chemistry: Atoms & Elements',   4, 'Normal', 1.00, 45, 'English',
     'Discover the building blocks of matter — atomic structure, the periodic table, and element properties.',
     105, 38, '2025-04-02'),
( 8, 'Chemical Reactions & Bonding',  4, 'Hard',   1.50, 60, 'English',
     'Challenge yourself with chemical bonding types, reaction equations, and stoichiometry concepts.',
     152, 16, '2025-04-21'),
( 9, 'Physics: Forces & Motion',      5, 'Normal', 1.00, 45, 'English',
     'Test Newton''s laws, kinematics, and the principles of force, acceleration, and momentum.',
     110, 35, '2025-04-07'),
(10, 'Physics: Energy & Waves',       5, 'Hard',   1.50, 60, 'English',
     'Explore energy conservation, thermodynamics, wave properties, and electromagnetic radiation.',
     148, 21, '2025-04-22'),
(11, 'Biology: Cells & Life',         6, 'Easy',   0.75, 30, 'English',
     'Explore the fundamental unit of life — cell structure, organelles, and basic biological processes.',
      70, 58, '2025-04-03'),
(12, 'Biology: Genetics & Evolution', 6, 'Normal', 1.00, 45, 'English',
     'Explore inheritance, DNA structure, natural selection, and the mechanisms driving evolution.',
     108, 29, '2025-04-19');

SELECT setval('quizzes_id_seq', (SELECT MAX(id) FROM quizzes));


-- ============================================================
-- QUESTIONS  (5 per quiz, 60 total)
-- position is 1-based display order within the quiz
-- ============================================================

INSERT INTO questions (id, quiz_id, question_text, position) VALUES
-- ── Quiz 1: Algebra Fundamentals ──────────────────────────────
( 1,  1, 'What is the value of x in the equation 2x + 6 = 14?',                           1),
( 2,  1, 'Which of the following is a quadratic equation?',                                2),
( 3,  1, 'What is the slope of the line y = 3x + 2?',                                     3),
( 4,  1, 'Simplify: 4(x + 3) - 2x',                                                       4),
( 5,  1, 'What are the roots of x² - 9 = 0?',                                             5),
-- ── Quiz 2: Advanced Algebra Challenge ────────────────────────
( 6,  2, 'Solve the system: x + y = 10, x - y = 4. What is x?',                           1),
( 7,  2, 'What is the discriminant of x² - 4x + 3 = 0?',                                  2),
( 8,  2, 'Factor completely: x² + 7x + 12',                                               3),
( 9,  2, 'What is the inverse function of f(x) = 2x - 6?',                                4),
(10,  2, 'Simplify: (x³ · x²) / x⁴',                                                     5),
-- ── Quiz 3: Geometry Basics ────────────────────────────────────
(11,  3, 'What is the sum of interior angles of a triangle?',                              1),
(12,  3, 'What is the area of a rectangle with length 8 cm and width 5 cm?',              2),
(13,  3, 'How many sides does a hexagon have?',                                            3),
(14,  3, 'The circumference of a circle with radius 7 cm is approximately:',              4),
(15,  3, 'Two lines that never meet are called:',                                          5),
-- ── Quiz 4: Geometry – Circles & Solids ───────────────────────
(16,  4, 'What is the volume of a cube with side length 4 cm?',                            1),
(17,  4, 'The area of a circle with diameter 10 cm is approximately:',                    2),
(18,  4, 'An angle inscribed in a semicircle is always:',                                  3),
(19,  4, 'What is the surface area of a sphere with radius 3 cm? (Use π ≈ 3.14)',         4),
(20,  4, 'A tangent to a circle is:',                                                      5),
-- ── Quiz 5: World Geography Essentials ────────────────────────
(21,  5, 'What is the capital of France?',                                                 1),
(22,  5, 'Which is the largest continent by area?',                                        2),
(23,  5, 'Which river is the longest in the world?',                                       3),
(24,  5, 'Which country has the largest population in the world?',                         4),
(25,  5, 'The Sahara Desert is located in which continent?',                               5),
-- ── Quiz 6: Physical Geography Deep Dive ──────────────────────
(26,  6, 'Which type of plate boundary causes earthquakes and volcanic eruptions?',        1),
(27,  6, 'The Gulf Stream is an example of:',                                              2),
(28,  6, 'Which climate zone is characterised by hot, dry summers and mild, wet winters?', 3),
(29,  6, 'What causes the seasons on Earth?',                                              4),
(30,  6, 'The deepest point in the ocean is located in:',                                  5),
-- ── Quiz 7: Chemistry – Atoms & Elements ──────────────────────
(31,  7, 'How many protons does a carbon atom have?',                                      1),
(32,  7, 'Which element has the chemical symbol "Au"?',                                    2),
(33,  7, 'What is the most abundant element in the Earth''s atmosphere?',                  3),
(34,  7, 'The atomic number of an element is determined by:',                              4),
(35,  7, 'Which of the following is a noble gas?',                                         5),
-- ── Quiz 8: Chemical Reactions & Bonding ──────────────────────
(36,  8, 'What type of bond is formed when electrons are shared between atoms?',           1),
(37,  8, 'In the reaction 2H₂ + O₂ → 2H₂O, what is the limiting reagent if you have 4 mol H₂ and 1 mol O₂?', 2),
(38,  8, 'What is the pH of a neutral solution at 25°C?',                                  3),
(39,  8, 'Which of the following best describes an exothermic reaction?',                  4),
(40,  8, 'The molar mass of water (H₂O) is approximately:',                               5),
-- ── Quiz 9: Physics – Forces & Motion ─────────────────────────
(41,  9, 'Newton''s First Law states that an object at rest will:',                        1),
(42,  9, 'A car accelerates from 0 to 20 m/s in 4 seconds. What is its acceleration?',    2),
(43,  9, 'What is the unit of force in the SI system?',                                    3),
(44,  9, 'If a 10 kg object has a velocity of 3 m/s, what is its momentum?',              4),
(45,  9, 'Which of the following is a scalar quantity?',                                   5),
-- ── Quiz 10: Physics – Energy & Waves ─────────────────────────
(46, 10, 'Which law states that energy cannot be created or destroyed?',                   1),
(47, 10, 'What is the frequency of a wave with a period of 0.02 seconds?',                2),
(48, 10, 'Which type of wave requires a medium to travel through?',                        3),
(49, 10, 'The work done by a force of 10 N moving an object 5 m is:',                     4),
(50, 10, 'Which part of the electromagnetic spectrum has the shortest wavelength?',        5),
-- ── Quiz 11: Biology – Cells & Life ───────────────────────────
(51, 11, 'What is the powerhouse of the cell?',                                            1),
(52, 11, 'Which organelle controls what enters and exits the cell?',                       2),
(53, 11, 'DNA is found mainly in which organelle?',                                        3),
(54, 11, 'Which of the following is found in plant cells but NOT in animal cells?',        4),
(55, 11, 'What process do plants use to make food using sunlight?',                        5),
-- ── Quiz 12: Biology – Genetics & Evolution ───────────────────
(56, 12, 'What are the monomers of DNA called?',                                           1),
(57, 12, 'In a monohybrid cross between two Aa parents, what fraction of offspring will be aa?', 2),
(58, 12, 'Which scientist proposed the theory of natural selection?',                      3),
(59, 12, 'What is the term for a change in the DNA sequence of a gene?',                   4),
(60, 12, 'How many chromosomes does a normal human body cell contain?',                    5);

SELECT setval('questions_id_seq', (SELECT MAX(id) FROM questions));


-- ============================================================
-- ANSWER_OPTIONS
--  position is 0-based (0 = A, 1 = B, 2 = C, 3 = D).
--  is_correct = TRUE marks the unique correct answer per question.
--  Format: (id, question_id, option_text, is_correct, position)
-- ============================================================

INSERT INTO answer_options (id, question_id, option_text, is_correct, position) VALUES

-- ── Q1  (quiz 1): 2x + 6 = 14 → x = 4 (pos 1) ───────────────
(  1,  1, '3',             FALSE, 0),
(  2,  1, '4',             TRUE,  1),
(  3,  1, '5',             FALSE, 2),
(  4,  1, '6',             FALSE, 3),
-- ── Q2: quadratic equation ────────────────────────────────────
(  5,  2, '3x + 2 = 0',          FALSE, 0),
(  6,  2, 'x² + 5x + 6 = 0',    TRUE,  1),
(  7,  2, '2x - 7 = 9',          FALSE, 2),
(  8,  2, '5 = x + 1',           FALSE, 3),
-- ── Q3: slope of y = 3x + 2 ──────────────────────────────────
(  9,  3, '2',             FALSE, 0),
( 10,  3, '3',             TRUE,  1),
( 11,  3, '5',             FALSE, 2),
( 12,  3, '1',             FALSE, 3),
-- ── Q4: simplify 4(x+3) - 2x ─────────────────────────────────
( 13,  4, '2x + 12',       TRUE,  0),
( 14,  4, '6x + 3',        FALSE, 1),
( 15,  4, '2x + 3',        FALSE, 2),
( 16,  4, '4x + 12',       FALSE, 3),
-- ── Q5: roots of x² - 9 = 0 ──────────────────────────────────
( 17,  5, 'x = 3 only',    FALSE, 0),
( 18,  5, 'x = ±9',        FALSE, 1),
( 19,  5, 'x = ±3',        TRUE,  2),
( 20,  5, 'x = 0',         FALSE, 3),

-- ── Q6 (quiz 2): system x+y=10, x-y=4 → x=7 ─────────────────
( 21,  6, '3',             FALSE, 0),
( 22,  6, '5',             FALSE, 1),
( 23,  6, '7',             TRUE,  2),
( 24,  6, '8',             FALSE, 3),
-- ── Q7: discriminant of x²-4x+3 → b²-4ac = 16-12 = 4 ────────
( 25,  7, '4',             TRUE,  0),
( 26,  7, '0',             FALSE, 1),
( 27,  7, '16',            FALSE, 2),
( 28,  7, '8',             FALSE, 3),
-- ── Q8: factor x²+7x+12 ──────────────────────────────────────
( 29,  8, '(x+3)(x+4)',    TRUE,  0),
( 30,  8, '(x+2)(x+6)',    FALSE, 1),
( 31,  8, '(x+1)(x+12)',   FALSE, 2),
( 32,  8, '(x+6)(x+2)',    FALSE, 3),
-- ── Q9: inverse of f(x)=2x-6 ─────────────────────────────────
( 33,  9, 'f⁻¹(x) = (x+6)/2',  TRUE,  0),
( 34,  9, 'f⁻¹(x) = 2x+6',     FALSE, 1),
( 35,  9, 'f⁻¹(x) = x/2 - 6',  FALSE, 2),
( 36,  9, 'f⁻¹(x) = (x-6)/2',  FALSE, 3),
-- ── Q10: (x³·x²)/x⁴ = x ──────────────────────────────────────
( 37, 10, 'x',             TRUE,  0),
( 38, 10, 'x²',            FALSE, 1),
( 39, 10, 'x⁵',            FALSE, 2),
( 40, 10, '1',             FALSE, 3),

-- ── Q11 (quiz 3): sum of triangle angles = 180° ───────────────
( 41, 11, '90°',           FALSE, 0),
( 42, 11, '180°',          TRUE,  1),
( 43, 11, '270°',          FALSE, 2),
( 44, 11, '360°',          FALSE, 3),
-- ── Q12: area 8×5 = 40 cm² ───────────────────────────────────
( 45, 12, '26 cm²',        FALSE, 0),
( 46, 12, '40 cm²',        TRUE,  1),
( 47, 12, '13 cm²',        FALSE, 2),
( 48, 12, '80 cm²',        FALSE, 3),
-- ── Q13: hexagon has 6 sides ──────────────────────────────────
( 49, 13, '5',             FALSE, 0),
( 50, 13, '7',             FALSE, 1),
( 51, 13, '6',             TRUE,  2),
( 52, 13, '8',             FALSE, 3),
-- ── Q14: circumference r=7 ≈ 43.96 cm ────────────────────────
( 53, 14, '21.98 cm',      FALSE, 0),
( 54, 14, '43.96 cm',      TRUE,  1),
( 55, 14, '153.94 cm',     FALSE, 2),
( 56, 14, '14 cm',         FALSE, 3),
-- ── Q15: parallel lines ───────────────────────────────────────
( 57, 15, 'Perpendicular', FALSE, 0),
( 58, 15, 'Intersecting',  FALSE, 1),
( 59, 15, 'Parallel',      TRUE,  2),
( 60, 15, 'Concurrent',    FALSE, 3),

-- ── Q16 (quiz 4): volume cube 4cm = 64 cm³ ───────────────────
( 61, 16, '16 cm³',        FALSE, 0),
( 62, 16, '48 cm³',        FALSE, 1),
( 63, 16, '64 cm³',        TRUE,  2),
( 64, 16, '32 cm³',        FALSE, 3),
-- ── Q17: area circle d=10 ≈ 78.5 cm² ─────────────────────────
( 65, 17, '31.4 cm²',      FALSE, 0),
( 66, 17, '78.5 cm²',      TRUE,  1),
( 67, 17, '314 cm²',       FALSE, 2),
( 68, 17, '157 cm²',       FALSE, 3),
-- ── Q18: angle in semicircle = 90° ───────────────────────────
( 69, 18, '45°',           FALSE, 0),
( 70, 18, '60°',           FALSE, 1),
( 71, 18, '90°',           TRUE,  2),
( 72, 18, '180°',          FALSE, 3),
-- ── Q19: surface area sphere r=3 ≈ 113.04 cm² ────────────────
( 73, 19, '28.26 cm²',     FALSE, 0),
( 74, 19, '113.04 cm²',    TRUE,  1),
( 75, 19, '37.68 cm²',     FALSE, 2),
( 76, 19, '56.52 cm²',     FALSE, 3),
-- ── Q20: tangent definition ───────────────────────────────────
( 77, 20, 'A line passing through the centre',                   FALSE, 0),
( 78, 20, 'A chord that bisects the circle',                     FALSE, 1),
( 79, 20, 'A line that touches the circle at exactly one point', TRUE,  2),
( 80, 20, 'A line that crosses the circle at two points',        FALSE, 3),

-- ── Q21 (quiz 5): capital of France ──────────────────────────
( 81, 21, 'Berlin',        FALSE, 0),
( 82, 21, 'Madrid',        FALSE, 1),
( 83, 21, 'Paris',         TRUE,  2),
( 84, 21, 'Rome',          FALSE, 3),
-- ── Q22: largest continent = Asia ────────────────────────────
( 85, 22, 'Africa',        FALSE, 0),
( 86, 22, 'North America', FALSE, 1),
( 87, 22, 'Asia',          TRUE,  2),
( 88, 22, 'Europe',        FALSE, 3),
-- ── Q23: longest river = Nile ────────────────────────────────
( 89, 23, 'Amazon',        FALSE, 0),
( 90, 23, 'Mississippi',   FALSE, 1),
( 91, 23, 'Nile',          TRUE,  2),
( 92, 23, 'Yangtze',       FALSE, 3),
-- ── Q24: largest population = India ──────────────────────────
( 93, 24, 'USA',           FALSE, 0),
( 94, 24, 'India',         TRUE,  1),
( 95, 24, 'China',         FALSE, 2),
( 96, 24, 'Russia',        FALSE, 3),
-- ── Q25: Sahara → Africa ─────────────────────────────────────
( 97, 25, 'Asia',          FALSE, 0),
( 98, 25, 'South America', FALSE, 1),
( 99, 25, 'Africa',        TRUE,  2),
(100, 25, 'Australia',     FALSE, 3),

-- ── Q26 (quiz 6): convergent boundary ────────────────────────
(101, 26, 'Transform',     FALSE, 0),
(102, 26, 'Divergent',     FALSE, 1),
(103, 26, 'Convergent',    TRUE,  2),
(104, 26, 'Parallel',      FALSE, 3),
-- ── Q27: Gulf Stream = ocean current ─────────────────────────
(105, 27, 'A wind pattern',    FALSE, 0),
(106, 27, 'An ocean current',  TRUE,  1),
(107, 27, 'A mountain range',  FALSE, 2),
(108, 27, 'A tectonic fault',  FALSE, 3),
-- ── Q28: Mediterranean climate ───────────────────────────────
(109, 28, 'Tropical',      FALSE, 0),
(110, 28, 'Continental',   FALSE, 1),
(111, 28, 'Mediterranean', TRUE,  2),
(112, 28, 'Polar',         FALSE, 3),
-- ── Q29: axial tilt causes seasons ───────────────────────────
(113, 29, 'Earth''s varying distance from the Sun', FALSE, 0),
(114, 29, 'Earth''s axial tilt',                    TRUE,  1),
(115, 29, 'The Moon''s gravitational pull',          FALSE, 2),
(116, 29, 'Solar flares',                            FALSE, 3),
-- ── Q30: deepest point = Pacific ─────────────────────────────
(117, 30, 'The Atlantic Ocean', FALSE, 0),
(118, 30, 'The Indian Ocean',   FALSE, 1),
(119, 30, 'The Arctic Ocean',   FALSE, 2),
(120, 30, 'The Pacific Ocean',  TRUE,  3),

-- ── Q31 (quiz 7): carbon protons = 6 ─────────────────────────
(121, 31, '4',             FALSE, 0),
(122, 31, '6',             TRUE,  1),
(123, 31, '8',             FALSE, 2),
(124, 31, '12',            FALSE, 3),
-- ── Q32: Au = Gold ───────────────────────────────────────────
(125, 32, 'Silver',        FALSE, 0),
(126, 32, 'Aluminium',     FALSE, 1),
(127, 32, 'Gold',          TRUE,  2),
(128, 32, 'Copper',        FALSE, 3),
-- ── Q33: most abundant in atmosphere = Nitrogen ──────────────
(129, 33, 'Oxygen',            FALSE, 0),
(130, 33, 'Carbon dioxide',    FALSE, 1),
(131, 33, 'Argon',             FALSE, 2),
(132, 33, 'Nitrogen',          TRUE,  3),
-- ── Q34: atomic number = proton count ────────────────────────
(133, 34, 'The number of neutrons',                       FALSE, 0),
(134, 34, 'The number of electrons in the outer shell',   FALSE, 1),
(135, 34, 'The number of protons',                        TRUE,  2),
(136, 34, 'The atomic mass',                              FALSE, 3),
-- ── Q35: noble gas = Neon ────────────────────────────────────
(137, 35, 'Chlorine',      FALSE, 0),
(138, 35, 'Hydrogen',      FALSE, 1),
(139, 35, 'Neon',          TRUE,  2),
(140, 35, 'Sodium',        FALSE, 3),

-- ── Q36 (quiz 8): covalent bond ──────────────────────────────
(141, 36, 'Ionic bond',     FALSE, 0),
(142, 36, 'Covalent bond',  TRUE,  1),
(143, 36, 'Metallic bond',  FALSE, 2),
(144, 36, 'Hydrogen bond',  FALSE, 3),
-- ── Q37: limiting reagent = O₂ ───────────────────────────────
(145, 37, 'H₂',            FALSE, 0),
(146, 37, 'O₂',            TRUE,  1),
(147, 37, 'H₂O',           FALSE, 2),
(148, 37, 'Neither',       FALSE, 3),
-- ── Q38: pH neutral = 7 ──────────────────────────────────────
(149, 38, '0',             FALSE, 0),
(150, 38, '7',             TRUE,  1),
(151, 38, '14',            FALSE, 2),
(152, 38, '1',             FALSE, 3),
-- ── Q39: exothermic = releases heat ──────────────────────────
(153, 39, 'It absorbs heat from the surroundings',         FALSE, 0),
(154, 39, 'It produces a gas only',                        FALSE, 1),
(155, 39, 'It releases heat to the surroundings',          TRUE,  2),
(156, 39, 'It occurs only in acidic conditions',           FALSE, 3),
-- ── Q40: molar mass H₂O ≈ 18 g/mol ──────────────────────────
(157, 40, '10 g/mol',      FALSE, 0),
(158, 40, '16 g/mol',      FALSE, 1),
(159, 40, '18 g/mol',      TRUE,  2),
(160, 40, '20 g/mol',      FALSE, 3),

-- ── Q41 (quiz 9): Newton's First Law ─────────────────────────
(161, 41, 'Accelerate unless a force acts on it',                      FALSE, 0),
(162, 41, 'Remain at rest unless acted upon by a net force',           TRUE,  1),
(163, 41, 'Always move in a circle',                                   FALSE, 2),
(164, 41, 'Lose velocity over time due to gravity',                    FALSE, 3),
-- ── Q42: a = Δv/Δt = 20/4 = 5 m/s² ──────────────────────────
(165, 42, '4 m/s²',        FALSE, 0),
(166, 42, '5 m/s²',        TRUE,  1),
(167, 42, '80 m/s²',       FALSE, 2),
(168, 42, '10 m/s²',       FALSE, 3),
-- ── Q43: unit of force = Newton ──────────────────────────────
(169, 43, 'Joule',         FALSE, 0),
(170, 43, 'Watt',          FALSE, 1),
(171, 43, 'Newton',        TRUE,  2),
(172, 43, 'Pascal',        FALSE, 3),
-- ── Q44: p = mv = 10×3 = 30 kg·m/s ──────────────────────────
(173, 44, '3.3 kg·m/s',   FALSE, 0),
(174, 44, '13 kg·m/s',    FALSE, 1),
(175, 44, '30 kg·m/s',    TRUE,  2),
(176, 44, '0.3 kg·m/s',   FALSE, 3),
-- ── Q45: scalar quantity = Speed ─────────────────────────────
(177, 45, 'Velocity',      FALSE, 0),
(178, 45, 'Force',         FALSE, 1),
(179, 45, 'Speed',         TRUE,  2),
(180, 45, 'Acceleration',  FALSE, 3),

-- ── Q46 (quiz 10): conservation of energy ────────────────────
(181, 46, 'Newton''s Second Law',             FALSE, 0),
(182, 46, 'The Law of Conservation of Energy', TRUE, 1),
(183, 46, 'Ohm''s Law',                       FALSE, 2),
(184, 46, 'Boyle''s Law',                     FALSE, 3),
-- ── Q47: f = 1/T = 1/0.02 = 50 Hz ───────────────────────────
(185, 47, '2 Hz',          FALSE, 0),
(186, 47, '20 Hz',         FALSE, 1),
(187, 47, '50 Hz',         TRUE,  2),
(188, 47, '100 Hz',        FALSE, 3),
-- ── Q48: mechanical wave needs medium ────────────────────────
(189, 48, 'Electromagnetic wave', FALSE, 0),
(190, 48, 'Light wave',           FALSE, 1),
(191, 48, 'Mechanical wave',      TRUE,  2),
(192, 48, 'Radio wave',           FALSE, 3),
-- ── Q49: W = F×d = 10×5 = 50 J ───────────────────────────────
(193, 49, '2 J',           FALSE, 0),
(194, 49, '15 J',          FALSE, 1),
(195, 49, '50 J',          TRUE,  2),
(196, 49, '0.5 J',         FALSE, 3),
-- ── Q50: shortest wavelength = Gamma rays ────────────────────
(197, 50, 'Radio waves',   FALSE, 0),
(198, 50, 'Infrared',      FALSE, 1),
(199, 50, 'Visible light', FALSE, 2),
(200, 50, 'Gamma rays',    TRUE,  3),

-- ── Q51 (quiz 11): powerhouse = Mitochondria ─────────────────
(201, 51, 'Nucleus',                  FALSE, 0),
(202, 51, 'Ribosome',                 FALSE, 1),
(203, 51, 'Mitochondria',             TRUE,  2),
(204, 51, 'Vacuole',                  FALSE, 3),
-- ── Q52: cell membrane controls entry/exit ───────────────────
(205, 52, 'Cell wall',                FALSE, 0),
(206, 52, 'Golgi apparatus',          FALSE, 1),
(207, 52, 'Cell membrane',            TRUE,  2),
(208, 52, 'Endoplasmic reticulum',    FALSE, 3),
-- ── Q53: DNA mainly in Nucleus ───────────────────────────────
(209, 53, 'Mitochondria',             FALSE, 0),
(210, 53, 'Nucleus',                  TRUE,  1),
(211, 53, 'Ribosome',                 FALSE, 2),
(212, 53, 'Lysosome',                 FALSE, 3),
-- ── Q54: chloroplast is plant-only ───────────────────────────
(213, 54, 'Mitochondria',             FALSE, 0),
(214, 54, 'Cell membrane',            FALSE, 1),
(215, 54, 'Chloroplast',              TRUE,  2),
(216, 54, 'Nucleus',                  FALSE, 3),
-- ── Q55: photosynthesis ──────────────────────────────────────
(217, 55, 'Respiration',              FALSE, 0),
(218, 55, 'Transpiration',            FALSE, 1),
(219, 55, 'Photosynthesis',           TRUE,  2),
(220, 55, 'Fermentation',             FALSE, 3),

-- ── Q56 (quiz 12): DNA monomers = Nucleotides ────────────────
(221, 56, 'Amino acids',              FALSE, 0),
(222, 56, 'Nucleotides',              TRUE,  1),
(223, 56, 'Fatty acids',              FALSE, 2),
(224, 56, 'Monosaccharides',          FALSE, 3),
-- ── Q57: Aa × Aa → ¼ aa ─────────────────────────────────────
(225, 57, '1/2',                      FALSE, 0),
(226, 57, '1/4',                      TRUE,  1),
(227, 57, '3/4',                      FALSE, 2),
(228, 57, '0',                        FALSE, 3),
-- ── Q58: natural selection = Darwin ──────────────────────────
(229, 58, 'Gregor Mendel',            FALSE, 0),
(230, 58, 'Louis Pasteur',            FALSE, 1),
(231, 58, 'Charles Darwin',           TRUE,  2),
(232, 58, 'James Watson',             FALSE, 3),
-- ── Q59: DNA sequence change = Mutation ──────────────────────
(233, 59, 'Mitosis',                  FALSE, 0),
(234, 59, 'Mutation',                 TRUE,  1),
(235, 59, 'Meiosis',                  FALSE, 2),
(236, 59, 'Transcription',            FALSE, 3),
-- ── Q60: human chromosomes = 46 ──────────────────────────────
(237, 60, '23',                       FALSE, 0),
(238, 60, '44',                       FALSE, 1),
(239, 60, '46',                       TRUE,  2),
(240, 60, '48',                       FALSE, 3);

SELECT setval('answer_options_id_seq', (SELECT MAX(id) FROM answer_options));


-- ============================================================
-- QUIZ_ATTEMPTS
--  REQ 5.4 — User_67 (user_id = 1) has four recorded attempts.
--  These correspond to DEFAULT_QUIZ_HISTORY in the frontend.
-- ============================================================

INSERT INTO quiz_attempts (id, user_id, quiz_id, score, completed_at) VALUES
(1,  1,  1,  98,  '2025-04-20 14:22:00'),  -- Algebra Fundamentals
(2,  1,  5,  90,  '2025-04-15 09:45:00'),  -- World Geography Essentials
(3,  1,  9, 135,  '2025-04-10 17:03:00'),  -- Physics: Forces & Motion
(4,  1, 11,  90,  '2025-04-05 11:30:00');  -- Biology: Cells & Life

-- NPC attempts (representative samples to justify leaderboard standings)
INSERT INTO quiz_attempts (id, user_id, quiz_id, score, completed_at) VALUES
( 5,  3,  7, 168, '2025-04-03 10:00:00'),  -- SciencePro – Atoms & Elements
( 6,  3,  8, 220, '2025-04-22 09:00:00'),  -- SciencePro – Chemical Reactions
( 7,  4,  1, 112, '2025-04-10 08:00:00'),  -- MathWiz    – Algebra Fundamentals
( 8,  4,  2, 210, '2025-04-14 08:00:00'),  -- MathWiz    – Advanced Algebra
( 9,  5,  9, 175, '2025-04-07 12:00:00'),  -- PhysicsGuru– Forces & Motion
(10,  5, 10, 228, '2025-04-22 12:00:00'),  -- PhysicsGuru– Energy & Waves
(11,  6,  7, 155, '2025-04-03 11:00:00'),  -- ChemWiz    – Atoms & Elements
(12,  6,  8, 235, '2025-04-21 11:00:00'),  -- ChemWiz    – Chemical Reactions
(13,  7, 11, 105, '2025-04-03 14:00:00'),  -- BioNerd    – Cells & Life
(14,  7, 12, 172, '2025-04-19 14:00:00'),  -- BioNerd    – Genetics
(15,  8,  3, 108, '2025-04-08 15:00:00'),  -- GeoGenius  – Geometry Basics
(16,  8,  4, 165, '2025-04-12 15:00:00'),  -- GeoGenius  – Circles & Solids
(17,  9,  1, 104, '2025-04-10 09:00:00'),  -- AlgebraKing– Algebra Fundamentals
(18,  9,  2, 225, '2025-04-14 09:00:00'),  -- AlgebraKing– Advanced Algebra
(19, 10,  5,  98, '2025-04-05 16:00:00'),  -- WorldExplorer– World Geography
(20, 10,  6, 158, '2025-04-18 16:00:00'),  -- WorldExplorer– Physical Geography
(21, 11,  1,  90, '2025-04-10 10:00:00'),  -- QuizKing   – Algebra Fundamentals
(22, 11,  5,  76, '2025-04-05 10:00:00'),  -- QuizKing   – World Geography
(23, 12,  1,  82, '2025-04-10 11:00:00'),  -- LevR       – Algebra Fundamentals
(24, 12,  3,  85, '2025-04-08 11:00:00'),  -- LevR       – Geometry Basics
(25, 12,  5,  70, '2025-04-05 11:00:00'),  -- LevR       – World Geography
(26, 12,  7, 115, '2025-04-03 11:00:00');  -- LevR       – Atoms & Elements

SELECT setval('quiz_attempts_id_seq', (SELECT MAX(id) FROM quiz_attempts));


-- ============================================================
-- GLOBAL_LEADERBOARD
--  REQ 6.1 — all users ranked by total accumulated points.
--  REQ 6.4 — equal scores would be broken by updated_at;
--             no ties exist in seed data.
-- ============================================================

INSERT INTO global_leaderboard (id, user_id, total_points, rank, updated_at) VALUES
( 1,  3, 1380,  1, '2025-04-22 09:00:00'),
( 2,  4, 1245,  2, '2025-04-14 08:00:00'),
( 3,  5, 1120,  3, '2025-04-22 12:00:00'),
( 4,  6, 1058,  4, '2025-04-21 11:00:00'),
( 5,  7,  980,  5, '2025-04-19 14:00:00'),
( 6,  8,  912,  6, '2025-04-12 15:00:00'),
( 7,  9,  855,  7, '2025-04-14 09:00:00'),
( 8, 10,  790,  8, '2025-04-18 16:00:00'),
( 9,  1,  728,  9, '2025-04-20 14:22:00'),
(10, 11,  651, 10, '2025-04-10 10:00:00');

SELECT setval('global_leaderboard_id_seq', (SELECT MAX(id) FROM global_leaderboard));


-- ============================================================
-- CATEGORY_LEADERBOARDS
--  REQ 6.1 — separate leaderboard per category.
-- ============================================================

INSERT INTO category_leaderboards (id, category_id, user_id, total_points, rank) VALUES
-- ── Category 1: Algebra ───────────────────────────────────────
( 1, 1,  9, 329, 1),   -- AlgebraKing
( 2, 1,  4, 314, 2),   -- MathWiz
( 3, 1,  3, 295, 3),   -- SciencePro
( 4, 1,  1, 276, 4),   -- User_67
( 5, 1, 11, 250, 5),   -- QuizKing
-- ── Category 2: Geometry ─────────────────────────────────────
( 6, 2,  8, 273, 1),   -- GeoGenius
( 7, 2,  4, 255, 2),   -- MathWiz
( 8, 2,  3, 240, 3),   -- SciencePro
( 9, 2,  9, 228, 4),   -- AlgebraKing
(10, 2,  1, 207, 5),   -- User_67
-- ── Category 3: Geography ────────────────────────────────────
(11, 3, 10, 256, 1),   -- WorldExplorer
(12, 3,  8, 238, 2),   -- GeoGenius
(13, 3,  3, 220, 3),   -- SciencePro
(14, 3,  1, 208, 4),   -- User_67
(15, 3, 11, 181, 5),   -- QuizKing
-- ── Category 4: Chemistry ────────────────────────────────────
(16, 4,  6, 390, 1),   -- ChemWiz
(17, 4,  3, 368, 2),   -- SciencePro
(18, 4,  9, 340, 3),   -- AlgebraKing
(19, 4,  4, 325, 4),   -- MathWiz
(20, 4,  1, 296, 5),   -- User_67
-- ── Category 5: Physics ──────────────────────────────────────
(21, 5,  5, 403, 1),   -- PhysicsGuru
(22, 5,  3, 374, 2),   -- SciencePro
(23, 5,  6, 317, 3),   -- ChemWiz
(24, 5,  9, 300, 4),   -- AlgebraKing
(25, 5,  1, 278, 5),   -- User_67
-- ── Category 6: Biology ──────────────────────────────────────
(26, 6,  7, 277, 1),   -- BioNerd
(27, 6,  3, 255, 2),   -- SciencePro
(28, 6,  6, 227, 3),   -- ChemWiz
(29, 6,  1, 222, 4),   -- User_67
(30, 6,  5, 193, 5);   -- PhysicsGuru

SELECT setval('category_leaderboards_id_seq', (SELECT MAX(id) FROM category_leaderboards));


-- ============================================================
-- QUIZ_LEADERBOARDS
--  REQ 5.5 — only best score per user per quiz is tracked here.
--  REQ 6.1 — individual quiz leaderboard.
--  REQ 6.4 — achieved_at for tie-breaking.
-- ============================================================

INSERT INTO quiz_leaderboards (id, quiz_id, user_id, best_score, rank, achieved_at) VALUES
-- ── Quiz 1: Algebra Fundamentals ──────────────────────────────
( 1,  1,  4, 112, 1, '2025-04-10 08:00:00'),  -- MathWiz
( 2,  1,  9, 104, 2, '2025-04-10 09:00:00'),  -- AlgebraKing
( 3,  1,  1,  98, 3, '2025-04-20 14:22:00'),  -- User_67
( 4,  1, 11,  90, 4, '2025-04-10 10:00:00'),  -- QuizKing
( 5,  1, 12,  82, 5, '2025-04-10 11:00:00'),  -- LevR
-- ── Quiz 2: Advanced Algebra Challenge ────────────────────────
( 6,  2,  9, 225, 1, '2025-04-14 09:00:00'),  -- AlgebraKing
( 7,  2,  4, 210, 2, '2025-04-14 08:00:00'),  -- MathWiz
( 8,  2,  3, 195, 3, '2025-04-14 10:00:00'),  -- SciencePro
( 9,  2,  1, 178, 4, '2025-04-14 11:00:00'),  -- User_67
(10,  2, 11, 160, 5, '2025-04-14 12:00:00'),  -- QuizKing
-- ── Quiz 3: Geometry Basics ────────────────────────────────────
(11,  3,  8, 108, 1, '2025-04-08 15:00:00'),  -- GeoGenius
(12,  3,  4,  99, 2, '2025-04-08 09:00:00'),  -- MathWiz
(13,  3,  1,  92, 3, '2025-04-08 10:00:00'),  -- User_67
(14,  3, 12,  85, 4, '2025-04-08 11:00:00'),  -- LevR
(15,  3, 11,  78, 5, '2025-04-08 12:00:00'),  -- QuizKing
-- ── Quiz 4: Geometry: Circles & Solids ────────────────────────
(16,  4,  8, 165, 1, '2025-04-12 15:00:00'),  -- GeoGenius
(17,  4,  3, 152, 2, '2025-04-12 10:00:00'),  -- SciencePro
(18,  4,  9, 140, 3, '2025-04-12 09:00:00'),  -- AlgebraKing
(19,  4,  4, 128, 4, '2025-04-12 08:00:00'),  -- MathWiz
(20,  4,  1, 115, 5, '2025-04-12 11:00:00'),  -- User_67
-- ── Quiz 5: World Geography Essentials ────────────────────────
(21,  5, 10,  98, 1, '2025-04-05 16:00:00'),  -- WorldExplorer
(22,  5,  1,  90, 2, '2025-04-15 09:45:00'),  -- User_67
(23,  5,  8,  83, 3, '2025-04-05 15:00:00'),  -- GeoGenius
(24,  5, 11,  76, 4, '2025-04-05 10:00:00'),  -- QuizKing
(25,  5, 12,  70, 5, '2025-04-05 11:00:00'),  -- LevR
-- ── Quiz 6: Physical Geography Deep Dive ──────────────────────
(26,  6, 10, 158, 1, '2025-04-18 16:00:00'),  -- WorldExplorer
(27,  6,  8, 144, 2, '2025-04-18 15:00:00'),  -- GeoGenius
(28,  6,  3, 130, 3, '2025-04-18 10:00:00'),  -- SciencePro
(29,  6,  1, 118, 4, '2025-04-18 11:00:00'),  -- User_67
(30,  6, 11, 105, 5, '2025-04-18 12:00:00'),  -- QuizKing
-- ── Quiz 7: Chemistry: Atoms & Elements ───────────────────────
(31,  7,  3, 168, 1, '2025-04-03 10:00:00'),  -- SciencePro
(32,  7,  6, 155, 2, '2025-04-03 11:00:00'),  -- ChemWiz
(33,  7,  4, 140, 3, '2025-04-03 08:00:00'),  -- MathWiz
(34,  7,  1, 128, 4, '2025-04-03 12:00:00'),  -- User_67
(35,  7, 12, 115, 5, '2025-04-03 11:00:00'),  -- LevR
-- ── Quiz 8: Chemical Reactions & Bonding ──────────────────────
(36,  8,  6, 235, 1, '2025-04-21 11:00:00'),  -- ChemWiz
(37,  8,  3, 220, 2, '2025-04-22 09:00:00'),  -- SciencePro
(38,  8,  9, 200, 3, '2025-04-21 09:00:00'),  -- AlgebraKing
(39,  8,  4, 185, 4, '2025-04-21 08:00:00'),  -- MathWiz
(40,  8,  1, 168, 5, '2025-04-21 12:00:00'),  -- User_67
-- ── Quiz 9: Physics: Forces & Motion ──────────────────────────
(41,  9,  5, 175, 1, '2025-04-07 12:00:00'),  -- PhysicsGuru
(42,  9,  3, 162, 2, '2025-04-07 10:00:00'),  -- SciencePro
(43,  9,  4, 148, 3, '2025-04-07 08:00:00'),  -- MathWiz
(44,  9,  1, 135, 4, '2025-04-10 17:03:00'),  -- User_67
(45,  9,  6, 122, 5, '2025-04-07 11:00:00'),  -- ChemWiz
-- ── Quiz 10: Physics: Energy & Waves ──────────────────────────
(46, 10,  5, 228, 1, '2025-04-22 12:00:00'),  -- PhysicsGuru
(47, 10,  3, 212, 2, '2025-04-22 09:00:00'),  -- SciencePro
(48, 10,  6, 195, 3, '2025-04-22 11:00:00'),  -- ChemWiz
(49, 10,  9, 180, 4, '2025-04-22 09:00:00'),  -- AlgebraKing
(50, 10,  1, 165, 5, '2025-04-22 10:00:00'),  -- User_67
-- ── Quiz 11: Biology: Cells & Life ────────────────────────────
(51, 11,  7, 105, 1, '2025-04-03 14:00:00'),  -- BioNerd
(52, 11,  3,  97, 2, '2025-04-03 10:00:00'),  -- SciencePro
(53, 11,  1,  90, 3, '2025-04-05 11:30:00'),  -- User_67
(54, 11,  6,  82, 4, '2025-04-03 11:00:00'),  -- ChemWiz
(55, 11, 10,  75, 5, '2025-04-03 16:00:00'),  -- WorldExplorer
-- ── Quiz 12: Biology: Genetics & Evolution ────────────────────
(56, 12,  7, 172, 1, '2025-04-19 14:00:00'),  -- BioNerd
(57, 12,  3, 158, 2, '2025-04-19 10:00:00'),  -- SciencePro
(58, 12,  6, 145, 3, '2025-04-19 11:00:00'),  -- ChemWiz
(59, 12,  1, 132, 4, '2025-04-19 12:00:00'),  -- User_67
(60, 12,  5, 118, 5, '2025-04-19 12:00:00');  -- PhysicsGuru

SELECT setval('quiz_leaderboards_id_seq', (SELECT MAX(id) FROM quiz_leaderboards));


-- ============================================================
-- VERIFICATION QUERIES  (uncomment to run after seeding)
-- ============================================================

-- SELECT 'users'               AS tbl, COUNT(*) FROM users;
-- SELECT 'categories'          AS tbl, COUNT(*) FROM categories;
-- SELECT 'quizzes'             AS tbl, COUNT(*) FROM quizzes;
-- SELECT 'questions'           AS tbl, COUNT(*) FROM questions;
-- SELECT 'answer_options'      AS tbl, COUNT(*) FROM answer_options;
-- SELECT 'quiz_attempts'       AS tbl, COUNT(*) FROM quiz_attempts;
-- SELECT 'global_leaderboard'  AS tbl, COUNT(*) FROM global_leaderboard;
-- SELECT 'category_leaderboards' AS tbl, COUNT(*) FROM category_leaderboards;
-- SELECT 'quiz_leaderboards'   AS tbl, COUNT(*) FROM quiz_leaderboards;

-- Verify every question has exactly one correct answer:
-- SELECT q.id, q.question_text, COUNT(ao.id) AS correct_count
-- FROM questions q
-- JOIN answer_options ao ON ao.question_id = q.id AND ao.is_correct = TRUE
-- GROUP BY q.id HAVING COUNT(ao.id) <> 1;

-- ============================================================
-- END OF database.sql
-- ============================================================
