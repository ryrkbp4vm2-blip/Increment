/**
 * Drill Heat — a tap combo. Each manual tap adds heat; heat decays when you
 * stop. Higher heat multiplies tap value (up to ×3 at full), rewarding bursts
 * of fast tapping. Heat is transient (never saved) and only built by manual
 * taps, not by Auto-Driller automation.
 */

export const HEAT_PER_TAP = 0.1; // each tap adds this toward full (1.0)
export const HEAT_DECAY_RATE = 0.5; // exponential decay; ~1.4s half-life
export const HEAT_MAX_BONUS = 2; // +200% tap value at full heat (×3)

/** Heat after `dtMs` of not tapping (exponential decay toward 0). */
export function decayHeat(heat: number, dtMs: number): number {
  if (heat <= 0) return 0;
  // A negative dt (fresh local clock on remount, clock skew) must never GROW
  // heat — exp of a positive exponent explodes to Infinity.
  return heat * Math.exp((-HEAT_DECAY_RATE * Math.max(0, dtMs)) / 1000);
}

/** Tap-value multiplier from the current heat (1× at 0, up to 3× at full). */
export function heatMultiplier(heat: number): number {
  return 1 + HEAT_MAX_BONUS * Math.min(1, Math.max(0, heat));
}
