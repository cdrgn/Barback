// One tiny wrapper per backend route. Keeps all fetch/JSON/error handling in one
// place so components don't duplicate it. Every function returns a Promise that
// resolves with the response body or throws with a readable error.
import { getToken, clearToken } from './token.js';

// Requests time out after this long so the UI can't spin forever on a stalled
// backend/network. Generation is slow (15–30s), so the limit is generous.
const REQUEST_TIMEOUT_MS = 60000; // 60s — timeout if not resolved within this time

// Called when a request comes back 401 (missing/invalid/expired token). Set by
// App on mount so client.js can bounce the user to login without importing React
// state directly — keeps this file framework-agnostic.
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, options = {}) {
  const controller = new AbortController(); // built-in JS API, allows cancellation of in-progress async op
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const token = getToken();
  let res;
  try {
    res = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  const body = await res.json().catch(() => ({})); // if parsing JSON fails, treat body as empty obj {} to prevent crash
  if (!res.ok) {
    if (res.status === 401) {
      // The token is gone/expired/invalid — forget it and let the app show login.
      clearToken();
      onUnauthorized();
    }
    throw new Error(body.error || `${res.status} ${res.statusText}`); // if body is empty obj, reading missing property safely returns undefined
  }
  return body;
}

// ---- Auth (public — no token required, but register/login RETURN one) ----

// POST /api/register -> { token, email }
export const register = (email, password) =>
  request('/api/register', { method: 'POST', body: JSON.stringify({ email, password }) });

// POST /api/login -> { token, email }
export const login = (email, password) =>
  request('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });

// ---- Everything below requires a token (server enforces this; we just send it) ----

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
// Toggle whether a version is one of the host's favorites (multiple allowed).
export const markFavorite = (id, is_favorite = true) =>
  request(`/api/drinks/${id}`, { method: 'PATCH', body: JSON.stringify({ is_favorite }) });

// GET /api/drinks -> history list (roots only)
export const fetchHistory = () => request('/api/drinks');

// GET /api/drinks/:id -> one drink + ingredients
export const fetchDrink = (id) => request(`/api/drinks/${id}`);

// GET /api/drinks/:id/lineage -> array of versions
export const fetchLineage = (id) => request(`/api/drinks/${id}/lineage`);