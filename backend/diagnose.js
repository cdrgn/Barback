// Throwaway diagnostic — run with: node diagnose.js "your brief here"
// Shows, per attempt: how long the LLM call took, which template it picked,
// whether it passed validation, and if not, WHY. This reveals whether a slow
// "timeout" is really one slow call or the validation retry loop stacking up.
//
// Not part of the app — delete when done. Uses your real API key from .env.
import 'dotenv/config';
import { openDb } from './db/init.js';
import { getTemplates, getIngredients } from './db/queries.js';
import { buildGenerationPrompt } from './lib/prompt.js';
import { callLlm } from './lib/llm.js';
import { parseRecipe } from './lib/parse.js';
import { validateRecipe } from './lib/validator.js';

const brief = process.argv[2] || 'orange mojito';
console.log(`\nDiagnosing brief: "${brief}"\n`);

const db = openDb();
const templates = getTemplates(db);
const ingredients = getIngredients(db);

let feedback = '';
for (let i = 1; i <= 3; i++) {
  const t = Date.now();
  try {
    const raw = await callLlm(buildGenerationPrompt({ templates, ingredients, brief, feedback }));
    const ms = Date.now() - t;

    let recipe;
    try {
      recipe = parseRecipe(raw);
    } catch (e) {
      console.log(`attempt ${i}: ${ms}ms | PARSE FAILED: ${e.message}`);
      feedback = `- ${e.message}`;
      continue;
    }

    const tmpl = templates.find((x) => x.name === recipe.template);
    if (!tmpl) {
      console.log(`attempt ${i}: ${ms}ms | template="${recipe.template}" is UNKNOWN`);
      continue;
    }
    const { valid, errors } = validateRecipe(recipe, tmpl, ingredients);
    if (valid) {
      console.log(`attempt ${i}: ${ms}ms | template=${recipe.template} | VALID ✓ | ingredients: ${recipe.ingredients.map((x) => x.name).join(', ')}`);
      console.log('\nSUCCESS — this brief would work.\n');
      break;
    } else {
      console.log(`attempt ${i}: ${ms}ms | template=${recipe.template} | INVALID: ${errors.join('; ')}`);
      console.log(`   ingredients tried: ${recipe.ingredients.map((x) => x.name).join(', ')}`);
      feedback = errors.map((e) => `- ${e}`).join('\n');
    }
  } catch (e) {
    console.log(`attempt ${i}: ${Date.now() - t}ms | CALL FAILED: ${e.message}`);
  }
}
process.exit(0);