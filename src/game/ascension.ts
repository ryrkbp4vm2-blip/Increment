/** Ascension — the second prestige layer above Dark Matter. */

/** Dark Matter (earned since the last ascension) needed for the first core. */
export const ASCEND_BASE = 1_000_000;

/** Permanent global production bonus per Singularity Core. */
export const SINGULARITY_BONUS = 0.5;

/**
 * Singularity Cores awarded for ascending now, from the Dark Matter earned
 * since the last ascension. Square-root scaling, like Dark Matter itself.
 */
export function pendingSingularityCores(dmSinceAscension: number): number {
  if (dmSinceAscension < ASCEND_BASE) return 0;
  return Math.floor(Math.sqrt(dmSinceAscension / ASCEND_BASE));
}

/** Dark Matter (since last ascension) needed to reach the next core. */
export function nextAscensionAt(dmSinceAscension: number): number {
  const next = pendingSingularityCores(dmSinceAscension) + 1;
  return next * next * ASCEND_BASE;
}

/** Permanent production multiplier from total Singularity Cores ever earned. */
export function singularityMult(totalCores: number, perks: Record<string, true> = {}): number {
  return 1 + singularityBonusPerCore(perks) * totalCores;
}

export function singularityBonusPerCore(perks: Record<string, true>): number {
  return SINGULARITY_BONUS * (perks.core_resonance ? 1.5 : 1);
}

export interface SingularityPerkDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** IconName from the art layer (kept as string to keep this module React-free). */
  icon: string;
}

/** One-time permanent unlocks bought with Singularity Cores. Survive everything. */
export const SINGULARITY_PERKS: SingularityPerkDef[] = [
  {
    id: 'auto_driller',
    name: 'Auto-Driller',
    description: 'Automatically mines the asteroid 5× per second.',
    cost: 1,
    icon: 'mine',
  },
  {
    id: 'auto_foreman',
    name: 'Auto-Foreman',
    description: 'Buys the cheapest affordable generator every second.',
    cost: 2,
    icon: 'empire',
  },
  {
    id: 'offline_overdrive',
    name: 'Offline Overdrive',
    description: 'Offline earnings run at 150% efficiency.',
    cost: 3,
    icon: 'temporal_vault',
  },
  {
    id: 'fleet_ai',
    name: 'Fleet AI',
    description: 'Auto-launches the best affordable expedition when the fleet is idle.',
    cost: 4,
    icon: 'fleet',
  },
  {
    id: 'belt_memory',
    name: 'Belt Memory',
    description: 'Start every run on asteroid #5, already partway through the belt.',
    cost: 5,
    icon: 'belt_resonance',
  },
  {
    id: 'core_resonance',
    name: 'Core Resonance',
    description: 'Each Singularity Core is 50% more powerful.',
    cost: 8,
    icon: 'dark_compression',
  },
];

export const SINGULARITY_PERKS_BY_ID: Record<string, SingularityPerkDef> = Object.fromEntries(
  SINGULARITY_PERKS.map((p) => [p.id, p]),
);

export const AUTO_TAPS_PER_SEC = 5;
export const BELT_MEMORY_INDEX = 4;

export function offlineEfficiency(perks: Record<string, true>): number {
  return perks.offline_overdrive ? 1.5 : 1.0;
}

export function perkStartAsteroid(perks: Record<string, true>): number {
  return perks.belt_memory ? BELT_MEMORY_INDEX : 0;
}

/**
 * Leveled Singularity Upgrades — a permanent, repeatable sink for spendable
 * cores so they stay useful long after the one-time perks are bought. Levels
 * survive prestige, ascension and warp.
 */
export interface CoreUpgradeDef {
  id: string;
  name: string;
  perLevel: string;
  /** Cost to buy the next level is baseCost * (currentLevel + 1). */
  baseCost: number;
  maxLevel: number;
  kind: 'global' | 'tap';
  pct: number;
  /** IconName from the art layer (string to keep this module React-free). */
  icon: string;
}

export const CORE_UPGRADES: CoreUpgradeDef[] = [
  {
    id: 'core_overcharge',
    name: 'Core Overcharge',
    perLevel: '+25% all production',
    baseCost: 1,
    maxLevel: 100,
    kind: 'global',
    pct: 0.25,
    icon: 'dark_compression',
  },
  {
    id: 'core_capacitor',
    name: 'Core Capacitor',
    perLevel: '+50% tap power',
    baseCost: 1,
    maxLevel: 100,
    kind: 'tap',
    pct: 0.5,
    icon: 'kinetic_amplifier',
  },
];

export const CORE_UPGRADES_BY_ID: Record<string, CoreUpgradeDef> = Object.fromEntries(
  CORE_UPGRADES.map((u) => [u.id, u]),
);

export function coreUpgradeCost(def: CoreUpgradeDef, level: number): number {
  return def.baseCost * (level + 1);
}

export interface CorePowers {
  globalMult: number;
  tapMult: number;
}

export function corePowers(levels: Record<string, number>): CorePowers {
  let globalMult = 1;
  let tapMult = 1;
  for (const def of CORE_UPGRADES) {
    const level = levels[def.id] ?? 0;
    if (level <= 0) continue;
    if (def.kind === 'global') globalMult *= 1 + def.pct * level;
    else tapMult *= 1 + def.pct * level;
  }
  return { globalMult, tapMult };
}

export function coreTotalEffect(def: CoreUpgradeDef, level: number): string {
  return `+${Math.round(def.pct * level * 100)}% ${def.kind === 'global' ? 'production' : 'tap'}`;
}
