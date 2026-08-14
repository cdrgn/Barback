// Pure prompt builder. No LLM call, no DB — just (request data) -> prompt string.
// Kept separate from the LLM call (step 7) so it can be tested with zero tokens.
//
// One generation flow: the host provides a flavor brief; the LLM picks the
// best-fit template AND composes a drink within it, in one call. Template
// membership is guarded at 3 layers — this prompt (instructs), the parser
// (safety net), and Gemini's responseSchema enum (structural constraint).
//
// OUTPUT CONTRACT (what the model must return):
//   { template, reasoning, name, method, ingredients:[{name,amount,unit}], garnish, steps, description, balance_check }
// The recipe fields (name, method, ingredients, garnish, steps) match a poured (saved)
// drink's shape, so the SAME pour-writer handles generated drinks and classics.
// `template` names the picked family (one of the 6). `reasoning` explains the pick.
// `description` is a short flavor-profile description shown to the host.
// `balance_check` is the quality lever: forcing the model to account for the
// drink's structure catches lopsided results, and it feeds the validator (step 8).

// The 6 valid template names — the enum both the prompt and the parser enforce.
// Exported so llm.js can pass it to responseSchema and parse.js can validate.
export const VALID_TEMPLATE_NAMES = ['old_fashioned', 'martini', 'daiquiri', 'sidecar', 'whisky_highball', 'flip'];

// Group ingredients by category so the model sees them by role.
// {
//   spirit: ['gin', 'vodka', 'white rum'],
//   citrus: ['lime juice', 'lemon juice'],
// }
function ingredientsByCategory(ingredients) {
  const groups = {};
  for (const ing of ingredients) {
    (groups[ing.category] ??= []).push(ing.name);
  }
  return groups;
}

// Render the grouped ingredients as readable lines the model can use as its menu.
// [
//   '- spirit: gin, vodka, white rum',
//   '- citrus: lime juice, lemon juice',
// ]
function formatIngredients(ingredients) {
  const groups = ingredientsByCategory(ingredients);
  return Object.entries(groups)
    .map(([category, names]) => `- ${category}: ${names.join(', ')}`)
    .join('\n');
}

// Render the template menu for the LLM to pick from. Each line carries:
//   - snake_case name (the enum value it must return)
//   - display name
//   - flavor notes
//   - a few named example drinks in that family — the key to correct picks,
//     so "make me a mojito" picks daiquiri (mojito is a daiquiri variant),
//     not whisky_highball (which only structurally resembles it via soda).
function formatTemplateMenu(templates) {
  return templates.map((t) => {
    const examples = t.examples?.length ? `\n    Examples: ${t.examples.join(', ')}.` : '';
    return `- ${t.name} (${t.display_name}): ${t.notes}${examples}`;
  }).join('\n');
}

/**
 * Build the generation prompt.
 * @param {object} args
 * @param {Array<object>} args.templates    All 6 templates (with structure, notes, examples).
 * @param {Array<{name:string, category:string}>} args.ingredients  Allowed ingredients.
 * @param {string} args.brief               The host's free-text flavor request.
 * @param {string} [args.feedback]          On a retry, validator errors to fix.
 * @returns {string} the full prompt text.
 */
export function buildGenerationPrompt({ templates, ingredients, brief, feedback = '' }) {
  if (!templates?.length) throw new Error('buildGenerationPrompt: templates are required');
  if (!ingredients?.length) throw new Error('buildGenerationPrompt: ingredients are required');
  if (!brief) throw new Error('buildGenerationPrompt: brief is required');

  // On a retry, tell the model what was wrong with its last attempt.
  const feedbackBlock = feedback
    ? `\nYOUR PREVIOUS ATTEMPT WAS REJECTED. Fix these problems:\n${feedback}\n`
    : '';

  return `You are an expert bartender creating a single cocktail from a flavor brief.

First, identify which of the 6 root cocktail families best fits the brief. Use the
family's flavor notes AND the named examples — if the brief mentions or resembles
a named drink, that drink's family is the correct pick. Do NOT pick based on
surface ingredients (e.g. a mojito uses soda but is a DAIQUIRI, not a highball).

TEMPLATES — set "template" to EXACTLY ONE of these snake_case names:
${formatTemplateMenu(templates)}

Valid template values (any other value is REJECTED): ${VALID_TEMPLATE_NAMES.join(', ')}.

ALLOWED INGREDIENTS (use ONLY these; do not invent others):
${formatIngredients(ingredients)}

GUEST REQUEST:
${brief}
${feedbackBlock}
Compose one balanced cocktail that fits the chosen template and the brief.
Before finalizing, account for the drink's structure: backbone, acid, sweetness,
dilution, and any bitter/aromatic accent — confirm the proportions are balanced.

Respond with ONLY a JSON object (no prose, no markdown) in exactly this shape:
{
  "template": "one of: ${VALID_TEMPLATE_NAMES.join(' | ')}",
  "reasoning": "string — one short sentence on why this template fits the brief",
  "name": "string — the cocktail's name",
  "method": "stirred | shaken | built | none",
  "ingredients": [
    { "name": "must match an allowed ingredient", "amount": 0, "unit": "oz | dash | barspoon | tsp | whole" }
  ],
  "garnish": "string — free text",
  "steps": "string — preparation instructions",
  "description": "string — a short description of this drink's flavor profile, to show the host",
  "balance_check": "string — one line accounting for backbone/acid/sweet/bitter and confirming balance"
}`;
}

export { formatIngredients, formatTemplateMenu };