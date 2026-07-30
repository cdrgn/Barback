// Pure prompt builder. No LLM call, no DB — just (request data) -> prompt string.
// Kept separate from the LLM call (step 7) so it can be tested with zero tokens.
//
// It assembles what the model needs from the template's `structure` (roles +
// reference proportions + example ingredients), the allowed ingredients, and the
// host's brief — then specifies the JSON output contract so the response is parseable.
//
// OUTPUT CONTRACT (what the model must return):
//   { name, method, ingredients:[{name,amount,unit}], garnish, steps, balance_check }
// The first five fields match a poured drink's shape, so the SAME pour-writer
// handles generated drinks and classics identically.
// `balance_check` is the quality lever: forcing the model to account for the
// drink's structure catches lopsided results, and it feeds the validator (step 8).
//
// NOTE: we may add a `reasoning` field later (a "why this drink" blurb for the
// host). It's display-only and does no downstream work, so it's deferred for now.

// Group ingredients by category so the model sees them by role.
function ingredientsByCategory(ingredients) {
  const groups = {};
  for (const ing of ingredients) {
    (groups[ing.category] ??= []).push(ing.name);
  }
  return groups;
}

// Render the grouped ingredients as readable lines the model can use as its menu.
function formatIngredients(ingredients) {
  const groups = ingredientsByCategory(ingredients);
  return Object.entries(groups)
    .map(([category, names]) => `- ${category}: ${names.join(', ')}`)
    .join('\n');
}

// Render a template's `structure` as reference proportions: one line per role,
// with an example ingredient and the verified amount. This is the balance guide —
// real ratios the model anchors on, while being free to vary the actual ingredients.
function formatStructure(structure) {
  return structure
    .map((s) => `- ${s.role} (e.g. ${s.example}): ${s.amount} ${s.unit}`)
    .join('\n');
}

/**
 * Build the generation prompt.
 * @param {object} args
 * @param {object} args.template  A template row: {display_name, default_method, structure(array), notes, ...}
 * @param {Array<{name:string, category:string}>} args.ingredients  Allowed ingredients.
 * @param {string} args.brief  The host's free-text flavor request.
 * @param {Array<object>} [args.examples]  Optional past drinks to steer taste (unused for now).
 * @returns {string} the full prompt text.
 */
export function buildGenerationPrompt({ template, ingredients, brief, examples = [] }) {
  if (!template) throw new Error('buildGenerationPrompt: template is required');
  if (!ingredients?.length) throw new Error('buildGenerationPrompt: ingredients are required');
  if (!brief) throw new Error('buildGenerationPrompt: brief is required');

  const exampleBlock = examples.length
    ? `\nThe guest previously enjoyed these — make something in that spirit:\n` +
      examples.map((e) => `- ${e.name}`).join('\n') + '\n'
    : '';

  return `You are an expert bartender creating a single cocktail.

TEMPLATE: ${template.display_name}
Build the drink within this template. Include each role below (the first is the
backbone). Vary the specific ingredients freely, but keep the proportions balanced.

Reference proportions (a balance guide, NOT a recipe to copy):
${formatStructure(template.structure)}
${template.notes ? `\nNotes: ${template.notes}` : ''}
Default preparation method: ${template.default_method}.

ALLOWED INGREDIENTS (use ONLY these; do not invent others):
${formatIngredients(ingredients)}
${exampleBlock}
GUEST REQUEST:
${brief}

Compose one balanced cocktail that fits the template and the request.
Before finalizing, account for the drink's structure: backbone, acid,
sweetness, dilution, and any bitter/aromatic accent — confirm the
proportions are balanced.

Respond with ONLY a JSON object (no prose, no markdown) in exactly this shape:
{
  "name": "string — the cocktail's name",
  "method": "stirred | shaken | built | none",
  "ingredients": [
    { "name": "must match an allowed ingredient", "amount": 0, "unit": "oz | dash | barspoon | tsp | whole" }
  ],
  "garnish": "string — free text",
  "steps": "string — preparation instructions",
  "balance_check": "string — one line accounting for backbone/acid/sweet/bitter and confirming balance"
}`;
}

export { formatIngredients, formatStructure };