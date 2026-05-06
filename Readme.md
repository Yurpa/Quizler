# Quizler — Educational Quiz Platform

DIP383 Software Engineering project.

## Running locally

### Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14 running locally

### 1. Install dependencies
```bash
npm install
```

### 2. Create the database
```bash
psql -U postgres -c "CREATE DATABASE quizler;"
psql -U postgres -d quizler -f database.sql
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env and set DATABASE_URL and JWT_SECRET
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Start the server
```bash
npm start          # production mode
npm run dev        # development mode with auto-restart (Node ≥ 18)
```

Open http://localhost:3000

### Default accounts
| Email | Password | Role |
|---|---|---|
| user@quizler.com | password123 | player |
| admin@quizler.com | admin12345 | admin |

---

## Deploying to Render.com

### Option A — One-click via render.yaml
1. Push this repository to GitHub.
2. Go to [render.com/dashboard](https://render.com/dashboard) → **New** → **Blueprint**.
3. Connect your GitHub repo. Render reads `render.yaml` and creates both the Web Service and the PostgreSQL database automatically.
4. After the first deploy, open the Web Service **Shell** tab and seed the database:
   ```bash
   psql $DATABASE_URL -f database.sql
   ```
5. Done. Your app is live at `https://quizler.onrender.com` (or similar).

### Option B — Manual setup
1. Push to GitHub.
2. **New** → **PostgreSQL** on Render. Copy the *Internal Database URL*.
3. **New** → **Web Service**:
   - Runtime: **Node**
   - Build command: `npm install`
   - Start command: `node server.js`
4. Under **Environment**, add:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | *(paste Internal Database URL)* |
   | `JWT_SECRET` | *(random hex string)* |
   | `NODE_ENV` | `production` |
5. Seed the database from the Shell tab:
   ```bash
   psql $DATABASE_URL -f database.sql
   ```

---

## Project structure

```
quizler/
├── public/              Frontend (HTML, CSS, JS)
│   ├── *.html
│   ├── css/
│   └── js/
│       └── api.js       Fetch wrapper for all API routes
├── routes/              Express route handlers
│   ├── auth.js          POST /api/auth/register|login|logout
│   ├── quizzes.js       GET /api/categories, /api/quizzes, /api/quizzes/:id
│   │                    POST /api/attempts
│   ├── leaderboards.js  GET /api/leaderboard/global|category|quiz
│   ├── profile.js       GET|PATCH /api/profile, GET /api/profile/history
│   └── admin.js         GET|POST|PUT|DELETE /api/admin/quizzes
├── middleware/
│   └── auth.js          JWT verification (requireAuth, requireAdmin)
├── db/
│   └── pool.js          pg.Pool singleton
├── database.sql         Full PostgreSQL schema + seed data
├── server.js            Express entry point
├── render.yaml          Render.com IaC blueprint
├── .env.example         Environment variable template
└── .gitignore
```

## API reference (summary)

| Method | Path | Description |
|---|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login, returns JWT |
| POST | /api/auth/logout  | Logout |
| GET | /api/auth/me  | Refresh user profile |
| GET | /api/categories  | All categories with quiz counts |
| GET | /api/quizzes | All quizzes (optional ?cat=) |
| GET | /api/quizzes/:id | Single quiz with questions |
| POST | /api/attempts | Submit quiz, returns score |
| GET | /api/leaderboard/global  | Global leaderboard |
| GET | /api/leaderboard/category/:id  | Category leaderboard |
| GET | /api/leaderboard/quiz/:id  | Per-quiz leaderboard |
| GET | /api/profile | User profile + stats |
| PATCH | /api/profile | Update email or password |
| GET | /api/profile/history  | Quiz attempt history |
| GET | /api/admin/quizzes  | All quizzes (admin view) |
| POST | /api/admin/quizzes  | Create quiz |
| PUT | /api/admin/quizzes/:id  | Edit quiz |
| DELETE | /api/admin/quizzes/:id  | Delete quiz |
