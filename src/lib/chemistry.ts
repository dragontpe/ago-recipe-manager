export interface Dilution {
  concentrate: number;
  water: number;
}

export interface ChemistryResult {
  developerMl: number;
  waterMl: number;
}

/**
 * Parse a dilution string like "1+100", "1:50", or "Stock" into parts.
 * Returns null if the string can't be parsed.
 */
export function parseDilution(str: string): Dilution | null {
  if (!str) return null;
  const trimmed = str.trim();

  if (/^stock$/i.test(trimmed)) {
    return { concentrate: 1, water: 0 };
  }

  // Match patterns like "1+100", "1:50", "1+0"
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*[+:]\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const concentrate = parseFloat(match[1]);
  const water = parseFloat(match[2]);
  if (isNaN(concentrate) || isNaN(water) || concentrate <= 0) return null;

  return { concentrate, water };
}

/**
 * Calculate developer and water amounts for a given total volume and dilution.
 */
export function calculateChemistry(totalMl: number, dilution: Dilution): ChemistryResult {
  const totalParts = dilution.concentrate + dilution.water;
  if (totalParts === 0) return { developerMl: 0, waterMl: totalMl };

  const developerMl = Math.round((totalMl * dilution.concentrate / totalParts) * 10) / 10;
  const waterMl = Math.round((totalMl - developerMl) * 10) / 10;

  return { developerMl, waterMl };
}
