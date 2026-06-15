/**
 * Convergence — the deepest prestige layer, sitting above the Crystal Matrix.
 *
 * Once a crystal cosmos has resonated deeply enough, the player can Converge:
 * the entire crystal layer collapses — crystals, generators, Forge upgrades,
 * Resonance, Attunement and the whole Crystal Matrix all reset — in exchange
 * for Eons (∞), the ultimate meta-currency.
 *
 * Eons give two things that survive every Convergence: a flat permanent boost
 * to all crystal production (so each re-climb is faster), and the Convergence
 * tree below — leveled upgrades that accelerate the whole crystal economy.
 * This is the endgame goal for veterans who have outgrown grinding Resonance.
 */

/** Resonance level required to Converge (and the per-Eon resonance interval). */
export const CONVERGENCE_RESONANCE = 25;

/** Permanent crystal-production multiplier granted per Eon ever earned. */
export const EON_BONUS = 1;

/**
 * How many Eons a Convergence would grant right now. Square-root scaled against
 * the resonance gate so Eons stay scarce: Resonance 25 → 1, 100 → 2, 225 → 3,
 * 400 → 4. The Convergent Will tree multiplies the payout.
 */
export function pendingEons(resonance: number, eonUpgrades: Record<string, number> = {}): number {
  if (resonance < CONVERGENCE_RESONANCE) return 0;
  const raw = Math.sqrt(resonance / CONVERGENCE_RESONANCE);
  return Math.max(1, Math.floor(raw * eonYieldMult(eonUpgrades)));
}

/** Whether a Convergence is available right now. */
export function canConverge(resonance: number): boolean {
  return resonance >= CONVERGENCE_RESONANCE;
}

/** Resonance still needed before the first/next Convergence is available. */
export function nextConvergenceAt(): number {
  return CONVERGENCE_RESONANCE;
}

/** Permanent all-crystal-production multiplier from total Eons ever earned. */
export function eonMult(totalEons: number): number {
  return 1 + EON_BONUS * totalEons;
}

export interface EonUpgradeDef {
  id: string;
  name: string;
  perLevel: string;
  /** Cost of the next level, in Eons (grows geometrically). */
  baseCost: number;
  maxLevel: number;
  kind: 'crystalGlobal' | 'resonanceYield' | 'attuneYield' | 'eonYield';
  pct: number;
  icon: string;
}

export const EON_UPGRADES: EonUpgradeDef[] = [
  {
    id: 'eon_flux',
    name: 'Stellar Flux',
    perLevel: '+50% all crystal production',
    baseCost: 1,
    maxLevel: 25,
    kind: 'crystalGlobal',
    pct: 0.5,
    icon: 'temporal_vault',
  },
  {
    id: 'eon_echo',
    name: 'Resonant Echo',
    perLevel: '+25% Resonance gained per Cascade',
    baseCost: 1,
    maxLevel: 25,
    kind: 'resonanceYield',
    pct: 0.25,
    icon: 'belt_resonance',
  },
  {
    id: 'eon_deep',
    name: 'Deep Attunement',
    perLevel: '+50% Attunement gained per Cascade',
    baseCost: 2,
    maxLevel: 20,
    kind: 'attuneYield',
    pct: 0.5,
    icon: 'shard',
  },
  {
    id: 'eon_will',
    name: 'Convergent Will',
    perLevel: '+20% Eons gained per Convergence',
    baseCost: 3,
    maxLevel: 15,
    kind: 'eonYield',
    pct: 0.2,
    icon: 'quantum_reserves',
  },
];

export const EON_UPGRADES_BY_ID: Record<string, EonUpgradeDef> = Object.fromEntries(
  EON_UPGRADES.map((u) => [u.id, u]),
);

/** Geometric cost growth per Convergence-tree level (Eons are scarce). */
export const EON_UPGRADE_GROWTH = 1.8;

export function eonUpgradeCost(def: EonUpgradeDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(EON_UPGRADE_GROWTH, level));
}

function sumPct(levels: Record<string, number>, kind: EonUpgradeDef['kind']): number {
  let mult = 1;
  for (const def of EON_UPGRADES) {
    if (def.kind !== kind) continue;
    mult += def.pct * (levels[def.id] ?? 0);
  }
  return mult;
}

/** Extra crystal-production multiplier from the Stellar Flux levels. */
export function eonCrystalMult(levels: Record<string, number>): number {
  return sumPct(levels, 'crystalGlobal');
}

/** Resonance-gain multiplier from the Resonant Echo levels. */
export function eonResonanceMult(levels: Record<string, number>): number {
  return sumPct(levels, 'resonanceYield');
}

/** Attunement-gain multiplier from the Deep Attunement levels. */
export function eonAttuneMult(levels: Record<string, number>): number {
  return sumPct(levels, 'attuneYield');
}

/** Eon-gain multiplier from the Convergent Will levels. */
export function eonYieldMult(levels: Record<string, number>): number {
  return sumPct(levels, 'eonYield');
}

export function eonTotalEffect(def: EonUpgradeDef, level: number): string {
  const pctTotal = Math.round(def.pct * level * 100);
  switch (def.kind) {
    case 'crystalGlobal':
      return `+${pctTotal}% crystal production`;
    case 'resonanceYield':
      return `+${pctTotal}% Resonance per Cascade`;
    case 'attuneYield':
      return `+${pctTotal}% Attunement per Cascade`;
    case 'eonYield':
      return `+${pctTotal}% Eons per Convergence`;
  }
}
