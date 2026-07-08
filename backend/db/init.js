// Creates (or opens) the SQLite database and applies schema.sql.
// Run once with `npm run db:init`. Safe to re-run — schema uses IF NOT EXISTS.
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'cocktail.db');

// Open one shared connection. better-sqlite3 is synchronous, so no pooling needed.
export function openDb() {
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON'); // must be set per connection
  db.pragma('journal_mode = WAL'); // better read/write concurrency; fine for our scale
  return db;
}

// Apply the schema. Called by `npm run db:init`.
export function initDb() {
  const db = openDb();
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  console.log(`Database ready at ${DB_PATH}`);
  return db;
}

// Allow running this file directly: `node db/init.js`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initDb();
}
