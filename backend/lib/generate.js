// Orchestration: the full "generate a drink" flow, tying together the three
// pure/thin pieces — build the prompt, call the model, parse the response.
// This is where a route handler (step 9) will call in.
import { buildGenerationPrompt } from './prompt.js';
import { callLlm } from './llm.js';
import { parseRecipe } from './parse.js';

/**
 * Generate one cocktail recipe within a template, from a host brief.
 * @param {object} args
 * @param {object} args.template     A template row (with parsed `structure` array).
 * @param {Array<object>} args.ingredients  The allowed ingredient palette.
 * @param {string} args.brief        The host's flavor request.
 * @param {Array<object>} [args.examples]  Optional past drinks to steer taste.
 * @returns {Promise<object>} a validated recipe object (not yet poured/stored).
 */
export async function generateDrink({ template, ingredients, brief, examples = [] }) {
  const prompt = buildGenerationPrompt({ template, ingredients, brief, examples });
  const raw = await callLlm(prompt);
  const recipe = parseRecipe(raw);
  return recipe;
}