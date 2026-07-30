import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGenerationPrompt, formatStructure, formatIngredients } from '../lib/prompt.js';

// A minimal fake template + ingredients so tests don't depend on the DB.
const template = {
  display_name: 'Daiquiri',
  default_method: 'shaken',
  structure: [
    { role: 'spirit',    example: 'white rum',    amount: 2,    unit: 'oz' },
    { role: 'citrus',    example: 'lime juice',   amount: 0.75, unit: 'oz' },
    { role: 'sweetener', example: 'simple syrup', amount: 0.75, unit: 'oz' },
  ],
  notes: 'The exposed sour: spirit, citrus, sweetener in balance.',
};

const ingredients = [
  { name: 'white rum', category: 'spirit' },
  { name: 'lime juice', category: 'citrus' },
  { name: 'simple syrup', category: 'sweetener' },
];

const brief = 'something bright and tart, not too sweet';

test('prompt includes the template name', () => {
  const p = buildGenerationPrompt({ template, ingredients, brief });
  assert.ok(p.includes('Daiquiri'), 'missing template name');
});

test('prompt includes structure roles with reference proportions', () => {
  const p = buildGenerationPrompt({ template, ingredients, brief });
  assert.ok(p.includes('spirit (e.g. white rum): 2 oz'), 'missing role/proportion line');
  assert.ok(p.includes('citrus (e.g. lime juice): 0.75 oz'), 'missing role/proportion line');
});

test('prompt frames proportions as a guide, not a recipe', () => {
  const p = buildGenerationPrompt({ template, ingredients, brief });
  assert.ok(p.includes('balance guide'), 'missing proportion framing');
});

test('prompt includes the template notes', () => {
  const p = buildGenerationPrompt({ template, ingredients, brief });
  assert.ok(p.includes(template.notes), 'missing notes');
});

test('prompt lists the allowed ingredients', () => {
  const p = buildGenerationPrompt({ template, ingredients, brief });
  assert.ok(p.includes('white rum'), 'missing ingredient');
  assert.ok(p.includes('lime juice'), 'missing ingredient');
});

test('prompt includes the host brief', () => {
  const p = buildGenerationPrompt({ template, ingredients, brief });
  assert.ok(p.includes(brief), 'missing brief');
});

test('prompt specifies the full JSON output contract', () => {
  const p = buildGenerationPrompt({ template, ingredients, brief });
  for (const field of ['name', 'method', 'ingredients', 'garnish', 'steps', 'balance_check']) {
    assert.ok(p.includes(`"${field}"`), `missing ${field} field`);
  }
});

test('examples are included when provided', () => {
  const p = buildGenerationPrompt({
    template, ingredients, brief,
    examples: [{ name: 'Hemingway Daiquiri' }],
  });
  assert.ok(p.includes('Hemingway Daiquiri'), 'missing example drink');
});

test('missing inputs throw', () => {
  assert.throws(() => buildGenerationPrompt({ ingredients, brief }), /template/);
  assert.throws(() => buildGenerationPrompt({ template, brief }), /ingredients/);
  assert.throws(() => buildGenerationPrompt({ template, ingredients }), /brief/);
});

test('formatStructure renders role, example, and amount', () => {
  const out = formatStructure(template.structure);
  assert.ok(out.includes('spirit (e.g. white rum): 2 oz'));
});

test('formatIngredients groups by category', () => {
  const out = formatIngredients(ingredients);
  assert.ok(out.includes('spirit: white rum'));
  assert.ok(out.includes('citrus: lime juice'));
});