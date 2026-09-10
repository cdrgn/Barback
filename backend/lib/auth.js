// Auth toolkit (Phase 2). Four small functions, each one job:
//   hashPassword / verifyPassword  — bcrypt, so the DB never holds a raw password
//   signToken / verifyToken        — JWT, so a request can prove "I'm user N"
//
// Kept separate from routes and DB so the security-critical bits are isolated and
// unit-testable. Nothing here touches Express or SQLite.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// bcrypt "cost factor" — how many rounds of hashing. Higher = slower = harder to
// brute-force. 10 is a sane default (each hash ~50-100ms; attackers can't batch).
const SALT_ROUNDS = 10;

// How long a login stays valid before the user must log in again.
const TOKEN_TTL = '7d';

// The secret that signs tokens. If this leaks, anyone can forge a valid token for
// any user — so it lives in .env, treated like the API key. We throw loudly if
// it's missing rather than signing with a weak default.
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set (add a long random string to backend/.env)');
  return secret;
}

/**
 * Hash a raw password for storage. bcrypt generates a random salt internally and
 * embeds it in the output, so we don't manage salts separately — the salt travels
 * with the hash.
 * @param {string} raw  The plaintext password.
 * @returns {Promise<string>} the bcrypt hash to store in users.password_hash.
 */
export async function hashPassword(raw) {
  if (!raw) throw new Error('hashPassword: password is required');
  return bcrypt.hash(raw, SALT_ROUNDS);
}

/**
 * Check a login attempt against a stored hash. bcrypt re-derives the salt from the
 * stored hash, so we never compare raw strings — always hash-vs-hash.
 * @param {string} raw   The plaintext password from the login form.
 * @param {string} hash  The stored bcrypt hash.
 * @returns {Promise<boolean>} true if they match.
 */
export async function verifyPassword(raw, hash) {
  if (!raw || !hash) return false;
  return bcrypt.compare(raw, hash);
}

/**
 * Issue a signed token proving the holder is this user. The payload is minimal —
 * just the user id — because anything in a JWT is READABLE by the client (it's
 * signed, not encrypted). Never put secrets in it.
 * @param {number} userId
 * @returns {string} a signed JWT.
 */
export function signToken(userId) {
  if (userId == null) throw new Error('signToken: userId is required');
  return jwt.sign({ userId }, getSecret(), { expiresIn: TOKEN_TTL });
}

/**
 * Verify a token and pull the user id back out. Throws if the token is missing,
 * tampered with, or expired — the caller (auth middleware) turns that into a 401.
 * @param {string} token  The JWT from the Authorization header.
 * @returns {number} the userId the token was issued for.
 */
export function verifyToken(token) {
  if (!token) throw new Error('verifyToken: token is required');
  const payload = jwt.verify(token, getSecret()); // throws on bad/expired token
  return payload.userId;
}