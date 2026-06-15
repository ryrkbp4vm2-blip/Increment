/**
 * Sectors (zones) — the layer above ascension. After enough ascensions in the
 * current sector you can Warp to the next one: a deep reset (run + Dark Matter
 * + spendable cores) that grants a large permanent production multiplier and a
 * fresh, visually distinct belt. Collections, research, perks and the
 * singularity multiplier carry over.
 */

/** Ascensions required (since the last warp) to unlock the next sector. */
export const ZONE_WARP_ASCENSIONS = 3;
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

/**
 * Each sector has its own personality on top of the flat ×50 power gain, so a
 * warp doesn't just mean "same game, bigger numbers". Traits pull on three
 * felt levers:
 *  - `productionMult`: passive minerals/sec (rewards idling),
 *  - `tapMult`: tap power (rewards active play),
 *  - `hpMult`: asteroid toughness — lower means rocks shatter faster, so the
 *     belt (and its shatter bonuses + Research Points) flows quicker.
 * Traits cycle with the sector name, so each "lap" of sectors replays the same
 * distinct flavours at a higher power tier.
 */
export interface SectorTrait {
  /** Short flavour name shown in the belt header, e.g. "Dense Spiral". */
  trait: string;
  /** One-line description of how this sector plays differently. */
  blurb: string;
  productionMult: number;
  tapMult: number;
  hpMult: number;
}

const SECTOR_TRAITS: SectorTrait[] = [
  {
    trait: 'Home Belt',
    blurb: 'Familiar, balanced rock. No quirks — the baseline belt.',
    productionMult: 1,
    tapMult: 1,
    hpMult: 1,
  },
  {
    trait: 'Dense Spiral',
    blurb: 'Mineral-rich but stubborn: ×1.5 production, but rocks take twice the hits.',
    productionMult: 1.5,
    tapMult: 1,
    hpMult: 2,
  },
  {
    trait: 'Stellar Nursery',
    blurb: 'An idler’s haven: ×2 passive production, but taps land at half power.',
    productionMult: 2,
    tapMult: 0.5,
    hpMult: 1,
  },
  {
    trait: 'Volatile Frontier',
    blurb: 'Hands-on country: ×3 tap power, but passive output drops to ×0.8.',
    productionMult: 0.8,
    tapMult: 3,
    hpMult: 1,
  },
  {
    trait: 'Brittle Shoals',
    blurb: 'Rocks crack at a touch — the belt (and Research) races by at ×0.4 HP.',
    productionMult: 0.9,
    tapMult: 1,
    hpMult: 0.4,
  },
  {
    trait: 'The Great Nothing',
    blurb: 'High stakes: ×2.5 production and ×2 taps, but rocks are 4× as tough.',
    productionMult: 2.5,
    tapMult: 2,
    hpMult: 4,
  },
];

/** The cycling personality of the given sector. */
export function sectorTrait(sector: number): SectorTrait {
  return SECTOR_TRAITS[sector % SECTOR_TRAITS.length];
}
