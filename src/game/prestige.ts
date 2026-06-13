import { PRESTIGE_BASE } from './balance';

/**
 * Raw Dark Matter awarded for collapsing a run with the given lifetime
 * earnings. Square-root scaling: each further point costs more lifetime, so
 * runs lengthen naturally, but the first collapse already grants a usable
 * handful of Dark Matter to spend in the shop.
 */
export function pendingDarkMatter(lifetimeThisRun: number): number {
  if (lifetimeThisRun < PRESTIGE_BASE) return 0;
  return Math.floor(Math.sqrt(lifetimeThisRun / PRESTIGE_BASE));
}

/** Actual Dark Matter gained, after DM-gain multipliers (shop + artifacts). */
export function darkMatterGain(lifetimeThisRun: number, dmGainMult: number): number {
  return Math.floor(pendingDarkMatter(lifetimeThisRun) * dmGainMult);
}

/** Lifetime earnings needed this run to reach the next raw Dark Matter point. */
export function nextDarkMatterAt(lifetimeThisRun: number): number {
  const next = pendingDarkMatter(lifetimeThisRun) + 1;
  return next * next * PRESTIGE_BASE;
}
