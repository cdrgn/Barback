import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRecipe } from '../lib/validator.js';

const template = {
  structure: [
    { role: 'spirit',    example: 'white rum',    amount: 2,    unit: 'oz' },
    { role: 'citrus',    example: 'lime juice',   amount: 0.75, unit: 'oz' },
    { role: 'sweetener', example: 'simple syrup', amount: 0.75, unit: 'oz' },
  ],
};

const palette = [
  { name: 'white rum',    category: 'spirit' },
  { name: 'mezcal',       category: 'spirit' },
  { name: 'lime juice',   category: 'citrus' },
  { name: 'simple syrup', category: 'sweetener' },
  { name: 'angostura bitters', category: 'bitter' },
];

test('a well-formed daiquiri passes', () => {
  const recipe = { ingredients: [
    { name: 'white rum', amount: 2, unit: 'oz' },
    { name: 'lime juice', amount: 0.75, unit: 'oz' },
    { name: 'simple syrup', amount: 0.75, unit: 'oz' },
  ]};
  const { valid, errors } = validateRecipe(recipe, template, palette);
  assert.equal(valid, true, errors.join('; '));
});

test('novelty within structure passes (mezcal instead of rum, extra bitters)', () => {
  const recipe = { ingredients: [
    { name: 'mezcal', amount: 2, unit: 'oz' },
    { name: 'lime juice', amount: 0.75, unit: 'oz' },
    { name: 'simple syrup', amount: 0.75, unit: 'oz' },
    { name: 'angostura bitters', amount: 2, unit: 'dash' },
  ]};
  const { valid } = validateRecipe(recipe, template, palette);
  assert.equal(valid, true);
});

test('missing a required role fails', () => {
  const recipe = { ingredients: [
    { name: 'white rum', amount: 2, unit: 'oz' },
    { name: 'lime juice', amount: 0.75, unit: 'oz' },
    // no sweetener
  ]};
  const { valid, errors } = validateRecipe(recipe, template, palette);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('missing required role: sweetener')));
});

test('an un-allowed ingredient fails', () => {
  const recipe = { ingredients: [
    { name: 'white rum', amount: 2, unit: 'oz' },
    { name: 'lime juice', amount: 0.75, unit: 'oz' },
    { name: 'unicorn tears', amount: 0.75, unit: 'oz' },
  ]};
  const { valid, errors } = validateRecipe(recipe, template, palette);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('not an allowed ingredient')));
});

test('collects multiple errors at once', () => {
  const recipe = { ingredients: [
    { name: 'unicorn tears', amount: 2, unit: 'oz' }, // not allowed + provides no role
  ]};
  const { valid, errors } = validateRecipe(recipe, template, palette);
  assert.equal(valid, false);
  assert.ok(errors.length >= 2, `expected several errors, got ${errors.length}`);
});