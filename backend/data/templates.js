// The 6 Cocktail Codex root templates — the app's "grammar".
// Each template merges what used to be two separate things (a balance rule and a
// canonical recipe) into ONE `structure` array. Each entry is a role in the drink,
// with an example ingredient and a REFERENCE amount:
//   { role, example, amount, unit }
//
// `structure` serves three jobs at once:
//   - generation: the roles + reference proportions the LLM builds within
//   - classic pour: the example ingredients with their amounts ARE the classic recipe
//   - validator: the roles present are the ones a valid drink must include
//
// Field order mirrors the LLM output contract (structure≈ingredients, then
// garnish, steps, notes) so a template and a generated drink read in parallel:
//   garnish — free-text label (display only)
//   steps   — preparation instructions
//   notes   — prose guidance, INCLUDING any "don't" warnings (e.g. no citrus in a flip)
//
// role matches an ingredient's palette category, so the validator can check
// "does this drink contain an ingredient of each required role?"

export const TEMPLATES = [
  {
    name: 'old_fashioned',
    display_name: 'Old Fashioned',
    default_method: 'stirred',
    structure: [
      { role: 'spirit',    example: 'bourbon',           amount: 2, unit: 'oz' },
      { role: 'sweetener', example: 'demerara syrup',    amount: 1, unit: 'tsp' },
      { role: 'bitter',    example: 'angostura bitters', amount: 2, unit: 'dash' },
      { role: 'bitter',    example: 'aromatic bitters',  amount: 1, unit: 'dash' },
    ],
    garnish: 'orange twist and lemon twist',
    steps: 'Stir all ingredients over ice until well chilled. Strain over one large cube in a rocks glass. Express the orange and lemon twists over the top and add.',
    notes: 'Spirit-forward: a spirit lightly sweetened and seasoned with bitters. No citrus juice (an expressed twist for aroma is fine).',
  },
  {
    name: 'martini',
    display_name: 'Martini',
    default_method: 'stirred',
    structure: [
      { role: 'spirit',    example: 'gin',          amount: 2,    unit: 'oz' },
      { role: 'fortified', example: 'dry vermouth', amount: 0.75, unit: 'oz' },
    ],
    garnish: 'lemon twist or olive',
    steps: 'Stir gin and vermouth over ice until very cold. Strain into a chilled cocktail glass. Garnish with a lemon twist or an olive.',
    notes: 'A spirit lengthened and seasoned with fortified wine (e.g. vermouth). Stirred cold and clear, no citrus juice. Optional bitters.',
  },
  {
    name: 'daiquiri',
    display_name: 'Daiquiri',
    default_method: 'shaken',
    structure: [
      { role: 'spirit',    example: 'white rum',    amount: 2,    unit: 'oz' },
      { role: 'citrus',    example: 'lime juice',   amount: 0.75, unit: 'oz' },
      { role: 'sweetener', example: 'simple syrup', amount: 0.75, unit: 'oz' },
    ],
    garnish: 'lime wedge',
    steps: 'Shake all ingredients with ice until well chilled. Double strain into a chilled coupe. Garnish with a lime wedge.',
    notes: 'The exposed sour: spirit, fresh citrus, and a sugar-based sweetener in balance. The sweetener is a syrup, not a liqueur (that is the Sidecar family).',
  },
  {
    name: 'sidecar',
    display_name: 'Sidecar',
    default_method: 'shaken',
    structure: [
      { role: 'spirit',    example: 'cognac',       amount: 1.5,  unit: 'oz' },
      { role: 'liqueur',   example: 'cointreau',    amount: 1,    unit: 'oz' },
      { role: 'citrus',    example: 'lemon juice',  amount: 0.75, unit: 'oz' },
      { role: 'sweetener', example: 'simple syrup', amount: 1,    unit: 'tsp' },
    ],
    garnish: 'orange twist',
    steps: 'Shake all ingredients with ice. Double strain into a chilled coupe. Express an orange twist over the top and add.',
    notes: 'A sour whose sweetness comes largely from a liqueur (often orange), adding aromatic depth. A small touch of syrup may round it.',
  },
  {
    name: 'whisky_highball',
    display_name: 'Whisky Highball',
    default_method: 'built',
    structure: [
      { role: 'spirit',    example: 'scotch whisky', amount: 2, unit: 'oz' },
      { role: 'sparkling', example: 'soda water',    amount: 6, unit: 'oz' },
    ],
    garnish: 'lemon wedge',
    steps: 'Fill a highball glass with ice. Add the whisky, then top with chilled soda water. Give one gentle stir from the bottom up. Garnish with a lemon wedge.',
    notes: 'A spirit stretched long with a carbonated mixer, roughly 1 part spirit to 3 parts soda. Built over ice, stirred minimally to keep the fizz.',
  },
  {
    name: 'flip',
    display_name: 'Flip',
    default_method: 'shaken',
    structure: [
      { role: 'spirit',    example: 'aged rum',  amount: 2, unit: 'oz' },
      { role: 'aromatic',  example: 'whole egg', amount: 1, unit: 'whole' },
      { role: 'sweetener', example: 'sugar',     amount: 2, unit: 'tsp' },
    ],
    garnish: 'grated nutmeg',
    steps: 'Add all ingredients to a shaker. Dry shake without ice to emulsify. Add ice and shake hard. Fine strain into a small chilled glass. Grate fresh nutmeg over the top.',
    notes: 'Base is a spirit OR fortified wine, enriched with a WHOLE EGG for a dense, creamy texture, plus a little sugar. Dry-shake first to emulsify. NEVER add citrus juice — it curdles the egg.',
  },
];