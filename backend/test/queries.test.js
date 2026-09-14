import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { seedIngredients, seedTemplates } from '../db/seed.js';
import { saveDrink, getDrink, getHistory, getLineage, getTemplates, templateToRecipe, createUser } from '../db/queries.js';

// Build a fresh in-memory DB with schema + seed for each test run.
function makeDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  seedIngredients(db);
  seedTemplates(db);
  const userId = createUser(db, { email: 'test@example.com', passwordHash: 'x' });
  return { db, userId };
}

const daiquiriRecipe = {
  name: 'Smoke & Zest',
  method: 'shaken',
  ingredients: [
    { name: 'mezcal', amount: 2, unit: 'oz' },
    { name: 'lime juice', amount: 0.75, unit: 'oz' },
    { name: 'agave syrup', amount: 0.5, unit: 'oz' },
  ],
  garnish: 'lime wheel',
  steps: 'Shake, strain.',
  description: 'Smoky sour.',
};

test('saveDrink saves a drink and its ingredients, with a computed ABV', () => {
  const { db, userId } = makeDb();
  const id = saveDrink(db, { recipe: daiquiriRecipe, template: 'daiquiri', source: 'generated', brief: 'smoky', userId });
  const drink = getDrink(db, id, userId);
  assert.equal(drink.name, 'Smoke & Zest');
  assert.equal(drink.ingredients.length, 3);
  assert.ok(drink.abv > 0, 'abv should be computed');
  assert.equal(drink.source, 'generated');
  assert.equal(drink.garnish, 'lime wheel');
});

test('history returns root drinks only, not in-glass children', () => {
  const { db, userId } = makeDb();
  const rootId = saveDrink(db, { recipe: daiquiriRecipe, template: 'daiquiri', userId });
  // a child version (in-glass fix) descends from the root
  saveDrink(db, { recipe: daiquiriRecipe, template: 'daiquiri', parentId: rootId, correction: 'too sweet', userId });

  const history = getHistory(db, userId);
  assert.equal(history.length, 1, 'only the root should appear in history');
  assert.equal(history[0].id, rootId);
});

test('saveDrink rejects an ingredient not in the palette', () => {
  const { db, userId } = makeDb();
  const bad = { ...daiquiriRecipe, ingredients: [{ name: 'unicorn tears', amount: 1, unit: 'oz' }] };
  assert.throws(() => saveDrink(db, { recipe: bad, template: 'daiquiri', userId }), /not in palette/);
});

test('templateToRecipe derives the classic from structure', () => {
  const { db, userId } = makeDb();
  const daiquiri = getTemplates(db).find((t) => t.name === 'daiquiri');
  const recipe = templateToRecipe(daiquiri);
  assert.equal(recipe.name, 'Daiquiri');
  assert.equal(recipe.method, 'shaken');
  assert.ok(recipe.ingredients.some((i) => i.name === 'white rum'));
});

test('a poured classic gets a real ABV', () => {
  const { db, userId } = makeDb();
  const daiquiri = getTemplates(db).find((t) => t.name === 'daiquiri');
  const id = saveDrink(db, { recipe: templateToRecipe(daiquiri), template: 'daiquiri', source: 'classic', userId });
  const drink = getDrink(db, id, userId);
  assert.ok(drink.abv > 10 && drink.abv < 30, `daiquiri abv out of range: ${drink.abv}`);
  assert.equal(drink.source, 'classic');
});

test('getLineage returns all versions oldest-first from any version', () => {
  const { db, userId } = makeDb();
  const rootId = saveDrink(db, { recipe: daiquiriRecipe, template: 'daiquiri', userId });
  const childId = saveDrink(db, { recipe: daiquiriRecipe, template: 'daiquiri', parentId: rootId, correction: 'too sweet', userId });

  // asking from the CHILD should still return the whole chain from the root
  const lineage = getLineage(db, childId, userId);
  assert.equal(lineage.length, 2);
  assert.equal(lineage[0].id, rootId, 'root should be first');
  assert.equal(lineage[1].id, childId, 'child should follow');
});

test('history reports version_count and has_favorite across the lineage', () => {
  const { db, userId } = makeDb();
  const rootId = saveDrink(db, { recipe: daiquiriRecipe, template: 'daiquiri', userId });
  const childId = saveDrink(db, { recipe: daiquiriRecipe, template: 'daiquiri', parentId: rootId, correction: 'too sweet', userId });
  // mark the CHILD final, not the root
  db.prepare('UPDATE drinks SET is_favorite = 1 WHERE id = ?').run(childId);

  const history = getHistory(db, userId);
  assert.equal(history.length, 1, 'one lineage');
  assert.equal(history[0].version_count, 2, 'root + one refinement');
  assert.equal(history[0].has_favorite, true, 'a later version is final');
});