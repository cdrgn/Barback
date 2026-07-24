// Curated ingredient palette — the app's ground-truth data.
// Two jobs: (1) the vocabulary the LLM may compose from, (2) the ABV source
// for the calculation. Adjust ABVs as needed.
//
// category = structural role, used by balance rules + the validator:
//   spirit    – base backbone (the drink's core)
//   liqueur   – alcoholic + sweet/flavored modifier (Cointreau, maraschino)
//   fortified – wine-based modifier (vermouth, sherry, aperitivo wine)
//   citrus    – acid (lemon, lime juice)
//   sweetener – non-alcoholic sugar (simple, honey, agave)
//   bitter    – bittering agent (bitters, amaro, Campari/Aperol)
//   sparkling – lengthener with bubbles (soda, tonic, sparkling wine)
//   aromatic  – non-alcoholic flavor/accent (juices, egg, saline, mint)
//   garnish   – negligible volume (peel, cherry)

export const INGREDIENTS = [
  // --- spirits (backbone) ---
  { name: 'gin',                 category: 'spirit',    abv: 40 },
  { name: 'vodka',               category: 'spirit',    abv: 40 },
  { name: 'white rum',           category: 'spirit',    abv: 40 },
  { name: 'aged rum',            category: 'spirit',    abv: 40 },
  { name: 'blanco tequila',      category: 'spirit',    abv: 40 },
  { name: 'reposado tequila',    category: 'spirit',    abv: 40 },
  { name: 'mezcal',              category: 'spirit',    abv: 45 },
  { name: 'bourbon',             category: 'spirit',    abv: 45 },
  { name: 'rye whiskey',         category: 'spirit',    abv: 45 },
  { name: 'scotch whisky',       category: 'spirit',    abv: 40 },
  { name: 'cognac',              category: 'spirit',    abv: 40 },
  { name: 'brandy',              category: 'spirit',    abv: 40 },
  { name: 'pisco',               category: 'spirit',    abv: 40 },

  // --- liqueurs (alcoholic sweet/flavor modifiers) ---
  { name: 'cointreau',           category: 'liqueur',   abv: 40 }, // orange
  { name: 'triple sec',          category: 'liqueur',   abv: 30 },
  { name: 'grand marnier',       category: 'liqueur',   abv: 40 },
  { name: 'maraschino liqueur',  category: 'liqueur',   abv: 32 },
  { name: 'green chartreuse',    category: 'liqueur',   abv: 55 },
  { name: 'yellow chartreuse',   category: 'liqueur',   abv: 40 },
  { name: 'elderflower liqueur', category: 'liqueur',   abv: 20 },
  { name: 'coffee liqueur',      category: 'liqueur',   abv: 20 },
  { name: 'amaretto',            category: 'liqueur',   abv: 24 },

  // --- fortified / aromatized wines ---
  { name: 'dry vermouth',        category: 'fortified', abv: 18 },
  { name: 'sweet vermouth',      category: 'fortified', abv: 16 },
  { name: 'blanc vermouth',      category: 'fortified', abv: 16 },
  { name: 'dry sherry',          category: 'fortified', abv: 17 },
  { name: 'lillet blanc',        category: 'fortified', abv: 17 },

  // --- bitters / amari / aperitivo ---
  { name: 'angostura bitters',   category: 'bitter',    abv: 44 },
  { name: 'orange bitters',      category: 'bitter',    abv: 28 },
  { name: 'campari',             category: 'bitter',    abv: 24 },
  { name: 'aperol',              category: 'bitter',    abv: 11 },
  { name: 'amaro nonino',        category: 'bitter',    abv: 35 },

  // --- citrus (acid) ---
  { name: 'lime juice',          category: 'citrus',    abv: 0 },
  { name: 'lemon juice',         category: 'citrus',    abv: 0 },
  { name: 'grapefruit juice',    category: 'citrus',    abv: 0 },

  // --- sweeteners (non-alcoholic) ---
  { name: 'simple syrup',        category: 'sweetener', abv: 0 },
  { name: 'demerara syrup',      category: 'sweetener', abv: 0 },
  { name: 'honey syrup',         category: 'sweetener', abv: 0 },
  { name: 'agave syrup',         category: 'sweetener', abv: 0 },
  { name: 'orgeat',              category: 'sweetener', abv: 0 }, // almond
  { name: 'grenadine',           category: 'sweetener', abv: 0 },

  // --- sparkling / lengtheners ---
  { name: 'soda water',          category: 'sparkling', abv: 0 },
  { name: 'tonic water',         category: 'sparkling', abv: 0 },
  { name: 'ginger beer',         category: 'sparkling', abv: 0 },
  { name: 'sparkling wine',      category: 'sparkling', abv: 12 },
  { name: 'cola',                category: 'sparkling', abv: 0 },

  // --- aromatic / non-alcoholic accents ---
  { name: 'egg white',           category: 'aromatic',  abv: 0 },
  { name: 'whole egg',           category: 'aromatic',  abv: 0 },
  { name: 'pineapple juice',     category: 'aromatic',  abv: 0 },
  { name: 'cranberry juice',     category: 'aromatic',  abv: 0 },
  { name: 'saline solution',     category: 'aromatic',  abv: 0 },
  { name: 'mint',                category: 'aromatic',  abv: 0 },

  // --- garnishes (negligible volume) ---
  { name: 'lemon peel',          category: 'garnish',   abv: 0 },
  { name: 'orange peel',         category: 'garnish',   abv: 0 },
  { name: 'lime wheel',          category: 'garnish',   abv: 0 },
  { name: 'cocktail cherry',     category: 'garnish',   abv: 0 },
];
