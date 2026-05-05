/* ============================================================
   QUIZLER — middleware/auth.js
   JWT verification middleware.

   requireAuth   — rejects requests with no valid token (401)
   requireAdmin  — additionally rejects non-admin roles (403)
   ============================================================ */

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
