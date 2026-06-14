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
