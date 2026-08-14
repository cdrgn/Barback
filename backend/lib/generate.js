// Orchestration: the full "generate a drink" flow, tying together the
// pure/thin pieces — build the prompt, call the model, parse the response,
// and validate-and-regenerate loop.
//
// One flow only: host provides a brief, LLM picks the template and composes
// the drink. Classic-pour is a separate DB-lookup path (no LLM), handled by
// the frontend hitting POST /api/drinks directly.
import { buildGenerationPrompt, VALID_TEMPLATE_NAMES } from './prompt.js';
import { callLlm } from './llm.js';
import { parseRecipe } from './parse.js';
import { validateRecipe } from './validator.js';

// Structural constraint: Gemini's responseSchema enum makes it impossible for
// the model to emit a template value outside our 6 names (layer 2 of 3).
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    template: { type: 'string', enum: VALID_TEMPLATE_NAMES },
    reasoning: { type: 'string' },
    name: { type: 'string' },
    method: { type: 'string', enum: ['stirred', 'shaken', 'built', 'none'] },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'number' },
          unit: { type: 'string' },
        },
        required: ['name', 'amount', 'unit'],
      },
    },
    garnish: { type: 'string' },
    steps: { type: 'string' },
    notes: { type: 'string' },
    balance_check: { type: 'string' },
  },
  required: ['template', 'name', 'method', 'ingredients', 'steps'],
};

/**
 * Generate a recipe that PASSES validation, retrying with feedback on failure.
 * The LLM picks which of the 6 templates fits the brief, then composes a drink
 * within it. After each attempt, we look up the picked template server-side and
 * hand it to the validator. Rejected attempts are re-generated with the
 * validator errors fed back into the next prompt.
 * @param {object} args
 * @param {Array<object>} args.templates    All 6 templates (with parsed structure + examples).
 * @param {Array<object>} args.ingredients  The allowed palette.
 * @param {string} args.brief               The host's flavor request.
 * @param {number} [args.maxAttempts=3]     How many tries before giving up.
 * @returns {Promise<{recipe:object, template:object, attempts:number}>}
 * @throws if no attempt passes within maxAttempts.
 */
export async function generateValidatedDrink({ templates, ingredients, brief, maxAttempts = 3 }) {
  let feedback = '';
  let lastErrors = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let recipe;
    try {
      const prompt = buildGenerationPrompt({ templates, ingredients, brief, feedback });
      const raw = await callLlm(prompt, RESPONSE_SCHEMA);
      recipe = parseRecipe(raw);
    } catch (err) {
      // Parse failure is also a reason to retry with feedback.
      lastErrors = [err.message]; // array with the single error message
      feedback = `- ${err.message}`; // string with single error message formatted
      continue;
    }

    // Look up the template the LLM picked so the validator can check against it.
    const template = templates.find((t) => t.name === recipe.template);
    if (!template) {
      // Shouldn't happen given the 3 layers, but retry if it does.
      lastErrors = [`unknown template "${recipe.template}"`];
      feedback = `- ${lastErrors[0]}`;
      continue;
    }

    const { valid, errors } = validateRecipe(recipe, template, ingredients);
    if (valid) return { recipe, template, attempts: attempt };

    // There may be multiple errors from the validator.
    lastErrors = errors;
    feedback = errors.map((e) => `- ${e}`).join('\n');
  }

  throw new Error(
    `generateValidatedDrink: no valid drink after ${maxAttempts} attempts. Last issues:\n${lastErrors.join('\n')}`
  );
}