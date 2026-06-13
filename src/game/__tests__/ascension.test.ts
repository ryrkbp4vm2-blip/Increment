import {
  ASCEND_BASE,
  BELT_MEMORY_INDEX,
  nextAscensionAt,
  offlineEfficiency,
  pendingSingularityCores,
  perkStartAsteroid,
  singularityMult,
} from '../ascension';

describe('pendingSingularityCores', () => {
  it('is zero below the base threshold', () => {
    expect(pendingSingularityCores(0)).toBe(0);
    expect(pendingSingularityCores(ASCEND_BASE - 1)).toBe(0);
  });

  it('uses square-root scaling on banked Dark Matter', () => {
    expect(pendingSingularityCores(ASCEND_BASE)).toBe(1);
    expect(pendingSingularityCores(ASCEND_BASE * 4)).toBe(2);
    expect(pendingSingularityCores(ASCEND_BASE * 25)).toBe(5);
  });
});

describe('nextAscensionAt', () => {
  it('returns the banked DM needed for the next core', () => {
    expect(nextAscensionAt(0)).toBe(ASCEND_BASE);
    expect(nextAscensionAt(ASCEND_BASE)).toBe(4 * ASCEND_BASE);
  });
});

describe('singularityMult', () => {
  it('grants +50% production per core', () => {
    expect(singularityMult(0)).toBe(1);
    expect(singularityMult(2)).toBeCloseTo(2);
    expect(singularityMult(10)).toBeCloseTo(6);
  });

  it('is 50% stronger per core with Core Resonance', () => {
    // base: 1 + 0.5*4 = 3; resonance: 1 + 0.75*4 = 4
    expect(singularityMult(4, { core_resonance: true })).toBeCloseTo(4);
  });
});

describe('perk helpers', () => {
  it('boosts offline efficiency with Offline Overdrive', () => {
    expect(offlineEfficiency({})).toBe(1.0);
    expect(offlineEfficiency({ offline_overdrive: true })).toBe(1.5);
  });

  it('starts deeper with Belt Memory', () => {
    expect(perkStartAsteroid({})).toBe(0);
    expect(perkStartAsteroid({ belt_memory: true })).toBe(BELT_MEMORY_INDEX);
  });
});
