// Pure ABV engine. No DB, no network — just math on plain data.
// This is deliberately app-owned: LLMs are unreliable at both the arithmetic
// AND the underlying ABV facts, so we never ask the model for either.

// Convert common bar units to fluid ounces (our canonical volume unit).
const UNIT_TO_OZ = {
  oz: 1,
  ml: 0.033814,
  dash: 0.03125,     // ~1/32 oz, standard bar dash
  barspoon: 0.1667,  // ~1 tsp / ~5 ml
  tsp: 0.1667,
  splash: 0.25,      // rough; a "splash" is inherently imprecise
  whole: 0,          // countable garnish, no meaningful liquid
  garnish: 0,
};

// Water added as a FRACTION of pre-dilution liquid volume, by prep method.
// Note: water from melting ice, so new_ABV = old_ABV / (1 + x).
const DILUTION_BY_METHOD = {
  stirred: 0.25,     // e.g. Martini, Old Fashioned
  shaken: 0.30,      // e.g. Daiquiri, Sidecar
  built: 0.20,       // built over ice in the glass, e.g. Highball
  none: 0,           // served up with no ice contact (rare)
};

// Convert an amount in any supported unit into fluid ounces.
// e.g. toOz(2, 'dash') -> 2 * 0.03125 = 0.0625 oz
function toOz(amount, unit) {
  const factor = UNIT_TO_OZ[unit];
  if (factor === undefined) {
    throw new Error(`Unknown unit "${unit}". Add it to UNIT_TO_OZ.`);
  }
  return amount * factor;
}

/**
 * Compute the ABV of a drink.
 * @param {Array<{amount:number, unit:string, abv:number}>} ingredients
 * @param {string} method  'stirred' | 'shaken' | 'built' | 'none'
 * @returns {{ abv:number, totalVolumeOz:number, alcoholVolumeOz:number }}
 */
export function calculateAbv(ingredients, method) {
  // method is required — refuse to guess how the drink was mixed.
  if (method === undefined) {
    throw new Error('calculateAbv: `method` is required (stirred|shaken|built|none).');
  }

  const dilution = DILUTION_BY_METHOD[method];
  if (dilution === undefined) {
    throw new Error(`Unknown dilution method "${method}".`);
  }

  let liquidOz = 0;
  let alcoholOz = 0;

  for (const { amount, unit, abv } of ingredients) {
    const volOz = toOz(amount, unit);
    liquidOz += volOz;
    alcoholOz += volOz * (abv / 100); // convert abv % to decimal
  }

  const waterOz = liquidOz * dilution;
  const totalVolumeOz = liquidOz + waterOz;
  const abv = totalVolumeOz === 0 ? 0 : (alcoholOz / totalVolumeOz) * 100; // convert abv decimal to %

  // rounding trick for precision
  // * 10 / 10   -> 1 decimal place
  // * 100 / 100 -> 2 decimal places
  return {
    abv: Math.round(abv * 10) / 10,
    totalVolumeOz: Math.round(totalVolumeOz * 100) / 100,
    alcoholVolumeOz: Math.round(alcoholOz * 100) / 100,
  };
}

export { UNIT_TO_OZ, DILUTION_BY_METHOD };
