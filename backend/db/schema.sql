-- Cocktail Host Assistant — schema
PRAGMA foreign_keys = ON;

-- The 6 Cocktail Codex structural families ("the grammar" every drink is built on).
-- Holds each family's identity now; balance-rule columns (roles, ratios) are added
-- when encoded against the book (build step 5) — no fabricated ratios here yet.
CREATE TABLE IF NOT EXISTS templates (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,  -- stable key (used for FK): 'old_fashioned','martini','daiquiri','sidecar','highball','flip'
  display_name   TEXT NOT NULL,         -- display label (used for UI): 'Old Fashioned'
  description    TEXT,                  -- what structurally defines this family
  default_method TEXT                   -- typical prep: 'stirred'|'shaken'|'built'
);

-- Curated ingredient palette. `abv` is calculated, not inferred by LLM.
-- `category` is the structural ROLE used by balance rules and the validator.
CREATE TABLE IF NOT EXISTS ingredients (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,   -- spirit,liqueur,fortified,citrus,sweetener,bitter,sparkling,aromatic,garnish,other
  abv      REAL NOT NULL DEFAULT 0     -- percent: 40 for gin, 0 for lime juice
);

-- Holds all drinks. A drink is one of two kinds, set by `source`:
--   'classic'   — a known recipe from the seed file (data/classics.js)
--   'generated' — composed by the LLM from a flavor brief
--
-- A drink is only written to this table once it's POURED. While the host is still
-- tweaking a draft ("make it less sweet"), the app regenerates it in memory and
-- nothing is saved — only pouring commits a drink here.
--
-- Every drink is one VERSION in a convergence lineage, tracked by parent_drink_id:
--   root  (parent_drink_id IS NULL) = the drink as first poured
--   child = an in-glass additive fix of its parent
CREATE TABLE IF NOT EXISTS drinks (
  id              INTEGER PRIMARY KEY,
  parent_drink_id INTEGER REFERENCES drinks(id),             -- NULL = root (as poured); else the predecessor version
  name            TEXT NOT NULL,                             -- the drink's name
  template        TEXT NOT NULL REFERENCES templates(name),  -- the family this drink expresses (classic OR generated)
  source          TEXT NOT NULL DEFAULT 'generated',         -- 'generated' | 'classic' — how the recipe was obtained
  correction      TEXT,                                      -- remark that produced THIS version (NULL for any root)
  requested       TEXT,                                      -- the host's flavor brief; NULL for classics (no brief — picked from menu)
  method          TEXT,                                      -- 'stirred'|'shaken'|'built'|'none' (drives dilution/ABV)
  steps           TEXT,                                      -- blob: ordered instructions
  abv             REAL,                                      -- computed at pour, per version
  is_final        INTEGER NOT NULL DEFAULT 0,                -- 1 = dialed-in final version (end of convergence)
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Atomic ingredient amounts for one drink version (this is where ratios live).
-- Every drink — classic or generated — gets its ingredients here via drink_id.
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id            INTEGER PRIMARY KEY,
  drink_id      INTEGER NOT NULL REFERENCES drinks(id),
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  amount        REAL NOT NULL,                              -- quantity in `unit`
  unit          TEXT NOT NULL                               -- 'oz','dash','barspoon','whole'
);

-- Indexes on the columns we actually filter by.
CREATE INDEX IF NOT EXISTS idx_drinks_parent ON drinks(parent_drink_id);     -- finds a parent drink's direct children
CREATE INDEX IF NOT EXISTS idx_ri_drink      ON recipe_ingredients(drink_id); -- finds a drink's ingredients
