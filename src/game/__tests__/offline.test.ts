import { OFFLINE_CAP_MS } from '../balance';
import { computeCrystalOfflineEarnings, computeOfflineEarnings } from '../offline';
import { formationDepthBonus } from '../crystalGame';

describe('computeOfflineEarnings', () => {
  it('earns cps * elapsed seconds under the cap', () => {
    expect(computeOfflineEarnings(60_000, 10)).toBeCloseTo(600);
  });

  it('clamps at the offline cap', () => {
    const capped = computeOfflineEarnings(OFFLINE_CAP_MS, 10);
    expect(computeOfflineEarnings(OFFLINE_CAP_MS * 5, 10)).toBe(capped);
    expect(capped).toBeCloseTo(10 * (OFFLINE_CAP_MS / 1000));
  });

  it('is zero for non-positive elapsed or cps', () => {
    expect(computeOfflineEarnings(0, 10)).toBe(0);
    expect(computeOfflineEarnings(-5000, 10)).toBe(0);
    expect(computeOfflineEarnings(60_000, 0)).toBe(0);
  });
});

describe('computeCrystalOfflineEarnings', () => {
  it('matches the live tick rate, including the formation depth bonus', () => {
    // Formation 25 → ×1.5 depth bonus; offline must pay the same rate as online.
    expect(computeCrystalOfflineEarnings(60_000, 10, 25)).toBeCloseTo(
      10 * 60 * formationDepthBonus(25),
    );
    expect(formationDepthBonus(25)).toBeCloseTo(1.5);
  });

  it('clamps at the 8h cap and guards non-positive input', () => {
    expect(computeCrystalOfflineEarnings(OFFLINE_CAP_MS * 3, 10, 0)).toBeCloseTo(
      10 * (OFFLINE_CAP_MS / 1000),
    );
    expect(computeCrystalOfflineEarnings(-5000, 10, 0)).toBe(0);
    expect(computeCrystalOfflineEarnings(60_000, 0, 0)).toBe(0);
  });
});
