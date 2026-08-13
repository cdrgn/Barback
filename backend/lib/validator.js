// Pure validator. No LLM, no DB — takes a recipe + the template it should fit +
// the allowed ingredients, and returns {valid, errors}. This is the not-a-wrapper
// enforcement: code checks the drink's real structure, rather than trusting the
// model's self-report. Collects ALL errors (not just the first) so the regenerate
// loop can feed complete feedback back to the model.

/**
 * Validate a recipe against a template.
 * @param {object} recipe    {ingredients:[{name,amount,unit}], ...}
 * @param {object} template  {structure:[{role,example,amount,unit}], ...}
 * @param {Array<{name,category}>} palette  Allowed ingredients (category = role).
 * @returns {{valid:boolean, errors:string[]}}
 */
export function validateRecipe(recipe, template, palette) {
  const errors = [];
  const roleByName = new Map(palette.map((p) => [p.name, p.category]));
  // roleByName = Map { 'gin' => 'spirit', 'vodka' => 'spirit', }

  // --- Check 2: every ingredient must be an allowed palette ingredient ---
  for (const ing of recipe.ingredients) {
    if (!roleByName.has(ing.name)) {
      errors.push(`"${ing.name}" is not an allowed ingredient`);
    }
  }

  // Roles actually present in the drink (only for recognized ingredients).
  const rolesPresent = new Set();
  for (const ing of recipe.ingredients) {
    const role = roleByName.get(ing.name);
    if (role) rolesPresent.add(role);
  }

  // --- Check 1: every required role from the template must be present ---
  const requiredRoles = [...new Set(template.structure.map((s) => s.role))]; // copy each item from the set into the array
  // requiredRoles = [...Set { 'spirit', 'sweetener', 'bitter' }] = ['spirit', 'sweetener', 'bitter']
  for (const role of requiredRoles) {
    if (!rolesPresent.has(role)) {
      errors.push(`missing required role: ${role}`);
    }
  }

  return { valid: errors.length === 0, errors };
}