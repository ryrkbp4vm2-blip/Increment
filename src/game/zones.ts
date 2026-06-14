/**
 * Sectors (zones) — the layer above ascension. After enough ascensions in the
 * current sector you can Warp to the next one: a deep reset (run + Dark Matter
 * + spendable cores) that grants a large permanent production multiplier and a
 * fresh, visually distinct belt. Collections, research, perks and the
 * singularity multiplier carry over.
 */

/** Ascensions required (since the last warp) to unlock the next sector. */
export const ZONE_WARP_ASCENSIONS = 5;
/** Permanent all-production multiplier granted per sector reached. */
export const SECTOR_PRODUCTION_MULT = 50;

const SECTOR_NAMES = [
  'Orion Belt',
  'Helix Reach',
  'Pillars of Creation',
  'Andromeda Fringe',
  'Sagittarius Veil',
  'Boötes Void',
];

export function sectorName(sector: number): string {
  const name = SECTOR_NAMES[sector % SECTOR_NAMES.length];
  const lap = Math.floor(sector / SECTOR_NAMES.length);
  return lap > 0 ? `${name} ${lap + 1}` : name;
}

/** Whether a warp to the next sector is available. */
export function canWarp(ascensionsSinceWarp: number): boolean {
  return ascensionsSinceWarp >= ZONE_WARP_ASCENSIONS;
}

/** Permanent production multiplier from the current sector. */
export function sectorMult(sector: number): number {
  return SECTOR_PRODUCTION_MULT ** sector;
}
