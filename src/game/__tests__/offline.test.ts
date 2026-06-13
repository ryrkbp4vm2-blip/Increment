import { OFFLINE_CAP_MS } from '../balance';
import { computeOfflineEarnings } from '../offline';

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
