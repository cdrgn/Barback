import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES } from '../data/templates.js';
import { INGREDIENTS } from '../data/ingredients.js';

const paletteNames = new Set(INGREDIENTS.map((i) => i.name));

test('there are exactly 6 root templates', () => {
  assert.equal(TEMPLATES.length, 6);
});

test('every structure example ingredient exists in the palette', () => {
  // Each structure entry's `example` is used to pour the classic, becoming a
  // recipe_ingredients row (FK to ingredients). A bad name would fail that pour.
  for (const t of TEMPLATES) {
    for (const s of t.structure) {
      assert.ok(
        paletteNames.has(s.example),
        `Template "${t.name}" example "${s.example}" is not in the palette`
      );
    }
  }
});

test('every structure entry has role, example, amount, unit', () => {
  const units = new Set(['oz', 'ml', 'dash', 'barspoon', 'tsp', 'splash', 'whole']);
  for (const t of TEMPLATES) {
    assert.ok(Array.isArray(t.structure) && t.structure.length > 0, `${t.name}: structure must be a non-empty array`);
    for (const s of t.structure) {
      assert.ok(typeof s.role === 'string' && s.role, `${t.name}: entry missing role`);
      assert.ok(typeof s.example === 'string' && s.example, `${t.name}: entry missing example`);
      assert.ok(typeof s.amount === 'number' && s.amount > 0, `${t.name}: entry bad amount`);
      assert.ok(units.has(s.unit), `${t.name}: entry bad unit "${s.unit}"`);
    }
  }
});

test("every structure's first entry is the backbone spirit or fortified base", () => {
  for (const t of TEMPLATES) {
    const first = t.structure[0].role;
    assert.ok(['spirit', 'fortified'].includes(first), `${t.name}: backbone should be spirit/fortified, got "${first}"`);
  }
});

test('every template has notes, garnish, steps, and a valid method', () => {
  const methods = new Set(['stirred', 'shaken', 'built', 'none']);
  for (const t of TEMPLATES) {
    assert.ok(t.notes?.length > 0, `${t.name}: missing notes`);
    assert.ok(t.garnish?.length > 0, `${t.name}: missing garnish`);
    assert.ok(t.steps?.length > 0, `${t.name}: missing steps`);
    assert.ok(methods.has(t.default_method), `${t.name}: bad method "${t.default_method}"`);
  }
});