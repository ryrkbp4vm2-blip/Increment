import { rpFromShatter } from '../asteroids';
import {
  RESEARCH_BY_ID,
  isResearchUnlocked,
  researchPowers,
} from '../research';

describe('rpFromShatter', () => {
  it('scales with belt depth', () => {
    expect(rpFromShatter(0)).toBe(1);
    expect(rpFromShatter(2)).toBe(2);
    expect(rpFromShatter(10)).toBe(6);
  });
});

describe('isResearchUnlocked', () => {
  it('requires all prerequisites', () => {
    const ex2 = RESEARCH_BY_ID.ex2; // requires ex1
    expect(isResearchUnlocked(ex2, {})).toBe(false);
    expect(isResearchUnlocked(ex2, { ex1: true })).toBe(true);
    const si2 = RESEARCH_BY_ID.si2; // requires si1 + co3
    expect(isResearchUnlocked(si2, { si1: true })).toBe(false);
    expect(isResearchUnlocked(si2, { si1: true, co3: true })).toBe(true);
  });

  it('root nodes are always unlocked', () => {
    expect(isResearchUnlocked(RESEARCH_BY_ID.ex1, {})).toBe(true);
  });
});

describe('researchPowers', () => {
  it('is neutral with nothing owned', () => {
    const p = researchPowers({});
    expect(p.globalMult).toBe(1);
    expect(p.tapMult).toBe(1);
    expect(p.rpGainMult).toBe(1);
  });

  it('aggregates effects across nodes', () => {
    const p = researchPowers({ ex1: true, ex3: true, co2: true, lo1: true });
    expect(p.globalMult).toBeCloseTo(1.25 * 1.5);
    expect(p.tapMult).toBeCloseTo(3); // lo1
    expect(p.rpGainMult).toBeCloseTo(1.5); // co2
  });

  it('genMult merges per generator', () => {
    const p = researchPowers({ ex2: true, lo2: true });
    expect(p.genMult.refinery).toBe(2);
    expect(p.genMult.hauler).toBe(2);
  });

  it('the capstone grants both global and tap bonuses', () => {
    const p = researchPowers({ si3: true });
    expect(p.globalMult).toBe(5);
    expect(p.tapMult).toBe(5);
  });
});
