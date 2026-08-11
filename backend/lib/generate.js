// Orchestration: the full "generate a drink" flow, tying together the
// pure/thin pieces — build the prompt, call the model, parse the response,
// and validate-and-regenerate loop.
import { buildGenerationPrompt } from './prompt.js';
import { callLlm } from './llm.js';
import { parseRecipe } from './parse.js';
import { validateRecipe } from './validator.js';

/**
 * Generate one recipe within a template — a single attempt, no validation.
 * The low-level building block; generateValidatedDrink() wraps this in the
 * validate-and-retry loop.
 * @param {object} args
 * @param {object} args.template     A template row (with parsed `structure` array).
 * @param {Array<object>} args.ingredients  The allowed ingredient palette.
 * @param {string} args.brief        The host's flavor request.
 * @param {Array<object>} [args.examples]  Optional past drinks to steer taste.
 * @param {string} [args.feedback]   On a retry, the validator errors to fix.
 * @returns {Promise<object>} a parsed (but NOT yet validated) recipe object.
 */
export async function generateDrink({ template, ingredients, brief, examples = [], feedback = '' }) {
  const prompt = buildGenerationPrompt({ template, ingredients, brief, examples, feedback});
  const raw = await callLlm(prompt);
  const recipe = parseRecipe(raw);
  return recipe;
}

/**
 * Generate a recipe that PASSES validation, retrying with feedback on failure.
 * This is the not-a-wrapper enforcement loop: the model proposes, our validator
 * decides, and rejected attempts are re-generated with the errors fed back.
 * @param {object} args  template, ingredients, brief, examples
 * @param {number} [args.maxAttempts=3]  how many tries before giving up
 * @returns {Promise<{recipe:object, attempts:number}>}
 * @throws if no attempt passes within maxAttempts.
 */
export async function generateValidatedDrink({ template, ingredients, brief, examples = [], maxAttempts = 3, }) {
  let feedback = '';
  let lastErrors = [];
 
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let recipe;
    try {
      recipe = await generateDrink({ template, ingredients, brief, examples, feedback });
    } catch (err) {
      // A parse failure is also a reason to retry with feedback.
      lastErrors = [err.message]; // array with the single error message
      feedback = `- ${err.message}`; // string with single error message formatted 
      continue;
    }
 
    const { valid, errors } = validateRecipe(recipe, template, ingredients);
    if (valid) {
      return { recipe, attempts: attempt };
    }
 
    // There may be multiple errors from the validator.
    lastErrors = errors;
    feedback = errors.map((e) => `- ${e}`).join('\n');
  }
 
  throw new Error(
    `generateValidatedDrink: no valid drink after ${maxAttempts} attempts. Last issues:\n${lastErrors.join('\n')}`
  );
}