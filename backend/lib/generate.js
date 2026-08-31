// Orchestration: build the prompt, call the model, parse + validate, retry on a
// bad recipe. Classic-pour is a separate DB-lookup path (no LLM), handled by the
// frontend hitting POST /api/drinks directly.
//
// ERROR MODEL (the whole thing in one sentence):
//   Only a BAD RECIPE (parse or validation failure) is retried, with feedback.
//   API failures (down, timeout, 429) throw straight out — the route logs the
//   real error and shows the user a generic message.
import { buildGenerationPrompt, buildRefinePrompt, VALID_TEMPLATE_NAMES } from './prompt.js';
import { callLlm } from './llm.js';
import { parseRecipe } from './parse.js';
import { validateRecipe } from './validator.js';

// Gemini enforces this schema on the response (enum locks template to our 6).
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
    description: { type: 'string' },
  },
  required: ['template', 'name', 'method', 'ingredients', 'steps'],
};

/**
 * Generate a validated drink from a brief. The LLM picks the template.
 * Retries up to maxAttempts on a bad recipe, feeding the errors back each time.
 * @returns {Promise<{recipe:object, template:object, attempts:number}>}
 * @throws on API failure, or if no valid drink after maxAttempts.
 */
export async function generateValidatedDrink({ templates, ingredients, brief, maxAttempts = 3 }) {
  let feedback = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // The model call is OUTSIDE the try below on purpose: an API failure
    // (timeout/429/network) can't be fixed by retrying, so we let it throw out.
    const raw = await callLlm(buildGenerationPrompt({ templates, ingredients, brief, feedback }), RESPONSE_SCHEMA);

    // From here on, any problem is a BAD RECIPE — collect errors and retry.
    const errors = [];
    let recipe;
    try {
      recipe = parseRecipe(raw);
    } catch (err) {
      feedback = `- ${err.message}`;
      continue;
    }

    const template = templates.find((t) => t.name === recipe.template);
    if (!template) errors.push(`unknown template "${recipe.template}"`);
    else errors.push(...validateRecipe(recipe, template, ingredients).errors);

    if (template && errors.length === 0) return { recipe, template, attempts: attempt };

    feedback = errors.map((e) => `- ${e}`).join('\n');
  }

  throw new Error(`generateValidatedDrink: no valid drink after ${maxAttempts} attempts`);
}

/**
 * Refine an already-made drink from a correction note. The template is FIXED
 * (inherited from the parent); the model must stay in that family.
 * @returns {Promise<{recipe:object, attempts:number}>}
 * @throws on API failure, or if no valid drink after maxAttempts.
 */
export async function generateValidatedRefinement({ template, currentRecipe, correction, ingredients, maxAttempts = 3 }) {
  let feedback = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await callLlm(
      buildRefinePrompt({ template, currentRecipe, correction, ingredients, feedback }),
      RESPONSE_SCHEMA
    );

    let recipe;
    try {
      recipe = parseRecipe(raw);
    } catch (err) {
      feedback = `- ${err.message}`;
      continue;
    }

    const errors = [];
    if (recipe.template !== template.name) {
      errors.push(`must stay in the ${template.name} family, got "${recipe.template}"`);
    } else {
      errors.push(...validateRecipe(recipe, template, ingredients).errors);
    }

    if (errors.length === 0) return { recipe, attempts: attempt };

    feedback = errors.map((e) => `- ${e}`).join('\n');
  }

  throw new Error(`generateValidatedRefinement: no valid drink after ${maxAttempts} attempts`);
}