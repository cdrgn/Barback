// One tiny wrapper per backend route. Keeps all fetch/JSON/error handling in one
// place so components don't duplicate it. Every function returns a Promise that
// resolves with the response body or throws with a readable error.

// Requests time out after this long so the UI can't spin forever on a stalled
// backend/network. Generation is slow (15–30s), so the limit is generous.
const REQUEST_TIMEOUT_MS = 300000; // currently 5 min for testing

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `${res.status} ${res.statusText}`);
  return body;
}

// GET /api/templates -> templates (each with a `classic` recipe attached)
export const fetchTemplates   = () => request('/api/templates');

// GET /api/ingredients -> the palette
export const fetchIngredients = () => request('/api/ingredients');

// POST /api/generate -> { recipe (with abv), attempts, pickedTemplate? }
// Pass template=null for OPEN mode (LLM picks the template from the brief).
export const generate = (template, brief) =>
  request('/api/generate', { method: 'POST', body: JSON.stringify(template ? { template, brief } : { brief }) });

// POST /api/drinks -> the saved drink (with id + ingredients)
export const saveDrink = (payload) =>
  request('/api/drinks', { method: 'POST', body: JSON.stringify(payload) });

// POST /api/drinks/:id/refine -> { recipe (with abv), attempts }
// Refine a poured drink from a correction note. Returns a fresh DRAFT (not saved).
export const refine = (id, correction) =>
  request(`/api/drinks/${id}/refine`, { method: 'POST', body: JSON.stringify({ correction }) });

// PATCH /api/drinks/:id -> the updated drink
// Mark (or unmark) a drink as the dialed-in keeper.
export const markFinal = (id, is_final = true) =>
  request(`/api/drinks/${id}`, { method: 'PATCH', body: JSON.stringify({ is_final }) });

// GET /api/drinks -> history list (roots only)
export const fetchHistory = () => request('/api/drinks');

// GET /api/drinks/:id -> one drink + ingredients
export const fetchDrink = (id) => request(`/api/drinks/${id}`);

// GET /api/drinks/:id/lineage -> array of versions
export const fetchLineage = (id) => request(`/api/drinks/${id}/lineage`);