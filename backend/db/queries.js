// Data-access layer. All SQL lives here so route handlers stay thin and this
// logic stays testable with an in-memory DB. Takes a db handle as its first arg.
import { calculateAbv } from '../lib/abv.js';

// Compute a recipe's ABV by looking up each ingredient's abv in THIS user's bar.
// Used for un-poured drafts (to show ABV) and at pour time (to store it).
// A recipe may also carry its own abv per ingredient (a saved drink's snapshot, or
// a classic straight from its template) — that wins, since no lookup is needed.
export function resolveRecipeAbv(db, recipe, userId) {
  const getIngredientAbv = db.prepare('SELECT abv FROM ingredients WHERE name = ? AND user_id = ?');
  const ingredientsWithAbv = recipe.ingredients.map((i) => {
    if (typeof i.abv === 'number') return { amount: i.amount, unit: i.unit, abv: i.abv };
    const row = getIngredientAbv.get(i.name, userId);
    return { amount: i.amount, unit: i.unit, abv: row ? row.abv : 0 };
  });
  return calculateAbv(ingredientsWithAbv, recipe.method).abv;
}

// Write a poured drink (root or child) plus its ingredients. Returns
// the new drink id. Wrapped in a transaction so the drink and its ingredients
// commit together — never a drink with half its ingredients.
export function saveDrink(db, { recipe, template, source = 'generated', brief = null, parentId = null, correction = null, userId }) {
  const abv = resolveRecipeAbv(db, recipe, userId);

  const insertDrink = db.prepare(`
    INSERT INTO drinks (parent_drink_id, name, template, source, correction, requested, method, steps, garnish, description, abv, user_id)
    VALUES (@parent_drink_id, @name, @template, @source, @correction, @requested, @method, @steps, @garnish, @description, @abv, @user_id)
  `);
  // Look up what we're about to COPY into the drink, not something to link to.
  const getIngredient = db.prepare('SELECT category, abv FROM ingredients WHERE name = ? AND user_id = ?');
  const insertRecipeIngredient = db.prepare(
    'INSERT INTO recipe_ingredients (drink_id, name, category, abv, amount, unit) VALUES (?, ?, ?, ?, ?, ?)'
  );

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
      // A classic carries its own category/abv; anything else must be in this bar.
      const row = (typeof ing.abv === 'number' && ing.category)
        ? { category: ing.category, abv: ing.abv }
        : getIngredient.get(ing.name, userId);
      if (!row) throw new Error(`saveDrink: ingredient "${ing.name}" not in this bar`);
      insertRecipeIngredient.run(drinkId, ing.name, row.category, row.abv, ing.amount, ing.unit);
    }
    return drinkId;
  });

  return tx();
}

// One drink version with its ingredients attached.
export function getDrink(db, id, userId) {
  const drink = db.prepare('SELECT * FROM drinks WHERE id = ? AND user_id = ?').get(id, userId); // get drink row (only if owned)
  if (!drink) return null;
  // No join: the drink carries its own copy, so editing or deleting an ingredient
  // in the bar can never change or break a drink that was already made.
  drink.ingredients = db.prepare(`
    SELECT name, category, abv, amount, unit
    FROM recipe_ingredients
    WHERE drink_id = ?
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
// This user's bar. Generation passes inStockOnly so it can only use what they
// actually have tonight; the Bar screen passes nothing, to show everything.
export function getIngredients(db, userId, { inStockOnly = false } = {}) {
  const where = inStockOnly ? 'WHERE user_id = ? AND in_stock = 1' : 'WHERE user_id = ?';
  return db.prepare(
    `SELECT id, name, category, abv, in_stock FROM ingredients ${where} ORDER BY category, name`
  ).all(userId);
}

// ===== The bar (Phase 3) =====
// Three distinct actions on an ingredient: in_stock toggles whether generation may
// use it (the row and its abv survive), delete removes it for good. Deleting is only
// safe because saved drinks hold their own copy.

// Copy the shared defaults into a new user's bar at register time. From here on
// they're that user's rows — editing one never touches anybody else's.
export function stockDefaultsForUser(db, userId, defaults) {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO ingredients (user_id, name, category, abv, in_stock) VALUES (?, ?, ?, ?, 1)'
  );
  const tx = db.transaction(() => {
    for (const d of defaults) insert.run(userId, d.name, d.category, d.abv ?? 0);
  });
  tx();
}

// Add one of their own. Throws if that name is already in this bar — even when it's
// switched off, since two rows named "gin" with different ABVs would be ambiguous.
export function addIngredient(db, userId, { name, category, abv, inStock = true }) {
  const exists = db.prepare('SELECT id FROM ingredients WHERE user_id = ? AND name = ?').get(userId, name);
  if (exists) throw new Error(`addIngredient: "${name}" is already in your bar`);
  const info = db.prepare(
    'INSERT INTO ingredients (user_id, name, category, abv, in_stock) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, name, category, abv, inStock ? 1 : 0);
  return getIngredientById(db, info.lastInsertRowid, userId);
}

// Change an ingredient's abv, category and/or stock state. Only the fields passed
// are touched. Past drinks are unaffected — they kept their own copy.
// Returns updated ingredient row on success, else null.
export function updateIngredient(db, userId, id, { category, abv, inStock }) {
  const sets = [];
  const args = [];
  if (category !== undefined) { sets.push('category = ?'); args.push(category); }
  if (abv !== undefined)      { sets.push('abv = ?');      args.push(abv); }
  if (inStock !== undefined)  { sets.push('in_stock = ?'); args.push(inStock ? 1 : 0); }
  if (!sets.length) return getIngredientById(db, id, userId);

  args.push(id, userId);
  const info = db.prepare(`UPDATE ingredients SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...args);
  return info.changes === 0 ? null : getIngredientById(db, id, userId);
}

// Remove it for good. Scoped to the owner, so one user can't delete another's row.
export function deleteIngredient(db, userId, id) {
  return db.prepare('DELETE FROM ingredients WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
}

// One ingredient, only if this user owns it.
export function getIngredientById(db, id, userId) {
  return db.prepare('SELECT id, name, category, abv, in_stock FROM ingredients WHERE id = ? AND user_id = ?')
    .get(id, userId) ?? null;
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