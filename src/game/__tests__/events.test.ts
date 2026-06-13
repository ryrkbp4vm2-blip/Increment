import {
  COMET_FRENZY_DURATION_MS,
  COMET_FRENZY_MULT,
  COMET_WINDFALL_MIN,
  COMET_WINDFALL_SECONDS,
} from '../balance';
import { frenzyFactor, rollCometReward, rollSpawnDelay } from '../events';

describe('rollCometReward', () => {
  it('grants a frenzy on low rolls', () => {
    const reward = rollCometReward(100, {}, () => 0.2);
    expect(reward).toEqual({
      kind: 'frenzy',
      mult: COMET_FRENZY_MULT,
      durationMs: COMET_FRENZY_DURATION_MS,
    });
  });

  it('grants a production-scaled windfall on high rolls', () => {
    const reward = rollCometReward(100, {}, () => 0.9);
    expect(reward).toEqual({ kind: 'windfall', amount: 100 * COMET_WINDFALL_SECONDS });
  });

  it('floors the windfall for brand-new players', () => {
    const reward = rollCometReward(0, {}, () => 0.9);
    expect(reward).toEqual({ kind: 'windfall', amount: COMET_WINDFALL_MIN });
  });

  it('applies artifact modifiers', () => {
    const windfall = rollCometReward(100, { cometMult: 1.5 }, () => 0.9);
    expect(windfall).toEqual({ kind: 'windfall', amount: 100 * COMET_WINDFALL_SECONDS * 1.5 });
    const frenzy = rollCometReward(100, { frenzyExtraMs: 15_000 }, () => 0.2);
    expect(frenzy).toEqual({
      kind: 'frenzy',
      mult: COMET_FRENZY_MULT,
      durationMs: COMET_FRENZY_DURATION_MS + 15_000,
    });
  });
});

describe('rollSpawnDelay', () => {
  it('stays within the range', () => {
    expect(rollSpawnDelay([100, 200], () => 0)).toBe(100);
    expect(rollSpawnDelay([100, 200], () => 1)).toBe(200);
    expect(rollSpawnDelay([100, 200], () => 0.5)).toBe(150);
  });
});

describe('frenzyFactor', () => {
  it('returns the multiplier while active and 1 after expiry', () => {
    const state = { frenzyUntil: 10_000, frenzyMult: 7 };
    expect(frenzyFactor(state, 5_000)).toBe(7);
    expect(frenzyFactor(state, 10_000)).toBe(1);
    expect(frenzyFactor(state, 15_000)).toBe(1);
  });
});
