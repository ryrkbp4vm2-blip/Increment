import { OFFLINE_CAP_MS, OFFLINE_EFFICIENCY } from './balance';
import { formationDepthBonus } from './crystalGame';

export function computeOfflineEarnings(
  elapsedMs: number,
  cps: number,
  capBonusMs: number = 0,
  efficiency: number = OFFLINE_EFFICIENCY,
): number {
  if (elapsedMs <= 0 || cps <= 0) return 0;
  const cappedMs = Math.min(elapsedMs, OFFLINE_CAP_MS + capBonusMs);
  return cps * (cappedMs / 1000) * efficiency;
}

/**
 * Crystal-mode offline earnings: crystal CPS × elapsed (8h cap), including the
 * formation depth bonus the live tick applies — omitting it made deep runs earn
 * several times less per second offline than online. Crystal mode has no
 * offline-cap or efficiency upgrades (Transcendence wipes those layers).
 */
export function computeCrystalOfflineEarnings(
  elapsedMs: number,
  crystalCps: number,
  formationIndex: number,
): number {
  if (elapsedMs <= 0 || crystalCps <= 0) return 0;
  const cappedMs = Math.min(elapsedMs, OFFLINE_CAP_MS);
  return crystalCps * (cappedMs / 1000) * formationDepthBonus(formationIndex);
}
