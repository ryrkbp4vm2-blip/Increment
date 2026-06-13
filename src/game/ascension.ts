/** Ascension — the second prestige layer above Dark Matter. */

/** Dark Matter (earned since the last ascension) needed for the first core. */
export const ASCEND_BASE = 100;

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

/** Permanent production multiplier from held Singularity Cores. */
export function singularityMult(cores: number): number {
  return 1 + SINGULARITY_BONUS * cores;
}
