// Pure parser for LLM responses. No network — takes the raw text the model
// returned and turns it into a validated recipe object. All the fragile bits
// (markdown fences, JSON parsing, shape checking) live here so they can be
// tested exhaustively with zero API tokens. The network call is separate (llm.js).

const VALID_METHODS = new Set(['stirred', 'shaken', 'built', 'none']);

// Models sometimes wrap JSON in ```json ... ``` fences despite instructions.
// Strip them before parsing.
function stripFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')   // opening fence
    .replace(/\s*```$/, '')             // closing fence
    .trim();
}

/**
 * Parse and validate an LLM generation response.
 * @param {string} raw  The model's raw text output.
 * @returns {object} A validated recipe: {name, method, ingredients, garnish, steps, notes, balance_check}
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
  const steps = requireString(obj, 'steps');

  // Optional display/quality fields (present per the contract, but tolerate absence).
  const garnish = typeof obj.garnish === 'string' ? obj.garnish : '';
  const notes = typeof obj.notes === 'string' ? obj.notes : '';
  const balance_check = typeof obj.balance_check === 'string' ? obj.balance_check : '';

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

  return { name, method, ingredients, garnish, steps, notes, balance_check };
}

function requireString(obj, key) {
  if (typeof obj[key] !== 'string' || !obj[key].trim()) {
    throw new Error(`parseRecipe: missing or empty "${key}"`);
  }
  return obj[key];
}

export { stripFences };