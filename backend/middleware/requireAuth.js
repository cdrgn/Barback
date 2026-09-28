// Auth gate (Phase 2). Express middleware that runs BEFORE a protected route:
// it reads the Bearer token, verifies it, and attaches req.userId so the route
// knows who's asking. If the token is missing/invalid/expired, it responds 401
// and the route never runs.
//
// The important security property: the userId comes from the VERIFIED token,
// never from the request body. A client can't claim "I'm user 5" — it has to
// present a token we signed for user 5.
//
// This is a FACTORY: call makeRequireAuth(db) once at startup to get the actual
// middleware. It needs `db` so it can confirm the user still exists — a token can
// be perfectly valid (correct signature, not expired) while its user is gone
// (e.g. the DB was rebuilt in dev). Without this check that case slips through and
// fails later with a cryptic foreign-key error; with it, the host just gets a
// clean "sign in again".
import { verifyToken } from '../lib/auth.js';

// outer function
export function makeRequireAuth(db) {
  const findUserById = db.prepare('SELECT id FROM users WHERE id = ?'); // inner function references this (closure)

  // inner function
  return function requireAuth(req, res, next) {
    // Expected header: "Authorization: Bearer <token>"
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'not signed in' });
    }

    let userId;
    try {
      userId = verifyToken(token); // throws on bad/expired token
    } catch {
      return res.status(401).json({ error: 'session expired or invalid — please sign in again' });
    }

    // The token is genuine, but does its user still exist?
    if (!findUserById.get(userId)) {
      return res.status(401).json({ error: 'session expired or invalid — please sign in again' });
    }

    req.userId = userId;
    next(); // all good — continue to the route
  };
}