/**
 * Crystal Game — the post-Transcendence mining loop.
 *
 * After transcending, the player mines Crystals instead of minerals.
 * Crystal Generators auto-produce crystals; tapping a Crystal Formation
 * deals damage and shatters it for a bonus. The Crystal Matrix (in
 * transcend.ts) provides permanent upgrades bought with the same Crystals.
 */
import { crystalYieldMult } from './transcend';

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
  {
    id: 'harmonizer',
    name: 'Harmonic Forge',
    description: 'Forges crystals from pure resonance',
    baseCost: 1_400_000,
    baseProd: 1_400,
    growth: 1.15,
    icon: 'cosmic_magnet',
  },
  {
    id: 'nexus',
    name: 'Crystal Nexus',
    description: 'A self-sustaining lattice of growing crystal',
    baseCost: 20_000_000,
    baseProd: 7_800,
    growth: 1.15,
    icon: 'quantum_reserves',
  },
  {
    id: 'singularity',
    name: 'Prism Singularity',
    description: 'Bends spacetime into endless crystal',
    baseCost: 330_000_000,
    baseProd: 44_000,
    growth: 1.15,
    icon: 'temporal_vault',
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

/**
 * Total crystal CPS from all owned generators, with the global multiplier and
 * any per-generator multipliers (from run upgrades) applied.
 */
export function crystalTotalCps(
  generators: Record<string, number>,
  globalMult: number,
  genMult: Record<string, number> = {},
): number {
  let total = 0;
  for (const def of CRYSTAL_GENS) {
    const m = genMult[def.id] ?? 1;
    total += (generators[def.id] ?? 0) * def.baseProd * m * globalMult;
  }
  return total;
}

/** Production of a single crystal generator line (for display). */
export function crystalGenProduction(
  def: CrystalGenDef,
  owned: number,
  globalMult: number,
  genMult = 1,
): number {
  return owned * def.baseProd * genMult * globalMult;
}

// ── Forge upgrades — run-scoped, bought with crystals, reset each Resonance ────
//
// Unlike the permanent Crystal Matrix, these are the moment-to-moment purchases
// inside a single crystal run: tap power, per-generator boosts and global
// multipliers. They reset on every Resonance Cascade (re-bought each climb),
// giving the Forge real decisions rather than just "buy the next generator."

export type CrystalUpgradeEffect =
  | { kind: 'tapMult'; x: number }
  | { kind: 'genMult'; genId: string; x: number }
  | { kind: 'globalMult'; x: number };

export type CrystalUpgradeUnlock =
  | { kind: 'genCount'; genId: string; n: number }
  | { kind: 'lifetime'; amount: number };

export interface CrystalGenUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: CrystalUpgradeUnlock;
  effect: CrystalUpgradeEffect;
}

export const CRYSTAL_GEN_UPGRADES: CrystalGenUpgradeDef[] = [
  // Tap line.
  {
    id: 'c_tap1',
    name: 'Reinforced Resonator',
    description: 'Double your crystals per tap',
    cost: 60,
    unlock: { kind: 'genCount', genId: 'shard', n: 1 },
    effect: { kind: 'tapMult', x: 2 },
  },
  {
    id: 'c_tap2',
    name: 'Tuned Resonator',
    description: 'Double your crystals per tap again',
    cost: 4_000,
    unlock: { kind: 'lifetime', amount: 5_000 },
    effect: { kind: 'tapMult', x: 2 },
  },
  {
    id: 'c_tap3',
    name: 'Harmonic Resonator',
    description: 'Double your crystals per tap once more',
    cost: 250_000,
    unlock: { kind: 'lifetime', amount: 250_000 },
    effect: { kind: 'tapMult', x: 2 },
  },
  // Per-generator boosts (×2 once you own 10).
  {
    id: 'c_shard',
    name: 'Shard Alignment',
    description: 'Crystal Shards produce ×2',
    cost: 120,
    unlock: { kind: 'genCount', genId: 'shard', n: 10 },
    effect: { kind: 'genMult', genId: 'shard', x: 2 },
  },
  {
    id: 'c_prism',
    name: 'Prism Focus',
    description: 'Prism Nodes produce ×2',
    cost: 1_200,
    unlock: { kind: 'genCount', genId: 'prism', n: 10 },
    effect: { kind: 'genMult', genId: 'prism', x: 2 },
  },
  {
    id: 'c_chamber',
    name: 'Chamber Tuning',
    description: 'Resonance Chambers produce ×2',
    cost: 13_000,
    unlock: { kind: 'genCount', genId: 'chamber', n: 10 },
    effect: { kind: 'genMult', genId: 'chamber', x: 2 },
  },
  {
    id: 'c_array',
    name: 'Lattice Sync',
    description: 'Lattice Arrays produce ×2',
    cost: 150_000,
    unlock: { kind: 'genCount', genId: 'array', n: 10 },
    effect: { kind: 'genMult', genId: 'array', x: 2 },
  },
  {
    id: 'c_condenser',
    name: 'Void Calibration',
    description: 'Void Condensers produce ×2',
    cost: 1_600_000,
    unlock: { kind: 'genCount', genId: 'condenser', n: 10 },
    effect: { kind: 'genMult', genId: 'condenser', x: 2 },
  },
  // Per-generator tier 2 (×3 at own 25 — more valuable, requires deeper investment).
  {
    id: 'c_shard2',
    name: 'Shard Mastery',
    description: 'Crystal Shards produce ×3',
    cost: 1_500,
    unlock: { kind: 'genCount', genId: 'shard', n: 25 },
    effect: { kind: 'genMult', genId: 'shard', x: 3 },
  },
  {
    id: 'c_prism2',
    name: 'Prism Mastery',
    description: 'Prism Nodes produce ×3',
    cost: 15_000,
    unlock: { kind: 'genCount', genId: 'prism', n: 25 },
    effect: { kind: 'genMult', genId: 'prism', x: 3 },
  },
  {
    id: 'c_chamber2',
    name: 'Chamber Mastery',
    description: 'Resonance Chambers produce ×3',
    cost: 150_000,
    unlock: { kind: 'genCount', genId: 'chamber', n: 25 },
    effect: { kind: 'genMult', genId: 'chamber', x: 3 },
  },
  {
    id: 'c_array2',
    name: 'Array Mastery',
    description: 'Lattice Arrays produce ×3',
    cost: 1_800_000,
    unlock: { kind: 'genCount', genId: 'array', n: 25 },
    effect: { kind: 'genMult', genId: 'array', x: 3 },
  },
  {
    id: 'c_condenser2',
    name: 'Condenser Mastery',
    description: 'Void Condensers produce ×3',
    cost: 20_000_000,
    unlock: { kind: 'genCount', genId: 'condenser', n: 25 },
    effect: { kind: 'genMult', genId: 'condenser', x: 3 },
  },
  // Global multipliers.
  {
    id: 'c_global1',
    name: 'Crystal Harmonics',
    description: 'All crystal production ×1.5',
    cost: 50_000,
    unlock: { kind: 'lifetime', amount: 50_000 },
    effect: { kind: 'globalMult', x: 1.5 },
  },
  {
    id: 'c_global2',
    name: 'Resonant Cascade',
    description: 'All crystal production ×2',
    cost: 5_000_000,
    unlock: { kind: 'lifetime', amount: 5_000_000 },
    effect: { kind: 'globalMult', x: 2 },
  },
  {
    id: 'c_global3',
    name: 'Prismatic Surge',
    description: 'All crystal production ×3',
    cost: 80_000_000,
    unlock: { kind: 'lifetime', amount: 80_000_000 },
    effect: { kind: 'globalMult', x: 3 },
  },
];

export const CRYSTAL_GEN_UPGRADES_BY_ID: Record<string, CrystalGenUpgradeDef> = Object.fromEntries(
  CRYSTAL_GEN_UPGRADES.map((u) => [u.id, u]),
);

export interface CrystalRunPowers {
  tapMult: number;
  globalMult: number;
  genMult: Record<string, number>;
}

/** Aggregate the active run upgrades into tap / global / per-generator multipliers. */
export function crystalRunPowers(upgrades: Record<string, true>): CrystalRunPowers {
  let tapMult = 1;
  let globalMult = 1;
  const genMult: Record<string, number> = {};
  for (const def of CRYSTAL_GEN_UPGRADES) {
    if (!upgrades[def.id]) continue;
    const e = def.effect;
    if (e.kind === 'tapMult') tapMult *= e.x;
    else if (e.kind === 'globalMult') globalMult *= e.x;
    else if (e.kind === 'genMult') genMult[e.genId] = (genMult[e.genId] ?? 1) * e.x;
  }
  return { tapMult, globalMult, genMult };
}

/** Whether a Forge upgrade's unlock condition is met. */
export function crystalUpgradeUnlockMet(
  def: CrystalGenUpgradeDef,
  state: { crystalGenerators: Record<string, number>; lifetimeCrystals: number },
): boolean {
  const u = def.unlock;
  if (u.kind === 'genCount') return (state.crystalGenerators[u.genId] ?? 0) >= u.n;
  return state.lifetimeCrystals >= u.amount;
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

/**
 * How many NEW Resonance levels a Cascade would grant right now.
 *
 * Gate scales with current Resonance: to earn level N you need N² × RESONANCE_BASE
 * lifetime crystals *this run*. Each subsequent Cascade therefore demands more
 * crystals than the last, preventing runaway chains at high Resonance.
 */
export function pendingResonance(
  lifetimeCrystalsRun: number,
  currentResonance: number = 0,
): number {
  let gained = 0;
  for (let guard = 0; guard < 10_000; guard++) {
    const nextLevel = currentResonance + gained + 1;
    if (lifetimeCrystalsRun < nextLevel * nextLevel * RESONANCE_BASE) break;
    gained++;
  }
  return gained;
}

/** Whether a Resonance Cascade is available right now. */
export function canResonate(
  lifetimeCrystalsRun: number,
  currentResonance: number = 0,
): boolean {
  return pendingResonance(lifetimeCrystalsRun, currentResonance) >= 1;
}

/** Lifetime crystals this run needed to earn the next Resonance level. */
export function nextResonanceAt(currentResonance: number): number {
  const next = currentResonance + 1;
  return next * next * RESONANCE_BASE;
}

/** Permanent all-crystal-production multiplier from total Resonance. */
export function resonanceMult(resonance: number): number {
  return 1 + RESONANCE_BONUS * resonance;
}

/**
 * Resonance levels actually granted by a Cascade now, after the Crystal
 * Lattice yield bonus from the Matrix. The raw gate (canResonate) is unaffected
 * — the Lattice only increases the payout.
 */
export function resonanceGain(
  lifetimeCrystalsRun: number,
  crystalUpgrades: Record<string, number>,
  currentResonance: number = 0,
): number {
  return Math.floor(
    pendingResonance(lifetimeCrystalsRun, currentResonance) * crystalYieldMult(crystalUpgrades),
  );
}

// ── Attunement — the permanent Crystal-Matrix currency ────────────────────────
//
// A Resonance Cascade pays out Attunement on top of Resonance levels. Unlike
// the Crystals you mine (which fund this run's generators and Forge upgrades),
// Attunement is the scarce meta-currency that buys the permanent Crystal Matrix.
// It grows with how deep your run went (lifetime crystals this run), so longer
// climbs before a Cascade are rewarded.

/** Lifetime crystals (this run) that equate to one Attunement, square-root scaled. */
export const ATTUNEMENT_BASE = 1e4;

/**
 * Attunement awarded for cascading now. Square-root of run depth so deeper runs
 * pay more, but with diminishing returns. Zero until the Resonance gate is met
 * (a Cascade can't happen below it anyway).
 */
export function attunementGain(lifetimeCrystalsRun: number): number {
  if (lifetimeCrystalsRun < RESONANCE_BASE) return 0;
  return Math.floor(Math.sqrt(lifetimeCrystalsRun / ATTUNEMENT_BASE));
}

