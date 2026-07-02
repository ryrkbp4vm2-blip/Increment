import {
  CRYSTAL_CHALLENGES_BY_ID,
  crystalChallengeComplete,
  crystalChallengeModifiers,
  crystalChallengeRewardMult,
  geodesDisabled,
  nextCrystalChallengeUnlockAt,
  permanentCrystalPowerMultiplier,
  scaledCrystalChallengeGoal,
  unlockedCrystalChallenges,
} from '../crystalChallenges';

const powerBase = {
  resonance: 0,
  crystalUpgrades: {} as Record<string, number>,
  totalEons: 0,
  eonUpgrades: {} as Record<string, number>,
  achievements: {} as Record<string, true>,
  crystalChallengesCompleted: {} as Record<string, true>,
};

describe('crystalChallengeModifiers', () => {
  it('is neutral with no active challenge or an unknown id', () => {
    expect(crystalChallengeModifiers(null).productionMult).toBe(1);
    expect(crystalChallengeModifiers('nope').disableGenerators).toBe(false);
  });

  it('reflects each challenge constraint', () => {
    expect(crystalChallengeModifiers('cc_silent_forge').disableForgeUpgrades).toBe(true);
    expect(crystalChallengeModifiers('cc_bare_hands').disableGenerators).toBe(true);
    expect(crystalChallengeModifiers('cc_dark_sky').disableGeodes).toBe(true);
    expect(crystalChallengeModifiers('cc_dim_resonance').productionMult).toBe(0.2);
    expect(crystalChallengeModifiers('cc_void_fast').productionMult).toBe(0.1);
    expect(geodesDisabled('cc_void_fast')).toBe(true);
    expect(geodesDisabled('cc_bare_hands')).toBe(false);
  });
});

describe('crystalChallengeRewardMult', () => {
  it('aggregates permanent rewards from completed challenges', () => {
    expect(crystalChallengeRewardMult({})).toEqual({ globalMult: 1, tapMult: 1 });
    expect(crystalChallengeRewardMult({ cc_bare_hands: true }).tapMult).toBe(4);
    expect(
      crystalChallengeRewardMult({ cc_silent_forge: true, cc_dark_sky: true }).globalMult,
    ).toBeCloseTo(1.5 * 1.75);
  });
});

describe('goal scaling', () => {
  it('never scales below the base goal and grows with permanent power', () => {
    const def = CRYSTAL_CHALLENGES_BY_ID.cc_silent_forge;
    expect(scaledCrystalChallengeGoal(def, 0.5)).toBe(def.goal);
    expect(scaledCrystalChallengeGoal(def, 30)).toBe(def.goal * 30);
  });

  it('permanent power includes Resonance and completed-challenge rewards', () => {
    const calm = permanentCrystalPowerMultiplier(powerBase);
    expect(calm).toBeCloseTo(1);
    const strong = permanentCrystalPowerMultiplier({
      ...powerBase,
      resonance: 10,
      crystalChallengesCompleted: { cc_silent_forge: true },
    });
    expect(strong).toBeGreaterThan(calm * 1.5); // resonance mult × 1.5 reward
  });
});

describe('completion and unlock gating', () => {
  it('compares against the scaled snapshot goal when supplied', () => {
    expect(crystalChallengeComplete('cc_silent_forge', 1e5, 5e5)).toBe(false);
    expect(crystalChallengeComplete('cc_silent_forge', 5e5, 5e5)).toBe(true);
    expect(crystalChallengeComplete(null, 1e12)).toBe(false);
  });

  it('reveals more challenges as Resonance grows', () => {
    expect(unlockedCrystalChallenges(0)).toEqual([]);
    expect(unlockedCrystalChallenges(1).map((c) => c.id)).toEqual(['cc_silent_forge']);
    expect(unlockedCrystalChallenges(5).length).toBe(4);
    expect(unlockedCrystalChallenges(99).length).toBe(5);
    expect(nextCrystalChallengeUnlockAt(0)).toBe(1);
    expect(nextCrystalChallengeUnlockAt(5)).toBe(8);
    expect(nextCrystalChallengeUnlockAt(8)).toBeNull();
  });
});
