/**
 * Notification planning — pure logic deciding WHICH local notifications to
 * schedule when the app goes to background, and WHEN each should fire. The
 * native expo-notifications calls live in src/notifications/; this module has
 * no React or native imports so the scheduling rules are fully unit-testable.
 */
import { OFFLINE_CAP_MS } from './balance';
import { nextDailyAt } from './daily';
import { effectivePowers } from './powers';
import { PersistedState } from './types';

export interface PlannedNotification {
  /** Stable id per notification kind (one of each at most). */
  id: 'expedition' | 'offline_cap' | 'daily';
  title: string;
  body: string;
  /** ms epoch at which the notification should fire. */
  fireAt: number;
}

type PlanState = Pick<
  PersistedState,
  'expedition' | 'lastDailyAt' | 'transcendCount' | 'artifacts' | 'dmUpgrades' | 'research'
> & {
  cachedCps: number;
  cachedCrystalCps: number;
};

/**
 * The notifications worth scheduling from `state` at `nowMs`, soonest first:
 *
 * - Fleet expedition returning (mineral mode only — the fleet dies with it).
 * - Offline earnings hitting the cap (base 8h + Temporal Vault, which crystal
 *   mode doesn't have), only while something is actually producing.
 * - Daily bonus coming off cooldown, only for players who have claimed one
 *   before (lastDailyAt > 0) — first discovery happens in-app.
 *
 * Anything already due (fireAt <= nowMs) is skipped: the player is looking at
 * the app right now, so an instant notification would just be noise.
 */
export function planNotifications(state: PlanState, nowMs: number): PlannedNotification[] {
  const plans: PlannedNotification[] = [];

  if (state.expedition && state.expedition.endsAt > nowMs) {
    plans.push({
      id: 'expedition',
      title: 'Expedition returned!',
      body: 'Your fleet is back from the belt — claim its loot before the next launch.',
      fireAt: state.expedition.endsAt,
    });
  }

  const crystalMode = state.transcendCount > 0;
  const producing = crystalMode ? state.cachedCrystalCps > 0 : state.cachedCps > 0;
  if (producing) {
    const capBonusMs = crystalMode
      ? 0
      : effectivePowers(state.artifacts, state.dmUpgrades, state.research).offlineCapBonusMs;
    plans.push({
      id: 'offline_cap',
      title: 'Offline storage full',
      body: crystalMode
        ? 'Your crystal formations have filled their offline storage — come collect.'
        : 'Your mining empire has filled its offline storage — come collect.',
      fireAt: nowMs + OFFLINE_CAP_MS + capBonusMs,
    });
  }

  if (state.lastDailyAt > 0) {
    const dailyAt = nextDailyAt(state.lastDailyAt);
    if (dailyAt > nowMs) {
      plans.push({
        id: 'daily',
        title: 'Daily bonus ready',
        body: 'Claim today’s bonus to keep your streak growing.',
        fireAt: dailyAt,
      });
    }
  }

  return plans.sort((a, b) => a.fireAt - b.fireAt);
}
