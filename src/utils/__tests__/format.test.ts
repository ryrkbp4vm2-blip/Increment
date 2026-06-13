import { formatDuration, formatNumber, formatRate } from '../format';

describe('formatNumber', () => {
  it('shows small integers plainly', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(7)).toBe('7');
    expect(formatNumber(999)).toBe('999');
  });

  it('shows one decimal for small fractional values', () => {
    expect(formatNumber(1.5)).toBe('1.5');
    expect(formatNumber(99.94)).toBe('99.9');
  });

  it('floors just under suffix boundaries', () => {
    expect(formatNumber(999.4)).toBe('999');
  });

  it('applies K/M/B/T suffixes with 3 significant figures', () => {
    expect(formatNumber(1000)).toBe('1.00K');
    expect(formatNumber(12_345)).toBe('12.3K');
    expect(formatNumber(123_456)).toBe('123K');
    expect(formatNumber(1.5e6)).toBe('1.50M');
    expect(formatNumber(2e9)).toBe('2.00B');
    expect(formatNumber(3.21e12)).toBe('3.21T');
  });

  it('switches to alphabetic suffixes after T', () => {
    expect(formatNumber(1e15)).toBe('1.00aa');
    expect(formatNumber(1e18)).toBe('1.00ab');
  });

  it('survives exact powers of 1000 despite log10 fuzz', () => {
    for (let exp = 3; exp <= 30; exp += 3) {
      const formatted = formatNumber(10 ** exp);
      expect(formatted.startsWith('1.00')).toBe(true);
    }
  });

  it('handles negatives, NaN and Infinity', () => {
    expect(formatNumber(-1500)).toBe('-1.50K');
    expect(formatNumber(NaN)).toBe('0');
    expect(formatNumber(Infinity)).toBe('∞');
  });
});

describe('formatRate', () => {
  it('appends /s', () => {
    expect(formatRate(2500)).toBe('2.50K/s');
  });
});

describe('formatDuration', () => {
  it('formats each magnitude', () => {
    expect(formatDuration(5_000)).toBe('5s');
    expect(formatDuration(125_000)).toBe('2m 5s');
    expect(formatDuration(2 * 3600_000 + 13 * 60_000)).toBe('2h 13m');
    expect(formatDuration(26 * 3600_000)).toBe('1d 2h');
  });
});
