import { test } from 'node:test';
import assert from 'node:assert/strict';

// The auth toolkit reads JWT_SECRET from env — set one for the tests before importing.
process.env.JWT_SECRET = 'test-secret-not-for-production';

const { hashPassword, verifyPassword, signToken, verifyToken } = await import('../lib/auth.js');

test('hashPassword produces a hash that is NOT the raw password', async () => {
  const hash = await hashPassword('hunter2');
  assert.ok(hash, 'should return a hash');
  assert.notEqual(hash, 'hunter2', 'must never store the raw password');
  assert.ok(hash.length > 20, 'bcrypt hashes are long');
});

test('verifyPassword accepts the correct password', async () => {
  const hash = await hashPassword('correct horse');
  assert.equal(await verifyPassword('correct horse', hash), true);
});

test('verifyPassword rejects the wrong password', async () => {
  const hash = await hashPassword('correct horse');
  assert.equal(await verifyPassword('wrong horse', hash), false);
});

test('the same password hashed twice gives DIFFERENT hashes (random salt)', async () => {
  const a = await hashPassword('same');
  const b = await hashPassword('same');
  assert.notEqual(a, b, 'bcrypt salts each hash, so they differ');
  // ...but both still verify against the original password
  assert.equal(await verifyPassword('same', a), true);
  assert.equal(await verifyPassword('same', b), true);
});

test('signToken then verifyToken round-trips the userId', () => {
  const token = signToken(42);
  assert.ok(typeof token === 'string' && token.length > 0);
  assert.equal(verifyToken(token), 42);
});

test('verifyToken throws on a tampered token', () => {
  const token = signToken(1);
  const tampered = token.slice(0, -3) + 'xxx'; // corrupt the signature
  assert.throws(() => verifyToken(tampered));
});

test('verifyToken throws on a token signed with a different secret', () => {
  // simulate a forged token from someone who doesn't know our secret
  process.env.JWT_SECRET = 'attacker-secret'; // overwrite in-memory env var
  const forged = signToken(999);
  process.env.JWT_SECRET = 'test-secret-not-for-production';
  assert.throws(() => verifyToken(forged), 'a token signed with the wrong secret must be rejected');
});

test('hashPassword rejects an empty password', async () => {
  await assert.rejects(() => hashPassword(''));
});