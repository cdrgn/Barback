import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAbv } from '../lib/abv.js';

test('Martini (stirred) lands ~28-32%', () => {
  const { abv } = calculateAbv([
    { amount: 2.5, unit: 'oz', abv: 40 },
    { amount: 0.5, unit: 'oz', abv: 18 },
  ], 'stirred');
  assert.ok(abv >= 28 && abv <= 32, `got ${abv}`);
});

test('Daiquiri (shaken) lands ~14-18%', () => {
  const { abv } = calculateAbv([
    { amount: 2,    unit: 'oz', abv: 40 },
    { amount: 1,    unit: 'oz', abv: 0 },
    { amount: 0.75, unit: 'oz', abv: 0 },
  ], 'shaken');
  assert.ok(abv >= 14 && abv <= 18, `got ${abv}`);
});

test('Highball (built) is low, ~9-13%', () => {
  const { abv } = calculateAbv([
    { amount: 1.5, unit: 'oz', abv: 40 },
    { amount: 4,   unit: 'oz', abv: 0 },
  ], 'built');
  assert.ok(abv >= 9 && abv <= 13, `got ${abv}`);
});

test('bitters dashes contribute alcohol but little volume', () => {
  const plain = calculateAbv([{ amount: 2, unit: 'oz', abv: 40 }], 'stirred');
  const withBitters = calculateAbv([
    { amount: 2, unit: 'oz', abv: 40 },
    { amount: 4, unit: 'dash', abv: 44 },
  ], 'stirred');
  assert.ok(withBitters.abv >= plain.abv, 'bitters should not lower abv');
  assert.ok(Math.abs(withBitters.abv - plain.abv) < 2, 'effect should be small');
});

test('zero-alcohol mocktail returns 0', () => {
  const { abv } = calculateAbv([
    { amount: 2, unit: 'oz', abv: 0 },
    { amount: 4, unit: 'oz', abv: 0 },
  ], 'built');
  assert.equal(abv, 0);
});

test('unknown unit throws (fail loud, not silently wrong)', () => {
  assert.throws(() => calculateAbv([{ amount: 1, unit: 'glug', abv: 40 }]));
});

test('missing method throws (required, no silent default)', () => {
  assert.throws(() => calculateAbv([{ amount: 2, unit: 'oz', abv: 40 }]));
});