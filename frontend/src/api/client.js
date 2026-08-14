// One tiny wrapper per backend route. Keeps all fetch/JSON/error handling in one
// place so components don't duplicate it. Every function returns a Promise that
// resolves with the response body or throws with a readable error.

async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
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

// GET /api/drinks -> history list (roots only)
export const fetchHistory = () => request('/api/drinks');

// GET /api/drinks/:id -> one drink + ingredients
export const fetchDrink = (id) => request(`/api/drinks/${id}`);

// GET /api/drinks/:id/lineage -> array of versions
export const fetchLineage = (id) => request(`/api/drinks/${id}/lineage`);