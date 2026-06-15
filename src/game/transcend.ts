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
 * Leveled Crystal Matrix upgrades — bought with Attunement (earned only from a
 * Resonance Cascade), they survive every reset. The first ones improve the
 * Crystal economy itself.
 */
export interface CrystalUpgradeDef {
  id: string;
  name: string;
  perLevel: string;
  /** Cost of the next level is baseCost * (currentLevel + 1), in Attunement. */
  baseCost: number;
  maxLevel: number;
  kind: 'yield' | 'global' | 'tap' | 'formation' | 'resonancePower';
  pct: number;
  /** IconName from the art layer (kept as string to stay React-free). */
  icon: string;
  /** Deep-tier gate: hidden/locked until Resonance reaches this level. */
  unlockResonance?: number;
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
  // ── Deep tier — unlocked by reaching Resonance milestones ──────────────────
  {
    id: 'crystal_amplifier',
    name: 'Resonance Amplifier',
    perLevel: '+20% to the production bonus from each Resonance level',
    baseCost: 5,
    maxLevel: 20,
    kind: 'resonancePower',
    pct: 0.2,
    icon: 'belt_resonance',
    unlockResonance: 3,
  },
  {
    id: 'crystal_fracture',
    name: 'Fracture Engine',
    perLevel: '+100% bonus crystals per formation shatter',
    baseCost: 6,
    maxLevel: 20,
    kind: 'formation',
    pct: 1,
    icon: 'shard',
    unlockResonance: 5,
  },
  {
    id: 'crystal_singularity',
    name: 'Singularity Core',
    perLevel: '+200% all crystal production (survives Transcend)',
    baseCost: 8,
    maxLevel: 25,
    kind: 'global',
    pct: 2,
    icon: 'temporal_vault',
    unlockResonance: 8,
  },
];

export const CRYSTAL_UPGRADES_BY_ID: Record<string, CrystalUpgradeDef> = Object.fromEntries(
  CRYSTAL_UPGRADES.map((u) => [u.id, u]),
);

/**
 * Geometric cost growth per Matrix level. Keeps the first levels cheap but makes
 * deep levels expensive, so the big production multipliers stay long-term goals
 * instead of maxing the moment Attunement floods in (which trivialised the late
 * game and made cascades near-instant past ~Resonance 10).
 */
export const CRYSTAL_UPGRADE_GROWTH = 1.6;

export function crystalUpgradeCost(def: CrystalUpgradeDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(CRYSTAL_UPGRADE_GROWTH, level));
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

/**
 * Multiplier applied to the per-Resonance-level production bonus, from the
 * Resonance Amplifier. Pass `RESONANCE_BONUS × this` to resonanceMult so each
 * Resonance level is worth proportionally more.
 */
export function resonancePowerMult(levels: Record<string, number>): number {
  let mult = 1;
  for (const def of CRYSTAL_UPGRADES) {
    if (def.kind !== 'resonancePower') continue;
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
  if (def.kind === 'resonancePower') return `+${pctTotal}% Resonance power`;
  return `+${pctTotal}% ${def.kind === 'global' ? 'production' : 'tap'}`;
}
