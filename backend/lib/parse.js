// Pure parser for LLM responses. No network — takes the raw text the model
// returned and turns it into a validated recipe object. All the fragile bits
// (markdown fences, JSON parsing, shape checking) live here so they can be
// tested exhaustively with zero API tokens. The network call is separate (llm.js).

import { VALID_TEMPLATE_NAMES } from './prompt.js';

const VALID_METHODS = new Set(['stirred', 'shaken', 'built', 'none']);
const VALID_TEMPLATES = new Set(VALID_TEMPLATE_NAMES);

// Ceiling for short free-text fields (reasoning, description). These are meant
// to be a clause or a sentence or two — anything longer is a model breakdown,
// not real content, so we reject it and let the loop regenerate.
const SHORT_TEXT_MAX = 300;

// Models sometimes wrap JSON in ```json ... ``` fences despite instructions.
// Strip them before parsing.
function stripFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')   // opening fence
    .replace(/\s*```$/, '')             // closing fence
    .trim();
}

// Guard against model breakdown: runaway repetition loops (e.g. "balance balance
// balance…") and absurdly long strings. Returns a cleaned string, or throws if it
// looks broken so the retry loop can regenerate.
function sanitizeText(value, field, maxLen = SHORT_TEXT_MAX) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (text.length > maxLen) {
    throw new Error(`parseRecipe: ${field} is suspiciously long (${text.length} chars) — likely a model loop`);
  }
  // detect a single word repeated many times in a row
  const words = text.split(/\s+/);
  if (words.length >= 8) {
    let run = 1, maxRun = 1;
    for (let i = 1; i < words.length; i++) {
      run = words[i].toLowerCase() === words[i - 1].toLowerCase() ? run + 1 : 1;
      if (run > maxRun) maxRun = run;
    }
    if (maxRun >= 5) {
      throw new Error(`parseRecipe: ${field} contains a repetition loop — regenerating`);
    }
  }
  return text;
}

/**
 * Parse and validate an LLM generation response.
 * @param {string} raw  The model's raw text output.
 * @returns {object} A validated recipe: {name, method, template, ingredients, garnish, steps, description, reasoning}
 * @throws {Error} if the text isn't valid JSON or doesn't match the contract.
 */
export function parseRecipe(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('parseRecipe: empty or non-string response');
  }

  let obj;
  try {
    obj = JSON.parse(stripFences(raw));
  } catch {
    throw new Error('parseRecipe: response was not valid JSON');
  }

  // Required top-level fields.
  const name = requireString(obj, 'name');
  const method = requireString(obj, 'method');
  if (!VALID_METHODS.has(method)) {
    throw new Error(`parseRecipe: invalid method "${method}"`);
  }
  // template is required — the LLM must always pick one of the 6 families.
  // Third defense layer, catches anything prompt + responseSchema didn't.
  const template = requireString(obj, 'template');
  if (!VALID_TEMPLATES.has(template)) {
    throw new Error(`parseRecipe: template "${template}" is not one of the 6 valid families`);
  }
  const steps = requireString(obj, 'steps');

  // Optional display fields — same short-text guard for both.
  const garnish = typeof obj.garnish === 'string' ? obj.garnish : '';
  const description = sanitizeText(obj.description, 'description');
  const reasoning = sanitizeText(obj.reasoning, 'reasoning');

  // Ingredients: must be a non-empty array of {name, amount, unit}.
  if (!Array.isArray(obj.ingredients) || obj.ingredients.length === 0) {
    throw new Error('parseRecipe: ingredients must be a non-empty array');
  }
  const ingredients = obj.ingredients.map((ing, i) => {
    if (typeof ing?.name !== 'string' || !ing.name) {
      throw new Error(`parseRecipe: ingredient ${i} missing name`);
    }
    if (typeof ing.amount !== 'number' || !(ing.amount > 0)) {
      throw new Error(`parseRecipe: ingredient "${ing.name}" has invalid amount`);
    }
    if (typeof ing.unit !== 'string' || !ing.unit) {
      throw new Error(`parseRecipe: ingredient "${ing.name}" missing unit`);
    }
    return { name: ing.name, amount: ing.amount, unit: ing.unit };
  });

  return { name, method, template, ingredients, garnish, steps, description, reasoning };
}

function requireString(obj, key) {
  if (typeof obj[key] !== 'string' || !obj[key].trim()) {
    throw new Error(`parseRecipe: missing or empty "${key}"`);
  }
  return obj[key];
}

export { stripFences };