import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGenerationPrompt, formatIngredients, formatTemplateMenu } from '../lib/prompt.js';

// Minimal fake templates + ingredients so tests don't depend on the DB.
const templates = [
  {
    name: 'daiquiri', display_name: 'Daiquiri', default_method: 'shaken',
    structure: [
      { role: 'spirit', example: 'white rum', amount: 2, unit: 'oz' },
      { role: 'citrus', example: 'lime juice', amount: 0.75, unit: 'oz' },
      { role: 'sweetener', example: 'simple syrup', amount: 0.75, unit: 'oz' },
    ],
    notes: 'The exposed sour: spirit, citrus, sweetener in balance.',
    examples: ['daiquiri', 'mojito', 'whiskey sour', 'margarita'],
  },
  {
    name: 'martini', display_name: 'Martini', default_method: 'stirred',
    structure: [{ role: 'spirit', example: 'gin', amount: 2, unit: 'oz' }],
    notes: 'Spirit + fortified.',
    examples: ['martini', 'manhattan', 'negroni'],
  },
];

const ingredients = [
  { name: 'white rum', category: 'spirit' },
  { name: 'lime juice', category: 'citrus' },
  { name: 'simple syrup', category: 'sweetener' },
];

const brief = 'something bright and tart, not too sweet';

test('prompt lists the templates with their examples', () => {
  const p = buildGenerationPrompt({ templates, ingredients, brief });
  assert.ok(p.includes('daiquiri'), 'missing daiquiri name');
  assert.ok(p.includes('mojito'), 'missing example that anchors classification');
});

test('prompt tells the model to classify by named drinks, not surface ingredients', () => {
  const p = buildGenerationPrompt({ templates, ingredients, brief });
  assert.ok(p.includes('named examples'), 'missing classification instruction');
});

test('prompt lists the allowed ingredients grouped by category', () => {
  const p = buildGenerationPrompt({ templates, ingredients, brief });
  assert.ok(p.includes('spirit: white rum'));
  assert.ok(p.includes('citrus: lime juice'));
});

test('prompt includes the host brief', () => {
  const p = buildGenerationPrompt({ templates, ingredients, brief });
  assert.ok(p.includes(brief), 'missing brief');
});

test('prompt specifies the full JSON output contract including template + reasoning', () => {
  const p = buildGenerationPrompt({ templates, ingredients, brief });
  for (const field of ['template', 'reasoning', 'name', 'method', 'ingredients', 'garnish', 'steps', 'description', 'balance_check']) {
    assert.ok(p.includes(`"${field}"`), `missing ${field} field in contract`);
  }
});

test('feedback appears when retrying', () => {
  const p = buildGenerationPrompt({ templates, ingredients, brief, feedback: '- missing required role: sweetener' });
  assert.ok(p.includes('PREVIOUS ATTEMPT WAS REJECTED'));
  assert.ok(p.includes('missing required role: sweetener'));
});

test('missing inputs throw', () => {
  assert.throws(() => buildGenerationPrompt({ ingredients, brief }), /templates/);
  assert.throws(() => buildGenerationPrompt({ templates, brief }), /ingredients/);
  assert.throws(() => buildGenerationPrompt({ templates, ingredients }), /brief/);
});

test('formatTemplateMenu emits each template with its examples', () => {
  const out = formatTemplateMenu(templates);
  assert.ok(out.includes('daiquiri'));
  assert.ok(out.includes('mojito'));
  assert.ok(out.includes('martini'));
});

test('formatIngredients groups by category', () => {
  const out = formatIngredients(ingredients);
  assert.ok(out.includes('spirit: white rum'));
});