import {
  CRYSTAL_GENS,
  RESONANCE_BASE,
  applyCrystalFormationDamage,
  canResonate,
  crystalFormationHp,
  crystalGenBulkCost,
  crystalGenCostOfNext,
  crystalGenMaxAffordable,
  crystalTotalCps,
  nextResonanceAt,
  pendingResonance,
  resonanceMult,
} from '../crystalGame';

describe('crystal generators', () => {
  const def = CRYSTAL_GENS[0];

  it('grows cost geometrically', () => {
    expect(crystalGenCostOfNext(def, 0)).toBe(def.baseCost);
    expect(crystalGenCostOfNext(def, 1)).toBe(Math.ceil(def.baseCost * def.growth));
  });

  it('bulk cost equals the sum of sequential costs', () => {
    const sum =
      crystalGenCostOfNext(def, 0) + crystalGenCostOfNext(def, 1) + crystalGenCostOfNext(def, 2);
    expect(crystalGenBulkCost(def, 0, 3)).toBe(Math.ceil(sum));
  });

  it('maxAffordable never overspends', () => {
    const balance = 1000;
    const n = crystalGenMaxAffordable(def, 0, balance);
    expect(crystalGenBulkCost(def, 0, n)).toBeLessThanOrEqual(balance);
    expect(crystalGenBulkCost(def, 0, n + 1)).toBeGreaterThan(balance);
  });

  it('sums production with the global multiplier', () => {
    const gens = { [CRYSTAL_GENS[0].id]: 10, [CRYSTAL_GENS[1].id]: 2 };
    const base = 10 * CRYSTAL_GENS[0].baseProd + 2 * CRYSTAL_GENS[1].baseProd;
    expect(crystalTotalCps(gens, 1)).toBeCloseTo(base);
    expect(crystalTotalCps(gens, 3)).toBeCloseTo(base * 3);
  });
});

describe('crystal formations', () => {
  it('shatters and rolls bonus when damage exceeds HP', () => {
    const hp = crystalFormationHp(0);
    const r = applyCrystalFormationDamage(0, 0, hp);
    expect(r.formationIndex).toBe(1);
    expect(r.formationDamage).toBe(0);
    expect(r.bonus).toBeGreaterThan(0);
  });

  it('accumulates partial damage without shattering', () => {
    const r = applyCrystalFormationDamage(0, 0, 5);
    expect(r.formationIndex).toBe(0);
    expect(r.formationDamage).toBe(5);
    expect(r.bonus).toBe(0);
  });

  it('chain-shatters multiple formations in one big hit', () => {
    const big = crystalFormationHp(0) + crystalFormationHp(1) + 1;
    const r = applyCrystalFormationDamage(0, 0, big);
    expect(r.formationIndex).toBe(2);
  });
});

describe('resonance', () => {
  it('needs the base lifetime before the first level', () => {
    expect(canResonate(RESONANCE_BASE - 1)).toBe(false);
    expect(canResonate(RESONANCE_BASE)).toBe(true);
    expect(pendingResonance(RESONANCE_BASE - 1)).toBe(0);
    expect(pendingResonance(RESONANCE_BASE)).toBe(1);
  });

  it('follows a square-root curve (4x lifetime for the next level)', () => {
    expect(pendingResonance(4 * RESONANCE_BASE)).toBe(2);
    expect(pendingResonance(9 * RESONANCE_BASE)).toBe(3);
    expect(nextResonanceAt(RESONANCE_BASE)).toBe(4 * RESONANCE_BASE);
  });

  it('multiplies production by +100% per level', () => {
    expect(resonanceMult(0)).toBe(1);
    expect(resonanceMult(3)).toBe(4);
  });
});
