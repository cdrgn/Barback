// Auth gate (Phase 2). Express middleware that runs BEFORE a protected route:
// it reads the Bearer token, verifies it, and attaches req.userId so the route
// knows who's asking. If the token is missing/invalid/expired, it responds 401
// and the route never runs.
//
// The important security property: the userId comes from the VERIFIED token,
// never from the request body. A client can't claim "I'm user 5" — it has to
// present a token we signed for user 5.
import { verifyToken } from '../lib/auth.js';

export function requireAuth(req, res, next) {
  // Expected header: "Authorization: Bearer <token>"
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'not signed in' });
  }

  try {
    req.userId = verifyToken(token); // throws on bad/expired token
    next();                          // token good — continue to the route
  } catch {
    return res.status(401).json({ error: 'session expired or invalid — please sign in again' });
  }
}