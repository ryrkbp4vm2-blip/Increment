/**
 * Crystal Game — the post-Transcendence mining loop.
 *
 * After transcending, the player mines Crystals instead of minerals.
 * Crystal Generators auto-produce crystals; tapping a Crystal Formation
 * deals damage and shatters it for a bonus. The Crystal Matrix (in
 * transcend.ts) provides permanent upgrades bought with the same Crystals.
 */

export interface CrystalGenDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  baseProd: number;
  growth: number;
  icon: string;
}

export const CRYSTAL_GENS: CrystalGenDef[] = [
  {
    id: 'shard',
    name: 'Crystal Shard',
    description: 'Hums at a harmonic frequency',
    baseCost: 10,
    baseProd: 0.1,
    growth: 1.15,
    icon: 'shard',
  },
  {
    id: 'prism',
    name: 'Prism Node',
    description: 'Refracts void light into crystal energy',
    baseCost: 100,
    baseProd: 1,
    growth: 1.15,
    icon: 'gem_outline',
  },
  {
    id: 'chamber',
    name: 'Resonance Chamber',
    description: 'Amplifies crystal harmonics into raw output',
    baseCost: 1_100,
    baseProd: 8,
    growth: 1.15,
    icon: 'kinetic_amplifier',
  },
  {
    id: 'array',
    name: 'Lattice Array',
    description: 'A matrix of aligned crystal structures',
    baseCost: 12_000,
    baseProd: 47,
    growth: 1.15,
    icon: 'belt_resonance',
  },
  {
    id: 'condenser',
    name: 'Void Condenser',
    description: 'Extracts crystalline matter from the void',
    baseCost: 130_000,
    baseProd: 260,
    growth: 1.15,
    icon: 'dark_compression',
  },
];

export const CRYSTAL_GENS_BY_ID = Object.fromEntries(
  CRYSTAL_GENS.map((g) => [g.id, g]),
);

/** Cost of the nth unit of a crystal generator (0-indexed owned). */
export function crystalGenCostOfNext(def: CrystalGenDef, owned: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.growth, owned));
}

/** Total cost to buy `count` more generators when you currently own `owned`. */
export function crystalGenBulkCost(
  def: CrystalGenDef,
  owned: number,
  count: number,
): number {
  let total = 0;
  for (let i = 0; i < count; i++) total += crystalGenCostOfNext(def, owned + i);
  return Math.ceil(total);
}

/** Max units affordable given a crystal balance. */
export function crystalGenMaxAffordable(
  def: CrystalGenDef,
  owned: number,
  balance: number,
): number {
  let n = 0;
  let total = 0;
  while (n < 100_000) {
    const next = crystalGenCostOfNext(def, owned + n);
    if (total + next > balance) break;
    total += next;
    n++;
  }
  return n;
}

/** Base crystals earned per tap before Crystal Matrix tap multiplier. */
export const CRYSTAL_TAP_BASE = 0.5;

/** Total crystal CPS from all owned generators with the global multiplier applied. */
export function crystalTotalCps(
  generators: Record<string, number>,
  globalMult: number,
): number {
  let total = 0;
  for (const def of CRYSTAL_GENS) {
    total += (generators[def.id] ?? 0) * def.baseProd * globalMult;
  }
  return total;
}

const FORMATION_NAMES = [
  'Void Shard',
  'Crystal Cluster',
  'Resonant Node',
  'Prismatic Core',
  'Lattice Heart',
  'Facet Geode',
  'Singularity Gem',
  'Void Monolith',
  'Crystalline Titan',
  'Infinite Prism',
];

function toRoman(n: number): string {
  if (n <= 0) return '';
  const syms = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return n <= 10 ? syms[n - 1] : String(n);
}

/** Display name for a crystal formation at the given index. */
export function crystalFormationName(index: number): string {
  const name = FORMATION_NAMES[index % FORMATION_NAMES.length];
  const cycle = Math.floor(index / FORMATION_NAMES.length);
  return cycle === 0 ? name : `${name} ${toRoman(cycle + 1)}`;
}

/** HP of a crystal formation at the given index. */
export function crystalFormationHp(index: number): number {
  return Math.ceil(50 * Math.pow(1.8, index));
}

/** Bonus crystals awarded when a formation is shattered. */
export function crystalFormationBonus(index: number): number {
  return Math.floor(2 + index * 0.5);
}

/**
 * Apply `damage` to the current crystal formation. Returns the updated
 * formation index, damage dealt so far, and any shatter bonus crystals earned.
 */
export function applyCrystalFormationDamage(
  formationIndex: number,
  formationDamage: number,
  damage: number,
): { formationIndex: number; formationDamage: number; bonus: number } {
  let idx = formationIndex;
  let dmg = formationDamage;
  let bonus = 0;
  let rem = damage;

  for (let guard = 0; guard < 20 && rem > 0; guard++) {
    const hp = crystalFormationHp(idx);
    const toShatter = hp - dmg;
    if (rem >= toShatter) {
      bonus += crystalFormationBonus(idx);
      idx++;
      rem -= toShatter;
      dmg = 0;
    } else {
      dmg += rem;
      rem = 0;
    }
  }

  return { formationIndex: idx, formationDamage: dmg, bonus };
}

// ── Resonance Cascade — the permanent prestige inside crystal mode ────────────
//
// Crystal mode is a self-contained loop: mine crystals, push formation depth,
// then Resonate to reset your crystal balance, generators and formation
// progress in exchange for permanent Resonance. Each Resonance level grants a
// permanent crystal-production multiplier, so every re-climb is faster. The
// Crystal Matrix (bought with crystals before resonating) is the permanent
// sink that survives the cascade.

/** Lifetime crystals (this run) required to earn the first Resonance. */
export const RESONANCE_BASE = 1e5;

/** Permanent crystal-production multiplier granted per Resonance level. */
export const RESONANCE_BONUS = 1;

/** Resonance levels you'd earn by resonating now (square-root curve). */
export function pendingResonance(lifetimeCrystalsRun: number): number {
  if (lifetimeCrystalsRun < RESONANCE_BASE) return 0;
  return Math.floor(Math.sqrt(lifetimeCrystalsRun / RESONANCE_BASE));
}

/** Whether a Resonance Cascade is available right now. */
export function canResonate(lifetimeCrystalsRun: number): boolean {
  return pendingResonance(lifetimeCrystalsRun) >= 1;
}

/** Lifetime crystals needed for the next Resonance level. */
export function nextResonanceAt(lifetimeCrystalsRun: number): number {
  const next = pendingResonance(lifetimeCrystalsRun) + 1;
  return next * next * RESONANCE_BASE;
}

/** Permanent all-crystal-production multiplier from total Resonance. */
export function resonanceMult(resonance: number): number {
  return 1 + RESONANCE_BONUS * resonance;
}

