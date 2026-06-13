import {
  DAILY_COOLDOWN_MS,
  DAILY_MIN,
  DAILY_STREAK_WINDOW_MS,
  dailyAvailable,
  dailyReward,
  dailyStreakAfter,
  dailyStreakMult,
} from '../daily';

describe('dailyAvailable', () => {
  it('is true once the cooldown has elapsed', () => {
    expect(dailyAvailable(0, DAILY_COOLDOWN_MS)).toBe(true);
    expect(dailyAvailable(1000, 1000 + DAILY_COOLDOWN_MS - 1)).toBe(false);
  });
});

describe('dailyStreakAfter', () => {
  it('starts at 1 on the first claim', () => {
    expect(dailyStreakAfter(0, 0, 1e9)).toBe(1);
  });
  it('increments within the streak window', () => {
    expect(dailyStreakAfter(1000, 3, 1000 + DAILY_STREAK_WINDOW_MS)).toBe(4);
  });
  it('resets to 1 after the window lapses', () => {
    expect(dailyStreakAfter(1000, 5, 1000 + DAILY_STREAK_WINDOW_MS + 1)).toBe(1);
  });
});

describe('dailyReward', () => {
  it('scales with production and streak, with a floor', () => {
    expect(dailyReward(0, 1)).toBe(DAILY_MIN * dailyStreakMult(1));
    expect(dailyReward(10, 1)).toBeCloseTo(10 * 3600 * 1.1);
  });
  it('caps the streak multiplier at +70%', () => {
    expect(dailyStreakMult(20)).toBeCloseTo(1.7);
  });
});
