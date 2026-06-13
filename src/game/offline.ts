import { OFFLINE_CAP_MS, OFFLINE_EFFICIENCY } from './balance';

export function computeOfflineEarnings(elapsedMs: number, cps: number): number {
  if (elapsedMs <= 0 || cps <= 0) return 0;
  const cappedMs = Math.min(elapsedMs, OFFLINE_CAP_MS);
  return cps * (cappedMs / 1000) * OFFLINE_EFFICIENCY;
}
