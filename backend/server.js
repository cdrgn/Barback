// Express server. Thin routes that call the tested pieces: generation (lib/) and
// the data layer (db/queries.js). No business logic lives here — just HTTP glue.
import 'dotenv/config';
import express from 'express';
import { openDb } from './db/init.js';
import { generateValidatedDrink, generateValidatedRefinement } from './lib/generate.js';
import {
  getTemplates, getIngredients, getDrink, getHistory, getLineage,
  saveDrink, templateToRecipe, resolveRecipeAbv,
  createUser, findUserByEmail,
} from './db/queries.js';
import { hashPassword, verifyPassword, signToken } from './lib/auth.js';

const app = express(); // create server
app.use(express.json()); // middleware, changes JSON text to JS object and attaches to req.body
const db = openDb();

// A minimal email check — good enough to catch obvious typos. Real validation is
// that login works; we don't need RFC-perfect email parsing.
function looksLikeEmail(s) {
  return typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

// POST /api/register  body: { email, password }
// Create an account and return a token so the user is logged in immediately.
// Password rules: min 8 chars. Email is stored lowercased (case-insensitive login).
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!looksLikeEmail(email)) return res.status(400).json({ error: 'a valid email is required' });
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    // Reject duplicates with a clear 409 rather than a raw DB error.
    if (findUserByEmail(db, normalizedEmail)) {
      return res.status(409).json({ error: 'an account with that email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const userId = createUser(db, { email: normalizedEmail, passwordHash });
    res.status(201).json({ token: signToken(userId), email: normalizedEmail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/login  body: { email, password }
// Verify credentials and return a token. Deliberately vague error ("invalid email
// or password") so we don't reveal WHICH was wrong — that would help attackers
// enumerate valid emails.
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const user = findUserByEmail(db, String(email).trim().toLowerCase());
    // Run verifyPassword even if user is missing? Not necessary here; a fast
    // "no such user" is fine for a friends app. (Timing-attack hardening is a
    // production nicety, deferred.)
    const ok = user && await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid email or password' });

    res.json({ token: signToken(user.id), email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

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
    console.error(err);   // full detail in the server log, for debugging
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/drinks/:id/refine  body: { correction }
// Refines an already-poured drink from a correction note ("too sweet, more citrus").
// Produces a fresh full recipe in the SAME family as the parent — NOT saved; the
// host pours it via POST /drinks with parentId set to this drink's id, which links
// the refinement as a child version in the lineage.
// Response mirrors /api/generate: { recipe (with abv), attempts }.
app.post('/api/drinks/:id/refine', async (req, res) => {
  try {
    const { correction } = req.body ?? {};
    if (!correction) return res.status(400).json({ error: 'correction is required' });

    const parent = getDrink(db, Number(req.params.id));
    if (!parent) return res.status(404).json({ error: 'drink not found' });

    // The parent stores its template name; look up the full template object.
    const template = getTemplates(db).find((t) => t.name === parent.template);
    if (!template) return res.status(400).json({ error: `unknown template "${parent.template}"` });

    const ingredients = getIngredients(db);
    const { recipe, attempts } = await generateValidatedRefinement({
      template,
      currentRecipe: parent,
      correction,
      ingredients,
    });

    res.json({ recipe: { ...recipe, abv: resolveRecipeAbv(db, recipe) }, attempts });
  } catch (err) {
    console.error(err);   // full detail in the server log, for debugging
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
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