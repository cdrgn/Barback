// Data-access layer. All SQL lives here so route handlers stay thin and this
// logic stays testable with an in-memory DB. Takes a db handle as its first arg.
import { calculateAbv } from '../lib/abv.js';

// Compute a recipe's ABV by looking up each ingredient's abv from the palette.
// Used both for un-poured drafts (to show ABV) and at pour time (to store it).
export function resolveRecipeAbv(db, recipe) {
  const getIngredientAbv = db.prepare('SELECT abv FROM ingredients WHERE name = ?');
  const ingredientsWithAbv = recipe.ingredients.map((i) => {
    const row = getIngredientAbv.get(i.name);
    return { amount: i.amount, unit: i.unit, abv: row ? row.abv : 0 };
  });
  return calculateAbv(ingredientsWithAbv, recipe.method).abv;
}

// Write a poured drink (root or child) plus its ingredients. Returns
// the new drink id. Wrapped in a transaction so the drink and its ingredients
// commit together — never a drink with half its ingredients.
export function saveDrink(db, { recipe, template, source = 'generated', brief = null, parentId = null, correction = null }) {
  const abv = resolveRecipeAbv(db, recipe);

  const insertDrink = db.prepare(`
    INSERT INTO drinks (parent_drink_id, name, template, source, correction, requested, method, steps, garnish, notes, abv)
    VALUES (@parent_drink_id, @name, @template, @source, @correction, @requested, @method, @steps, @garnish, @notes, @abv)
  `);
  const getIngredientId = db.prepare('SELECT id FROM ingredients WHERE name = ?');
  const insertRecipeIngredient = db.prepare('INSERT INTO recipe_ingredients (drink_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)');

  const tx = db.transaction(() => {
    const info = insertDrink.run({
      parent_drink_id: parentId,
      name: recipe.name,
      template,
      source,
      correction,
      requested: brief,
      method: recipe.method,
      steps: recipe.steps ?? null,
      garnish: recipe.garnish ?? null,
      notes: recipe.notes ?? null,
      abv,
    });
    const drinkId = info.lastInsertRowid; // get id of inserted row
    for (const ing of recipe.ingredients) {
      const row = getIngredientId.get(ing.name);
      if (!row) throw new Error(`saveDrink: ingredient "${ing.name}" not in palette`);
      insertRecipeIngredient.run(drinkId, row.id, ing.amount, ing.unit);
    }
    return drinkId;
  });

  return tx();
}

// One drink version with its ingredients attached.
export function getDrink(db, id) {
  const drink = db.prepare('SELECT * FROM drinks WHERE id = ?').get(id); // get drink row
  if (!drink) return null;
  drink.ingredients = db.prepare(`
    SELECT i.name, ri.amount, ri.unit, i.category
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.drink_id = ?
  `).all(id); // add ingredients property to drink row
  return drink;
}

// History: the root drink of each lineage, newest first.
export function getHistory(db) {
  return db.prepare(`
    SELECT id, name, template, source, abv, is_final, created_at
    FROM drinks
    WHERE parent_drink_id IS NULL
    ORDER BY created_at DESC
  `).all();
}

// All templates, with their JSON structure parsed back into an array.
export function getTemplates(db) {
  return db.prepare('SELECT * FROM templates ORDER BY id').all()
    .map((r) => ({ ...r, structure: JSON.parse(r.structure), examples: r.examples ? JSON.parse(r.examples) : [] })); // copy each object but overwrite 'structure' and 'examples' property
}

// The ingredient palette.
export function getIngredients(db) {
  return db.prepare('SELECT name, category, abv FROM ingredients ORDER BY category, name').all();
}

// Derive a ready-to-pour classic recipe from a template's structure:
// each role's example ingredient at its reference amount IS the classic.
export function templateToRecipe(template) {
  return {
    name: template.display_name,
    method: template.default_method,
    ingredients: template.structure.map((s) => ({ name: s.example, amount: s.amount, unit: s.unit })),
    garnish: template.garnish,
    steps: template.steps,
    notes: template.notes,
  };
}

// The full version lineage a drink belongs to: the root and all its descendants,
// oldest first. Walks up to the root, then collects the chain down. Each version
// includes its ingredients (via getDrink).
export function getLineage(db, id) {
  const start = db.prepare('SELECT id, parent_drink_id FROM drinks WHERE id = ?').get(id); // fetch given drink
  if (!start) return null; // return null if given drink not found

  // 1. traverse up to root. stop when parent_drink_id is null
  let rootId = start.id;
  let cursor = start;
  while (cursor.parent_drink_id != null) {
    cursor = db.prepare('SELECT id, parent_drink_id FROM drinks WHERE id = ?').get(cursor.parent_drink_id);
    rootId = cursor.id;
  }

  // 2. once at root, traverse back down, following children in creation order. stop traversing when child is null
  const versions = [];
  let currentId = rootId;
  while (currentId != null) {
    versions.push(getDrink(db, currentId));
    const child = db.prepare(
      'SELECT id FROM drinks WHERE parent_drink_id = ? ORDER BY created_at ASC LIMIT 1'
    ).get(currentId);
    currentId = child ? child.id : null;
  }
  return versions;
}