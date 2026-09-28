import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { makeRequireAuth } from '../middleware/requireAuth.js';
import { signToken } from '../lib/auth.js';
import { createUser } from '../db/queries.js';

process.env.JWT_SECRET = 'test-secret-not-for-production';

// Build a db with the schema + one real user, and return the middleware ready to call.
function setup() {
  const db = new Database(':memory:');
  db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  const userId = createUser(db, { email: 'user@test.com', passwordHash: 'hash' });
  return { middleware: makeRequireAuth(db), userId };
}

// Run the middleware against a fake req/res and report what happened.
function call(middleware, token) {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const out = { status: null, body: null, passed: false }; // record outcome
  const res = {
    status(c) { out.status = c; return this; },
    json(b) { out.body = b; },
  };
  middleware(req, res, () => { out.passed = true; }); // requireAuth adds userId property to req obj
  out.userId = req.userId;
  return out;
}

test('a valid token for an existing user passes through', () => {
  const { middleware, userId } = setup();
  const out = call(middleware, signToken(userId));
  assert.equal(out.passed, true);
  assert.equal(out.userId, userId, 'req.userId should be set from the token');
});

test('no token is rejected with 401', () => {
  const { middleware } = setup();
  const out = call(middleware, null);
  assert.equal(out.passed, false);
  assert.equal(out.status, 401);
});

test('a tampered token is rejected with 401', () => {
  const { middleware } = setup();
  const out = call(middleware, 'not.a.real.token');
  assert.equal(out.passed, false);
  assert.equal(out.status, 401);
});

test('a VALID token whose user no longer exists is rejected (orphaned token)', () => {
  const { middleware } = setup();
  // genuinely signed by us, but for a user id that was never created / was wiped
  const out = call(middleware, signToken(9999));
  assert.equal(out.passed, false, 'must not pass through — the user is gone');
  assert.equal(out.status, 401);
});