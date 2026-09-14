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
export function saveDrink(db, { recipe, template, source = 'generated', brief = null, parentId = null, correction = null, userId }) {
  const abv = resolveRecipeAbv(db, recipe);

  const insertDrink = db.prepare(`
    INSERT INTO drinks (parent_drink_id, name, template, source, correction, requested, method, steps, garnish, description, abv, user_id)
    VALUES (@parent_drink_id, @name, @template, @source, @correction, @requested, @method, @steps, @garnish, @description, @abv, @user_id)
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
      description: recipe.description ?? null,
      abv,
      user_id: userId,
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
export function getDrink(db, id, userId) {
  const drink = db.prepare('SELECT * FROM drinks WHERE id = ? AND user_id = ?').get(id, userId); // get drink row (only if owned)
  if (!drink) return null;
  drink.ingredients = db.prepare(`
    SELECT i.name, ri.amount, ri.unit, i.category
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.drink_id = ?
  `).all(id); // add ingredients property to drink row
  return drink;
}

// History: the root drink of each lineage, newest first. Because refinements
// are children, a lineage's "final" version is usually NOT the root — so we
// walk each root's descendants to answer two things per lineage:
//   has_favorite  — is ANY version in the lineage starred as a favorite?
//   version_count — how many versions total (root + refinements)?
// This keeps the history row honest ("★" and "3 versions") without the client
// having to fetch every lineage up front.
export function getHistory(db, userId) {
  const roots = db.prepare(`
    SELECT id, name, template, source, abv, created_at
    FROM drinks
    WHERE parent_drink_id IS NULL AND user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  // For each root, walk its lineage counting versions and checking for a final.
  const childrenOf = db.prepare('SELECT id, is_favorite FROM drinks WHERE parent_drink_id = ?');
  for (const root of roots) {
    let count = 0;
    let hasFavorite = false;
    // breadth-first over the (linear, in phase 1) chain
    let frontier = [{ id: root.id, is_favorite: db.prepare('SELECT is_favorite FROM drinks WHERE id = ?').get(root.id).is_favorite }];
    while (frontier.length) {
      const next = [];
      for (const node of frontier) {
        count += 1;
        if (node.is_favorite) hasFavorite = true;
        for (const child of childrenOf.all(node.id)) next.push(child);
      }
      frontier = next;
    }
    root.version_count = count;
    root.has_favorite = hasFavorite;
  }
  return roots;
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
    // Poured classics keep the template's host-facing description as the
    // drink's description; the template's LLM-facing `notes` never leaves
    // the prompt path.
    description: template.description,
  };
}

// The full version lineage a drink belongs to: the root and all its descendants,
// oldest first. Walks up to the root, then collects the chain down. Each version
// includes its ingredients (via getDrink).
export function getLineage(db, id, userId) {
  const start = db.prepare('SELECT id, parent_drink_id FROM drinks WHERE id = ? AND user_id = ?').get(id, userId); // fetch given drink (only if owned)
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
    versions.push(getDrink(db, currentId, userId));
    const child = db.prepare(
      'SELECT id FROM drinks WHERE parent_drink_id = ? ORDER BY created_at ASC LIMIT 1'
    ).get(currentId);
    currentId = child ? child.id : null;
  }
  return versions;
}

// ===== Users (Phase 2 auth) =====

// Create a user. Email is lowercased by the caller before hashing/storing so
// logins are case-insensitive. Throws if the email is already taken (the UNIQUE
// constraint fires) — the route turns that into a friendly 409.
export function createUser(db, { email, passwordHash }) {
  const info = db.prepare(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)'
  ).run(email, passwordHash);
  return info.lastInsertRowid;
}

// Look up a user by email (for login). Returns the row (incl. password_hash) or
// undefined. Caller compares the submitted password against password_hash.
export function findUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}