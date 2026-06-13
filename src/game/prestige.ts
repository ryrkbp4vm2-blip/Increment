import { PRESTIGE_DIVISOR } from './balance';

export { darkMatterMultiplier } from './math';

/** Dark matter awarded for collapsing a run with the given lifetime earnings. */
export function pendingDarkMatter(lifetimeThisRun: number): number {
  if (lifetimeThisRun < PRESTIGE_DIVISOR) return 0;
  return Math.floor(Math.sqrt(lifetimeThisRun / PRESTIGE_DIVISOR));
}

/** Lifetime earnings needed this run to reach the next dark matter point. */
export function nextDarkMatterAt(lifetimeThisRun: number): number {
  const next = pendingDarkMatter(lifetimeThisRun) + 1;
  return next * next * PRESTIGE_DIVISOR;
}
