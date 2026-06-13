import { darkMatterMultiplier, nextDarkMatterAt, pendingDarkMatter } from '../prestige';

describe('pendingDarkMatter', () => {
  it('is zero below the first threshold', () => {
    expect(pendingDarkMatter(0)).toBe(0);
    expect(pendingDarkMatter(0.999e12)).toBe(0);
  });

  it('hits documented thresholds', () => {
    expect(pendingDarkMatter(1e12)).toBe(1);
    expect(pendingDarkMatter(3.9e12)).toBe(1);
    expect(pendingDarkMatter(4e12)).toBe(2);
    expect(pendingDarkMatter(1e14)).toBe(10);
  });
});

describe('darkMatterMultiplier', () => {
  it('grants +2% per dark matter', () => {
    expect(darkMatterMultiplier(0)).toBe(1);
    expect(darkMatterMultiplier(1)).toBeCloseTo(1.02);
    expect(darkMatterMultiplier(100)).toBeCloseTo(3);
  });
});

describe('nextDarkMatterAt', () => {
  it('returns the threshold for the next point', () => {
    expect(nextDarkMatterAt(0)).toBe(1e12);
    expect(nextDarkMatterAt(1e12)).toBe(4e12);
    expect(nextDarkMatterAt(4e12)).toBe(9e12);
  });
});
