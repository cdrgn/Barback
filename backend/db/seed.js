// Seeds the DB with the ingredient palette and the 6 root templates.
// Run with `npm run db:seed`. Idempotent: re-running UPDATES existing rows
// (by unique name), so editing data/*.js and re-seeding just works.
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
  // BEGIN -> ... -> COMMIT, or ROLLBACK on any error.
  // So all rows commit together — never a half-seeded palette.
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
    INSERT INTO templates (name, display_name, default_method, structure, examples, notes, garnish, steps)
    VALUES (@name, @display_name, @default_method, @structure, @examples, @notes, @garnish, @steps)
    ON CONFLICT(name) DO UPDATE SET
      display_name   = excluded.display_name,
      default_method = excluded.default_method,
      structure      = excluded.structure,
      examples       = excluded.examples,
      notes          = excluded.notes,
      garnish        = excluded.garnish,
      steps          = excluded.steps
  `);

  const seedAll = db.transaction((rows) => {
    for (const t of rows) {
      upsert.run({
        name: t.name,
        display_name: t.display_name,
        default_method: t.default_method,
        // structure is an array of objects — stored as JSON text
        structure: JSON.stringify(t.structure),
        examples: JSON.stringify(t.examples || []),
        notes: t.notes,
        garnish: t.garnish,
        steps: t.steps,
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