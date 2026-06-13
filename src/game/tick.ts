import { MAX_TICK_DELTA_MS } from './balance';
import { frenzyFactor } from './events';
import { GameState } from './types';

/**
 * Advance passive production by one tick. The delta is clamped so that a
 * suspended app can't earn unbounded time here — long gaps must flow through
 * the offline-earnings path instead.
 */
export function advance(state: GameState, nowMs: number): Partial<GameState> {
  const deltaMs = Math.min(Math.max(nowMs - state.lastTickAt, 0), MAX_TICK_DELTA_MS);
  const earned = state.cachedCps * (deltaMs / 1000) * frenzyFactor(state, nowMs);
  return {
    minerals: state.minerals + earned,
    lifetimeThisRun: state.lifetimeThisRun + earned,
    lifetimeAllTime: state.lifetimeAllTime + earned,
    lastTickAt: nowMs,
  };
}
