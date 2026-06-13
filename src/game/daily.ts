/** Daily bonus — a claimable reward on a ~20h cooldown, with a streak bonus. */

export const DAILY_COOLDOWN_MS = 20 * 3600_000;
/** Claiming again within this window keeps the streak alive. */
export const DAILY_STREAK_WINDOW_MS = 44 * 3600_000;
/** Base reward = this many seconds of current production. */
export const DAILY_BASE_SECONDS = 3600;
export const DAILY_MIN = 100;
export const DAILY_MAX_STREAK_BONUS = 7;

export function dailyAvailable(lastDailyAt: number, nowMs: number): boolean {
  return nowMs - lastDailyAt >= DAILY_COOLDOWN_MS;
}

export function nextDailyAt(lastDailyAt: number): number {
  return lastDailyAt + DAILY_COOLDOWN_MS;
}

/** Streak value after claiming now: +1 if within the window, else reset to 1. */
export function dailyStreakAfter(lastDailyAt: number, streak: number, nowMs: number): number {
  if (lastDailyAt === 0) return 1;
  return nowMs - lastDailyAt <= DAILY_STREAK_WINDOW_MS ? streak + 1 : 1;
}

/** Streak multiplier, +10% per consecutive day up to a cap. */
export function dailyStreakMult(streak: number): number {
  return 1 + 0.1 * Math.min(streak, DAILY_MAX_STREAK_BONUS);
}

export function dailyReward(cps: number, streak: number): number {
  return Math.max(DAILY_MIN, cps * DAILY_BASE_SECONDS) * dailyStreakMult(streak);
}
