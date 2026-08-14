import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipe, stripFences } from '../lib/parse.js';

const good = JSON.stringify({
  name: 'Smoky Paloma Sour',
  template: 'daiquiri',
  method: 'shaken',
  ingredients: [
    { name: 'mezcal', amount: 2, unit: 'oz' },
    { name: 'grapefruit juice', amount: 1, unit: 'oz' },
    { name: 'lime juice', amount: 0.5, unit: 'oz' },
  ],
  garnish: 'grapefruit peel',
  steps: 'Shake with ice, strain over fresh ice.',
  description: 'Bright and smoky, on the drier side.',
  balance_check: 'Backbone mezcal, acid from citrus, light sweet — balanced.',
});

test('parses a well-formed response', () => {
  const r = parseRecipe(good);
  assert.equal(r.name, 'Smoky Paloma Sour');
  assert.equal(r.method, 'shaken');
  assert.equal(r.ingredients.length, 3);
  assert.equal(r.ingredients[0].name, 'mezcal');
});

test('strips ```json markdown fences', () => {
  const fenced = '```json\n' + good + '\n```';
  const r = parseRecipe(fenced);
  assert.equal(r.name, 'Smoky Paloma Sour');
});

test('strips plain ``` fences', () => {
  const fenced = '```\n' + good + '\n```';
  assert.equal(parseRecipe(fenced).name, 'Smoky Paloma Sour');
});

test('throws on non-JSON', () => {
  assert.throws(() => parseRecipe('here is your drink!'), /not valid JSON/);
});

test('throws on empty input', () => {
  assert.throws(() => parseRecipe(''), /empty/);
});

test('throws on missing name', () => {
  const bad = JSON.stringify({ method: 'shaken', steps: 'x', ingredients: [{ name: 'gin', amount: 2, unit: 'oz' }] });
  assert.throws(() => parseRecipe(bad), /name/);
});

test('throws on invalid method', () => {
  const bad = JSON.stringify({ name: 'X', method: 'blended', steps: 'x', ingredients: [{ name: 'gin', amount: 2, unit: 'oz' }] });
  assert.throws(() => parseRecipe(bad), /invalid method/);
});

test('throws on empty ingredients', () => {
  const bad = JSON.stringify({ name: 'X', template: 'daiquiri', method: 'shaken', steps: 'x', ingredients: [] });
  assert.throws(() => parseRecipe(bad), /non-empty array/);
});

test('throws on ingredient with non-positive amount', () => {
  const bad = JSON.stringify({ name: 'X', template: 'daiquiri', method: 'shaken', steps: 'x', ingredients: [{ name: 'gin', amount: 0, unit: 'oz' }] });
  assert.throws(() => parseRecipe(bad), /invalid amount/);
});

// Not too concerned with validation here, main point is to parse absolutely necessary information.
test('tolerates missing optional fields (garnish/description/balance_check)', () => {
  const minimal = JSON.stringify({
    name: 'Plain', template: 'martini', method: 'stirred', steps: 'Stir.',
    ingredients: [{ name: 'gin', amount: 2, unit: 'oz' }],
  });
  const r = parseRecipe(minimal);
  assert.equal(r.garnish, '');
  assert.equal(r.description, '');
  assert.equal(r.balance_check, '');
});

test('stripFences leaves un-fenced text alone', () => {
  assert.equal(stripFences('{"a":1}'), '{"a":1}');
});

test('template is required', () => {
  const bad = JSON.stringify({ name: 'X', method: 'shaken', steps: 'x', ingredients: [{ name: 'gin', amount: 2, unit: 'oz' }] });
  assert.throws(() => parseRecipe(bad), /template/);
});

test('template must be one of the 6 valid families', () => {
  const bad = JSON.stringify({ name: 'X', template: 'tiki', method: 'shaken', steps: 'x', ingredients: [{ name: 'gin', amount: 2, unit: 'oz' }] });
  assert.throws(() => parseRecipe(bad), /is not one of the 6 valid families/);
});