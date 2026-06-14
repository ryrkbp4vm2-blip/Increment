import { HEAT_MAX_BONUS, decayHeat, heatMultiplier } from '../heat';

describe('decayHeat', () => {
  it('is unchanged with no elapsed time and zero when already cold', () => {
    expect(decayHeat(1, 0)).toBe(1);
    expect(decayHeat(0, 5000)).toBe(0);
  });

  it('decays exponentially toward zero', () => {
    expect(decayHeat(1, 1000)).toBeCloseTo(Math.exp(-0.5));
    expect(decayHeat(1, 5000)).toBeLessThan(decayHeat(1, 1000));
  });
});

describe('heatMultiplier', () => {
  it('ramps from 1x cold to (1 + bonus)x at full, clamped', () => {
    expect(heatMultiplier(0)).toBe(1);
    expect(heatMultiplier(0.5)).toBeCloseTo(1 + HEAT_MAX_BONUS * 0.5);
    expect(heatMultiplier(1)).toBe(1 + HEAT_MAX_BONUS);
    expect(heatMultiplier(5)).toBe(1 + HEAT_MAX_BONUS); // clamped
    expect(heatMultiplier(-1)).toBe(1); // clamped
  });
});
