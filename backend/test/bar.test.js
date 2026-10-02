import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { INGREDIENTS } from '../data/ingredients.js';
import { seedTemplates } from '../db/seed.js';
import {
  createUser, stockDefaultsForUser, getIngredients, addIngredient,
  updateIngredient, deleteIngredient, getIngredientById, saveDrink, getDrink,
} from '../db/queries.js';

// A db with the schema, the templates, and two users who each start with the
// 54 defaults in stock — the state right after two people register.
function setup() {
  const db = new Database(':memory:');
  db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  seedTemplates(db);
  const aliceId = createUser(db, { email: 'alice@x.com', passwordHash: 'x' });
  const bobId = createUser(db, { email: 'bob@x.com', passwordHash: 'x' });
  stockDefaultsForUser(db, aliceId, INGREDIENTS);
  stockDefaultsForUser(db, bobId, INGREDIENTS);
  return { db, aliceId, bobId };
}

const daiquiriRecipe = {
  name: 'Test Daiquiri',
  method: 'shaken',
  ingredients: [
    { name: 'white rum', amount: 2, unit: 'oz' },
    { name: 'lime juice', amount: 0.75, unit: 'oz' },
    { name: 'simple syrup', amount: 0.75, unit: 'oz' },
  ],
  garnish: 'lime wedge',
  steps: 'Shake, strain.',
};

test('a new user starts with all the defaults in stock', () => {
  const { db, aliceId } = setup();
  const bar = getIngredients(db, aliceId);
  assert.equal(bar.length, INGREDIENTS.length);
  assert.ok(bar.every((i) => i.in_stock === 1), 'everything starts in stock');
});

test('one user cannot see another user bar', () => {
  const { db, aliceId, bobId } = setup();
  addIngredient(db, aliceId, { name: 'house syrup', category: 'sweetener', abv: 0 });
  const names = (u) => getIngredients(db, u).map((i) => i.name);
  assert.ok(names(aliceId).includes('house syrup'));
  assert.ok(!names(bobId).includes('house syrup'), "bob must not see alice's ingredient");
});

test('out of stock keeps the row but hides it from generation', () => {
  const { db, aliceId } = setup();
  const rum = getIngredients(db, aliceId).find((i) => i.name === 'white rum');
  updateIngredient(db, aliceId, rum.id, { inStock: false });

  const all = getIngredients(db, aliceId);
  const stocked = getIngredients(db, aliceId, { inStockOnly: true });
  assert.ok(all.some((i) => i.name === 'white rum'), 'still in the bar list');
  assert.ok(!stocked.some((i) => i.name === 'white rum'), 'not offered to the LLM');
  assert.equal(all.length, stocked.length + 1);
});

test('switching back in stock restores it, abv intact', () => {
  const { db, aliceId } = setup();
  const rum = getIngredients(db, aliceId).find((i) => i.name === 'white rum');
  updateIngredient(db, aliceId, rum.id, { inStock: false });
  updateIngredient(db, aliceId, rum.id, { inStock: true });
  const restockedRum = getIngredientById(db, rum.id, aliceId);
  assert.equal(restockedRum.in_stock, 1);
  assert.equal(restockedRum.abv, rum.abv, 'abv survived the round trip');
});

test('adding a name already in the bar is rejected', () => {
  const { db, aliceId } = setup();
  assert.throws(() => addIngredient(db, aliceId, { name: 'gin', category: 'spirit', abv: 57 }),
    /already in your bar/);
});

test('two users can each have their own ingredient with the same name', () => {
  const { db, aliceId, bobId } = setup();
  addIngredient(db, aliceId, { name: 'house syrup', category: 'sweetener', abv: 0 });
  assert.doesNotThrow(() => addIngredient(db, bobId, { name: 'house syrup', category: 'sweetener', abv: 5 }));
});

test('editing an ingredient does NOT change a drink already saved', () => {
  const { db, aliceId } = setup();
  const id = saveDrink(db, { recipe: daiquiriRecipe, template: 'daiquiri', userId: aliceId });
  const savedDrink = getDrink(db, id, aliceId);

  const rum = getIngredients(db, aliceId).find((i) => i.name === 'white rum');
  updateIngredient(db, aliceId, rum.id, { abv: 75 }); // overproof, way off the 40 it was made with

  const savedDrinkAfterEdit = getDrink(db, id, aliceId);
  assert.equal(savedDrinkAfterEdit.abv, savedDrink.abv, "the drink's abv is a record, not a live calculation");
  const rumOfSavedDrink = savedDrinkAfterEdit.ingredients.find((i) => i.name === 'white rum');
  assert.equal(rumOfSavedDrink.abv, savedDrink.ingredients.find((i) => i.name === 'white rum').abv,
    'the snapshot kept the abv it was poured with');
});

test('deleting an ingredient does NOT break a drink already saved', () => {
  const { db, aliceId } = setup();
  const id = saveDrink(db, { recipe: daiquiriRecipe, template: 'daiquiri', userId: aliceId });
  const rum = getIngredients(db, aliceId).find((i) => i.name === 'white rum');

  assert.equal(deleteIngredient(db, aliceId, rum.id), true);

  const drink = getDrink(db, id, aliceId);
  assert.equal(drink.ingredients.length, 3, 'all three lines still there');
  assert.ok(drink.ingredients.some((i) => i.name === 'white rum'), 'the deleted one still shows');
  assert.ok(drink.abv > 0, 'abv unaffected');
});

test('one user cannot edit or delete another user ingredient', () => {
  const { db, aliceId, bobId } = setup();
  const aliceGin = getIngredients(db, aliceId).find((i) => i.name === 'gin');
  assert.equal(updateIngredient(db, bobId, aliceGin.id, { abv: 99 }), null);
  assert.equal(deleteIngredient(db, bobId, aliceGin.id), false);
  assert.equal(getIngredientById(db, aliceGin.id, aliceId).abv, aliceGin.abv, 'untouched');
});

test('saving a drink with an ingredient not in the bar is rejected', () => {
  const { db, aliceId } = setup();
  const bad = { ...daiquiriRecipe, ingredients: [{ name: 'unicorn tears', amount: 1, unit: 'oz' }] };
  assert.throws(() => saveDrink(db, { recipe: bad, template: 'daiquiri', userId: aliceId }),
    /not in this bar/);
});