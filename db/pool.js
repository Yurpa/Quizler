/* ============================================================
   QUIZLER — db/pool.js
   PostgreSQL connection pool.  All queries in the app go
   through this single shared pool instance.
   ============================================================ */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render's managed PostgreSQL requires SSL in production
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = pool;
