/**
 * Transcendence — the third and deepest prestige layer, above Ascension and
 * Sectors. Once you have ascended enough times you can Transcend: a total reset
 * of the mineral game (run, Dark Matter, Singularity Cores, sectors, research,
 * artifacts — everything below) in exchange for Crystals.
 *
 * Crystals are the new meta-currency. They make the *old* bonuses irrelevant:
 * the entire empire is wiped, and what carries you forward is the permanent
 * Crystal Matrix you build with them. The Matrix's first tiers improve the
 * Crystal layer itself (more Crystals per Transcend, a production multiplier
 * that survives every reset so each re-climb is faster); deeper tiers will
 * unlock further content.
 */

/** Ascensions (since the last Transcend) required to Transcend. */
export const TRANSCEND_ASCENSIONS = 5;

/** Permanent all-production multiplier granted per Crystal ever earned. */
export const CRYSTAL_BONUS = 0.5;

/** Whether the Transcendence layer has ever been unlocked (first 5th ascension). */
export function transcendUnlocked(ascensionCount: number): boolean {
  return ascensionCount >= TRANSCEND_ASCENSIONS;
}

/** Whether a Transcend is available right now. */
export function canTranscend(ascensionsSinceTranscend: number): boolean {
  return ascensionsSinceTranscend >= TRANSCEND_ASCENSIONS;
}

/**
 * Raw Crystals offered for transcending now: one per ascension past the gate,
 * so deeper cycles pay more. Returns 0 until the gate is met.
 */
export function pendingCrystals(ascensionsSinceTranscend: number): number {
  if (ascensionsSinceTranscend < TRANSCEND_ASCENSIONS) return 0;
  return ascensionsSinceTranscend - TRANSCEND_ASCENSIONS + 1;
}

/** Ascensions still needed before the next Transcend becomes available. */
export function nextTranscendIn(ascensionsSinceTranscend: number): number {
  return Math.max(0, TRANSCEND_ASCENSIONS - ascensionsSinceTranscend);
}

/** Actual Crystals gained, after the Crystal Lattice yield bonus. */
export function crystalGain(
  ascensionsSinceTranscend: number,
  crystalUpgrades: Record<string, number>,
): number {
  return Math.floor(pendingCrystals(ascensionsSinceTranscend) * crystalYieldMult(crystalUpgrades));
}

/** Permanent production multiplier from total Crystals ever earned. */
export function crystalMult(totalCrystals: number): number {
  return 1 + CRYSTAL_BONUS * totalCrystals;
}

/**
 * Leveled Crystal Matrix upgrades — bought with Crystals, they survive every
 * Transcend. The first ones improve the Crystal economy itself.
 */
export interface CrystalUpgradeDef {
  id: string;
  name: string;
  perLevel: string;
  /** Cost of the next level is baseCost * (currentLevel + 1), in Crystals. */
  baseCost: number;
  maxLevel: number;
  kind: 'yield' | 'global' | 'tap' | 'formation';
  pct: number;
  /** IconName from the art layer (kept as string to stay React-free). */
  icon: string;
}

export const CRYSTAL_UPGRADES: CrystalUpgradeDef[] = [
  {
    id: 'crystal_lattice',
    name: 'Crystal Lattice',
    perLevel: '+25% Resonance gained per Cascade',
    baseCost: 1,
    maxLevel: 50,
    kind: 'yield',
    pct: 0.25,
    icon: 'belt_resonance',
  },
  {
    id: 'crystal_resonance',
    name: 'Resonance Field',
    perLevel: '+100% all production (survives Transcend)',
    baseCost: 2,
    maxLevel: 50,
    kind: 'global',
    pct: 1,
    icon: 'dark_compression',
  },
  {
    id: 'crystal_clarity',
    name: 'Crystal Clarity',
    perLevel: '+150% tap power (survives Transcend)',
    baseCost: 2,
    maxLevel: 50,
    kind: 'tap',
    pct: 1.5,
    icon: 'kinetic_amplifier',
  },
  {
    id: 'crystal_prism',
    name: 'Crystal Prism',
    perLevel: '+50% bonus crystals per formation shatter',
    baseCost: 3,
    maxLevel: 30,
    kind: 'formation',
    pct: 0.5,
    icon: 'shard',
  },
  {
    id: 'void_amplifier',
    name: 'Void Amplifier',
    perLevel: '+50% all crystal production (survives Transcend)',
    baseCost: 5,
    maxLevel: 30,
    kind: 'global',
    pct: 0.5,
    icon: 'quantum_reserves',
  },
];

export const CRYSTAL_UPGRADES_BY_ID: Record<string, CrystalUpgradeDef> = Object.fromEntries(
  CRYSTAL_UPGRADES.map((u) => [u.id, u]),
);

export function crystalUpgradeCost(def: CrystalUpgradeDef, level: number): number {
  return def.baseCost * (level + 1);
}

/** Crystal-gain multiplier from the Crystal Lattice levels. */
export function crystalYieldMult(levels: Record<string, number>): number {
  let mult = 1;
  for (const def of CRYSTAL_UPGRADES) {
    if (def.kind !== 'yield') continue;
    mult += def.pct * (levels[def.id] ?? 0);
  }
  return mult;
}

/** Formation shatter bonus multiplier from Crystal Prism levels. */
export function crystalFormationBonusMult(levels: Record<string, number>): number {
  let mult = 1;
  for (const def of CRYSTAL_UPGRADES) {
    if (def.kind !== 'formation') continue;
    mult += def.pct * (levels[def.id] ?? 0);
  }
  return mult;
}

export interface CrystalPowers {
  globalMult: number;
  tapMult: number;
}

/** Production / tap multipliers from the Crystal Matrix (excludes yield). */
export function crystalPowers(levels: Record<string, number>): CrystalPowers {
  let globalMult = 1;
  let tapMult = 1;
  for (const def of CRYSTAL_UPGRADES) {
    const level = levels[def.id] ?? 0;
    if (level <= 0) continue;
    if (def.kind === 'global') globalMult *= 1 + def.pct * level;
    else if (def.kind === 'tap') tapMult *= 1 + def.pct * level;
  }
  return { globalMult, tapMult };
}

export function crystalTotalEffect(def: CrystalUpgradeDef, level: number): string {
  const pctTotal = Math.round(def.pct * level * 100);
  if (def.kind === 'yield') return `+${pctTotal}% Resonance`;
  if (def.kind === 'formation') return `+${pctTotal}% shatter bonus`;
  return `+${pctTotal}% ${def.kind === 'global' ? 'production' : 'tap'}`;
}
