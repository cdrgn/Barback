// Express server. Thin routes that call the tested pieces: generation (lib/) and
// the data layer (db/queries.js). No business logic lives here — just HTTP glue.
import 'dotenv/config';
import express from 'express';
import { openDb } from './db/init.js';
import { generateValidatedDrink } from './lib/generate.js';
import {
  getTemplates, getIngredients, getDrink, getHistory, getLineage,
  saveDrink, templateToRecipe, resolveRecipeAbv,
} from './db/queries.js';

const app = express(); // create server
app.use(express.json()); // middleware, changes JSON text to JS object and attaches to req.body
const db = openDb();

// GET /api/templates
// Returns all 6 templates, each enriched with a classic property (canonical recipe, ready to pour).
// The classic property is also enhanced with an abv property.
app.get('/api/templates', (req, res) => {
  const templates = getTemplates(db).map((t) => {
    const classic = templateToRecipe(t);
    return { ...t, classic: { ...classic, abv: resolveRecipeAbv(db, classic) } };
  });
  res.json(templates);
});

// GET /api/ingredients
// Returns the ingredient palette (name, category, abv).
app.get('/api/ingredients', (req, res) => {
  res.json(getIngredients(db));
});

// POST /api/generate  body: { brief }
// Generates a draft recipe from a flavor brief. LLM picks which of the 6 families
// fits and composes the drink in one call. NOT saved — pouring commits it via POST /drinks.
// The response includes `pickedTemplate` (name, display_name, reasoning) so the UI
// can show "A custom [Family] — because...".
// Only route that calls the LLM (the only one needing the API key).
// (Classic pours DON'T hit this route — the frontend has the classic recipe from
// GET /api/templates and posts it directly to /api/drinks.)
app.post('/api/generate', async (req, res) => {
  try {
    const { brief } = req.body ?? {};
    if (!brief) return res.status(400).json({ error: 'brief is required' });

    const templates = getTemplates(db);
    const ingredients = getIngredients(db);
    const { recipe, template, attempts } = await generateValidatedDrink({ templates, ingredients, brief });

    res.json({
      recipe: { ...recipe, abv: resolveRecipeAbv(db, recipe) },
      pickedTemplate: { name: template.name, display_name: template.display_name, reasoning: recipe.reasoning },
      attempts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drinks  body: { recipe, template, source?, brief?, parentId?, correction? }
// Commits a drink to the DB (the "pour" event). Handles root pours and in-glass fixes, classic or generated.
// Returns 201 with the saved drink + ingredients.
app.post('/api/drinks', (req, res) => {
  try {
    const { recipe, template, source, brief, parentId, correction } = req.body ?? {};
    if (!recipe || !template) return res.status(400).json({ error: 'recipe and template are required' });
    const id = saveDrink(db, { recipe, template, source, brief, parentId, correction });
    res.status(201).json(getDrink(db, id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/drinks
// History list — roots only (one entry per drink), newest first. In-glass tweaks live under /lineage.
app.get('/api/drinks', (req, res) => {
  res.json(getHistory(db));
});

// GET /api/drinks/:id
// One drink version + its ingredients. 404 if not found.
app.get('/api/drinks/:id', (req, res) => {
  const drink = getDrink(db, Number(req.params.id));
  if (!drink) return res.status(404).json({ error: 'drink not found' });
  res.json(drink);
});

// GET /api/drinks/:id/lineage
// A drink's full version history (root → latest), oldest first. Works from any version's id.
app.get('/api/drinks/:id/lineage', (req, res) => {
  const lineage = getLineage(db, Number(req.params.id));
  if (!lineage) return res.status(404).json({ error: 'drink not found' });
  res.json(lineage);
});

// PATCH /api/drinks/:id  body: { is_final: true|false }
// Updates a drink (currently only is_final — the host's "this one's the keeper" flag).
// SQLite stores as 0/1 (no native boolean).
app.patch('/api/drinks/:id', (req, res) => {
  const { is_final } = req.body ?? {};
  if (is_final === undefined) return res.status(400).json({ error: 'nothing to update' });
  const info = db.prepare('UPDATE drinks SET is_final = ? WHERE id = ?')
    .run(is_final ? 1 : 0, Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'drink not found' });
  res.json(getDrink(db, Number(req.params.id)));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));