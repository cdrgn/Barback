// Seeds the ingredient palette into the DB. Run with `npm run db:seed`.
// Idempotent: re-running UPDATES existing ingredients (by unique name),
// so editing an ABV in data/ingredients.js and re-seeding just works.
import { fileURLToPath } from 'node:url';
import { openDb } from './init.js';
import { INGREDIENTS } from '../data/ingredients.js';

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedIngredients();
}
