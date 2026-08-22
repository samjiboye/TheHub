const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required and not set.");
}
const JWT_SECRET = process.env.JWT_SECRET;

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `Requires ${role} role` });
    }
    next();
  };
}

// Checks the is_admin flag on the token. Requires requireAuth to have run first,
// and the JWT to include isAdmin (set at login — see auth.js).
function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = { requireAuth, requireRole, requireAdmin, JWT_SECRET };
