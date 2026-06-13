import {
  COMET_FRENZY_DURATION_MS,
  COMET_FRENZY_MULT,
  COMET_WINDFALL_MIN,
  COMET_WINDFALL_SECONDS,
} from './balance';

export type CometReward =
  | { kind: 'frenzy'; mult: number; durationMs: number }
  | { kind: 'windfall'; amount: number };

export interface CometModifiers {
  /** Windfall payouts are multiplied by this (artifact bonus). */
  cometMult?: number;
  /** Extra frenzy duration (artifact bonus). */
  frenzyExtraMs?: number;
}

/**
 * Reward for catching a golden comet: a production frenzy or an instant
 * mineral windfall scaled to current production. `random` is injectable for
 * tests (0..1).
 */
export function rollCometReward(
  cps: number,
  modifiers: CometModifiers = {},
  random: () => number = Math.random,
): CometReward {
  if (random() < 0.5) {
    return {
      kind: 'frenzy',
      mult: COMET_FRENZY_MULT,
      durationMs: COMET_FRENZY_DURATION_MS + (modifiers.frenzyExtraMs ?? 0),
    };
  }
  return {
    kind: 'windfall',
    amount:
      Math.max(COMET_WINDFALL_MIN, cps * COMET_WINDFALL_SECONDS) * (modifiers.cometMult ?? 1),
  };
}

/** Random delay within an inclusive [min, max] millisecond range. */
export function rollSpawnDelay(
  range: [number, number],
  random: () => number = Math.random,
): number {
  return range[0] + random() * (range[1] - range[0]);
}

/** Production multiplier from an active frenzy, 1 when expired. */
export function frenzyFactor(
  state: { frenzyUntil: number; frenzyMult: number },
  nowMs: number,
): number {
  return nowMs < state.frenzyUntil ? state.frenzyMult : 1;
}
