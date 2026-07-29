// The 6 Cocktail Codex root templates — the app's "grammar".
// Each template carries 2 things:
//   balance_rule — abstract structure the LLM generates within + the validator checks
//   canonical    — the exact recipe for a "classic" cocktail
//
// balance_rule fields:
//   core      — the backbone role(s) every drink in this template is built on
//   required  — ingredient roles (categories) that must be present
//   forbidden — roles that must NOT appear
//   notes     — free-text nuance for the generation prompt
//
// canonical fields:
//   ingredients — measured amounts (names MUST exist in the ingredient palette)
//   garnish     — free-text label (display only; not a palette ingredient)
//   steps       — preparation instructions

export const TEMPLATES = [
  {
    name: 'old_fashioned',
    display_name: 'Old Fashioned',
    description: 'A spirit lightly sweetened and seasoned with bitters. Spirit-forward, no citrus juice.',
    default_method: 'stirred',
    balance_rule: {
      core: ['spirit'],
      required: ['spirit', 'sweetener', 'bitter'],
      forbidden: ['citrus'],
      notes: 'Spirit dominates. A small measure of sweetener rounds it; a few dashes of bitters season it. No citrus juice (a twist for aroma is fine).',
    },
    canonical: {
      ingredients: [
        { name: 'bourbon',           amount: 2, unit: 'oz' },
        { name: 'demerara syrup',    amount: 1, unit: 'tsp' },
        { name: 'angostura bitters', amount: 2, unit: 'dash' },
        { name: 'aromatic bitters',  amount: 1, unit: 'dash' },
      ],
      garnish: 'orange twist and lemon twist',
      steps: 'Stir all ingredients over ice until well chilled. Strain over one large cube in a rocks glass. Express the orange and lemon twists over the top and add.',
    },
  },
  {
    name: 'martini',
    display_name: 'Martini',
    description: 'A spirit lengthened and seasoned with fortified wine. Stirred cold and clear, no citrus juice.',
    default_method: 'stirred',
    balance_rule: {
      core: ['spirit'],
      required: ['spirit', 'fortified'],
      forbidden: ['citrus'],
      notes: 'Spirit is the core; fortified wine (e.g. vermouth) shapes and lengthens it. Optional bitters. Stirred, served up, no citrus juice.',
    },
    canonical: {
      ingredients: [
        { name: 'gin',          amount: 2,    unit: 'oz' },
        { name: 'dry vermouth', amount: 0.75, unit: 'oz' },
      ],
      garnish: 'lemon twist or olive',
      steps: 'Stir gin and vermouth over ice until very cold. Strain into a chilled cocktail glass. Garnish with a lemon twist or an olive.',
    },
  },
  {
    name: 'daiquiri',
    display_name: 'Daiquiri',
    description: 'A spirit balanced by fresh citrus and sugar — the pure sour. Shaken, served up.',
    default_method: 'shaken',
    balance_rule: {
      core: ['spirit'],
      required: ['spirit', 'citrus', 'sweetener'],
      forbidden: [],
      notes: 'The exposed sour: spirit, fresh citrus, and a sugar-based sweetener in balance, roughly 2 : 0.75 : 0.75. Sweetener is sugar/syrup (not a liqueur — that is the Sidecar template).',
    },
    canonical: {
      ingredients: [
        { name: 'white rum',    amount: 2,    unit: 'oz' },
        { name: 'lime juice',   amount: 0.75, unit: 'oz' },
        { name: 'simple syrup', amount: 0.75, unit: 'oz' },
      ],
      garnish: 'lime wedge',
      steps: 'Shake all ingredients with ice until well chilled. Double strain into a chilled coupe. Garnish with a lime wedge.',
    },
  },
  {
    name: 'sidecar',
    display_name: 'Sidecar',
    description: 'A spirit balanced by citrus and a liqueur sweetener — a richer sour. Shaken, served up.',
    default_method: 'shaken',
    balance_rule: {
      core: ['spirit'],
      required: ['spirit', 'citrus', 'liqueur'],
      forbidden: [],
      notes: 'Like a sour, but the sweetness comes from a liqueur (often orange) rather than plain syrup, adding aromatic depth. A small touch of syrup may round it.',
    },
    canonical: {
      ingredients: [
        { name: 'cognac',       amount: 1.5,  unit: 'oz' },
        { name: 'cointreau',    amount: 1,    unit: 'oz' },
        { name: 'lemon juice',  amount: 0.75, unit: 'oz' },
        { name: 'simple syrup', amount: 1,    unit: 'tsp' },
      ],
      garnish: 'orange twist',
      steps: 'Shake all ingredients with ice. Double strain into a chilled coupe. Express an orange twist over the top and add.',
    },
  },
  {
    name: 'whisky_highball',
    display_name: 'Whisky Highball',
    description: 'A spirit lengthened with a carbonated mixer. Tall, effervescent, built over ice.',
    default_method: 'built',
    balance_rule: {
      core: ['spirit'],
      required: ['spirit', 'sparkling'],
      forbidden: [],
      notes: 'Spirit stretched long with a carbonated mixer, roughly 1 part spirit to 3 parts soda. Built over ice, stirred minimally to keep the fizz.',
    },
    canonical: {
      ingredients: [
        { name: 'scotch whisky', amount: 2, unit: 'oz' },
        { name: 'soda water',    amount: 6, unit: 'oz' },
      ],
      garnish: 'lemon wedge',
      steps: 'Fill a highball glass with ice. Add the whisky, then top with chilled soda water. Give one gentle stir from the bottom up. Garnish with a lemon wedge.',
    },
  },
  {
    name: 'flip',
    display_name: 'Flip',
    description: 'A spirit or fortified wine enriched with a whole egg and sugar. Creamy and rich, no citrus.',
    default_method: 'shaken',
    balance_rule: {
      core: ['spirit', 'fortified'],
      required: ['sweetener'],
      forbidden: ['citrus'],
      notes: 'Base is a spirit OR fortified wine, enriched with a WHOLE EGG for a dense, creamy texture and a little sugar. Dry-shake to emulsify. Never pair with citrus juice (it curdles).',
    },
    canonical: {
      ingredients: [
        { name: 'aged rum',  amount: 2, unit: 'oz' },
        { name: 'whole egg', amount: 1, unit: 'whole' },
        { name: 'sugar',     amount: 2, unit: 'tsp' },
      ],
      garnish: 'grated nutmeg',
      steps: 'Add all ingredients to a shaker. Dry shake without ice to emulsify. Add ice and shake hard. Fine strain into a small chilled glass. Grate fresh nutmeg over the top.',
    },
  },
];