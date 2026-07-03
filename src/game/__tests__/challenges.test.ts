import {
  CHALLENGES_BY_ID,
  challengeComplete,
  challengeModifiers,
  challengeRewardMult,
  cometsDisabled,
  nextChallengeUnlockAt,
  scaledChallengeGoal,
  unlockedChallenges,
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

  it('compares against the scaled snapshot goal when supplied', () => {
    // Base goal is 1e6; with a ×10 snapshot the bar moves to 1e7.
    expect(challengeComplete('asceticism', 1e6, 1e7)).toBe(false);
    expect(challengeComplete('asceticism', 1e7, 1e7)).toBe(true);
  });
});

describe('scaledChallengeGoal', () => {
  const ascet = CHALLENGES_BY_ID.asceticism;
  const famine = CHALLENGES_BY_ID.famine;

  it('never scales below the base goal', () => {
    expect(scaledChallengeGoal(ascet, 1)).toBe(ascet.goal);
    expect(scaledChallengeGoal(ascet, 0.1)).toBe(ascet.goal);
  });

  it('scales the goal up with permanent power', () => {
    expect(scaledChallengeGoal(ascet, 25)).toBe(ascet.goal * 25);
  });

  it('tap-only challenges scale by production × tap power; others ignore tap', () => {
    const power = { production: 10, tap: 8 };
    // Asceticism (generators disabled) earns through taps → both powers count.
    expect(scaledChallengeGoal(ascet, power)).toBe(ascet.goal * 80);
    // Famine earns through generators → tap power must not inflate the goal.
    expect(scaledChallengeGoal(famine, power)).toBe(famine.goal * 10);
  });
});

describe('challenge unlock gating', () => {
  it('reveals more challenges as ascensions accrue', () => {
    expect(unlockedChallenges(0).map((c) => c.id)).toEqual(['asceticism']);
    expect(unlockedChallenges(1).length).toBe(3);
    expect(unlockedChallenges(2).length).toBe(5);
    expect(unlockedChallenges(99).length).toBe(6);
  });

  it('reports the next unlock ascension, or null once all are unlocked', () => {
    expect(nextChallengeUnlockAt(0)).toBe(1);
    expect(nextChallengeUnlockAt(2)).toBe(3);
    expect(nextChallengeUnlockAt(3)).toBeNull();
  });
});
