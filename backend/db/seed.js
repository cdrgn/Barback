// Seeds the ingredient palette into the DB. Run with `npm run db:seed`.
// Idempotent: re-running UPDATES existing ingredients (by unique name),
// so editing an ABV in data/ingredients.js and re-seeding just works.
import { fileURLToPath } from 'node:url';
import { openDb } from './init.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { TEMPLATES } from '../data/templates.js';

export function seedIngredients(db = openDb()) {
  const upsert = db.prepare(`
    INSERT INTO ingredients (name, category, abv)
    VALUES (@name, @category, @abv)
    ON CONFLICT(name) DO UPDATE SET
      category = excluded.category,
      abv      = excluded.abv
  `);

  // db.transaction(...) returns a new function wrapped in a db transaction:
  // BEGIN -> ... -> COMMIT, or ROLLBACK if anything throws.
  // either all rows commit together or none
  const seedAll = db.transaction((rows) => {
    for (const row of rows) upsert.run(row);
  });

  seedAll(INGREDIENTS);
  const count = db.prepare('SELECT COUNT(*) AS n FROM ingredients').get().n;
  console.log(`Seeded ingredients. Palette size: ${count}`);
  return count;
}

export function seedTemplates(db = openDb()) {
  const upsert = db.prepare(`
    INSERT INTO templates (name, display_name, description, default_method, balance_rule, canonical)
    VALUES (@name, @display_name, @description, @default_method, @balance_rule, @canonical)
    ON CONFLICT(name) DO UPDATE SET
      display_name   = excluded.display_name,
      description    = excluded.description,
      default_method = excluded.default_method,
      balance_rule   = excluded.balance_rule,
      canonical      = excluded.canonical
  `);
 
  const seedAll = db.transaction((rows) => {
    for (const t of rows) {
      upsert.run({
        name: t.name,
        display_name: t.display_name,
        description: t.description,
        default_method: t.default_method,
        // objects are stored as JSON text (SQLite has no native JSON type)
        balance_rule: JSON.stringify(t.balance_rule),
        canonical: JSON.stringify(t.canonical),
      });
    }
  });
 
  seedAll(TEMPLATES);
  const count = db.prepare('SELECT COUNT(*) AS n FROM templates').get().n;
  console.log(`Seeded templates. Count: ${count}`);
  return count;
}

// Run both when invoked directly: `node db/seed.js`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openDb();
  seedIngredients(db);
  seedTemplates(db);
}
