import {
  challengeComplete,
  challengeModifiers,
  challengeRewardMult,
  cometsDisabled,
} from '../challenges';

describe('challengeModifiers', () => {
  it('is neutral with no active challenge or an unknown id', () => {
    expect(challengeModifiers(null)).toEqual({
      productionMult: 1,
      tapMult: 1,
      disableGenerators: false,
      disableComets: false,
      disableUpgrades: false,
    });
    expect(challengeModifiers('nope').productionMult).toBe(1);
  });

  it('reflects each challenge constraint', () => {
    expect(challengeModifiers('asceticism').disableGenerators).toBe(true);
    expect(challengeModifiers('famine').productionMult).toBe(0.2);
    expect(challengeModifiers('solitude').disableComets).toBe(true);
    expect(challengeModifiers('idle_doctrine').tapMult).toBe(0);
    expect(challengeModifiers('purity').disableUpgrades).toBe(true);
    expect(challengeModifiers('hardcore').productionMult).toBe(0.1);
  });
});

describe('cometsDisabled', () => {
  it('only for challenges that forbid comets', () => {
    expect(cometsDisabled(null)).toBe(false);
    expect(cometsDisabled('famine')).toBe(false);
    expect(cometsDisabled('solitude')).toBe(true);
  });
});

describe('challengeRewardMult', () => {
  it('aggregates permanent rewards from completed challenges', () => {
    expect(challengeRewardMult({})).toEqual({ globalMult: 1, tapMult: 1 });
    expect(challengeRewardMult({ asceticism: true }).tapMult).toBe(4);
    expect(challengeRewardMult({ famine: true }).globalMult).toBe(2);
    // famine ×2 and solitude ×1.75 stack
    expect(challengeRewardMult({ famine: true, solitude: true }).globalMult).toBeCloseTo(3.5);
  });
});

describe('challengeComplete', () => {
  it('is true once the run lifetime reaches the goal', () => {
    expect(challengeComplete('asceticism', 999_999)).toBe(false);
    expect(challengeComplete('asceticism', 1e6)).toBe(true);
    expect(challengeComplete(null, 1e9)).toBe(false);
  });
});
