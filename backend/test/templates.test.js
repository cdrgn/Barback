import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES } from '../data/templates.js';
import { INGREDIENTS } from '../data/ingredients.js';

const paletteNames = new Set(INGREDIENTS.map((i) => i.name));

test('there are exactly 6 root templates', () => {
  assert.equal(TEMPLATES.length, 6);
});

test('every canonical ingredient exists in the palette', () => {
  // If a template names an ingredient not in the palette, pouring that
  // classic would fail the recipe_ingredients foreign key. Catch it here.
  for (const t of TEMPLATES) {
    for (const ing of t.canonical.ingredients) {
      assert.ok(
        paletteNames.has(ing.name),
        `Template "${t.name}" uses "${ing.name}", which is not in the palette`
      );
    }
  }
});

test('every template has a valid balance_rule shape', () => {
  for (const t of TEMPLATES) {
    const r = t.balance_rule;
    assert.ok(Array.isArray(r.required), `${t.name}: required must be an array`);
    assert.ok(Array.isArray(r.forbidden), `${t.name}: forbidden must be an array`);
    assert.ok(typeof r.notes === 'string' && r.notes.length > 0, `${t.name}: notes required`);
  }
});

test('required and forbidden roles never overlap', () => {
  for (const t of TEMPLATES) {
    const req = new Set(t.balance_rule.required);
    for (const f of t.balance_rule.forbidden) {
      assert.ok(!req.has(f), `${t.name}: "${f}" is both required and forbidden`);
    }
  }
});

test('every template has canonical steps and a default method', () => {
  const methods = new Set(['stirred', 'shaken', 'built', 'none']);
  for (const t of TEMPLATES) {
    assert.ok(t.canonical.steps.length > 0, `${t.name}: missing steps`);
    assert.ok(methods.has(t.default_method), `${t.name}: bad method "${t.default_method}"`);
  }
});