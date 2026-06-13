import { darkMatterGain, nextDarkMatterAt, pendingDarkMatter } from '../prestige';

describe('pendingDarkMatter', () => {
  it('is zero below the first threshold', () => {
    expect(pendingDarkMatter(0)).toBe(0);
    expect(pendingDarkMatter(0.999e9)).toBe(0);
  });

  it('grants a usable handful from the first collapse', () => {
    expect(pendingDarkMatter(1e9)).toBe(1);
    expect(pendingDarkMatter(4e9)).toBe(2);
    expect(pendingDarkMatter(1e10)).toBe(3);
    expect(pendingDarkMatter(1e11)).toBe(10);
    expect(pendingDarkMatter(1e12)).toBe(31);
  });
});

describe('darkMatterGain', () => {
  it('multiplies the raw gain and floors it', () => {
    expect(darkMatterGain(1e11, 1)).toBe(10);
    expect(darkMatterGain(1e11, 1.5)).toBe(15);
    expect(darkMatterGain(1e9, 1.2)).toBe(1); // floor(1 * 1.2)
  });
});

describe('nextDarkMatterAt', () => {
  it('returns the threshold for the next point', () => {
    expect(nextDarkMatterAt(0)).toBe(1e9);
    expect(nextDarkMatterAt(1e9)).toBe(4e9);
    expect(nextDarkMatterAt(4e9)).toBe(9e9);
  });
});
