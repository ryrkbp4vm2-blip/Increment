import {
  CRYSTAL_GENS,
  CRYSTAL_GEN_UPGRADES_BY_ID,
  RESONANCE_BASE,
  applyCrystalFormationDamage,
  attunementGain,
  canResonate,
  crystalFormationHp,
  crystalGenBulkCost,
  crystalGenCostOfNext,
  crystalGenMaxAffordable,
  crystalRunPowers,
  crystalTotalCps,
  crystalUpgradeUnlockMet,
  nextResonanceAt,
  pendingResonance,
  resonanceGain,
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
    // At resonance 0: level 1 needs 1×BASE, level 2 needs 4×BASE, level 3 needs 9×BASE.
    expect(pendingResonance(4 * RESONANCE_BASE)).toBe(2);
    expect(pendingResonance(9 * RESONANCE_BASE)).toBe(3);
    // nextResonanceAt(resonanceLevel) → (level+1)² × BASE
    expect(nextResonanceAt(0)).toBe(RESONANCE_BASE);
    expect(nextResonanceAt(1)).toBe(4 * RESONANCE_BASE);
    // Gate scales: at resonance 3 you need 16×BASE this run for the next level.
    expect(nextResonanceAt(3)).toBe(16 * RESONANCE_BASE);
    expect(pendingResonance(16 * RESONANCE_BASE, 3)).toBe(1);
    expect(pendingResonance(25 * RESONANCE_BASE, 3)).toBe(2);
    // No levels earnable before the new (harder) threshold.
    expect(canResonate(9 * RESONANCE_BASE, 3)).toBe(false);
    expect(canResonate(16 * RESONANCE_BASE, 3)).toBe(true);
  });

  it('multiplies production by +100% per level', () => {
    expect(resonanceMult(0)).toBe(1);
    expect(resonanceMult(3)).toBe(4);
  });

  it('awards Attunement from run depth, gated by the first Resonance', () => {
    // Below the Resonance gate, no Attunement.
    expect(attunementGain(RESONANCE_BASE - 1)).toBe(0);
    // floor(sqrt(life / ATTUNEMENT_BASE)): 1e5 → floor(sqrt(10)) = 3.
    expect(attunementGain(1e5)).toBe(3);
    // 1e6 → floor(sqrt(100)) = 10; 1e8 → floor(sqrt(10000)) = 100.
    expect(attunementGain(1e6)).toBe(10);
    expect(attunementGain(1e8)).toBe(100);
  });

  it('applies the Crystal Lattice yield bonus to the gain (not the gate)', () => {
    // raw pending at 4× base = 2; Lattice 2 levels -> ×1.5 -> 3
    expect(resonanceGain(4 * RESONANCE_BASE, {}, 0)).toBe(2);
    expect(resonanceGain(4 * RESONANCE_BASE, { crystal_lattice: 2 }, 0)).toBe(3);
    // below the gate, no Lattice can grant Resonance
    expect(resonanceGain(RESONANCE_BASE - 1, { crystal_lattice: 9 }, 0)).toBe(0);
    // at resonance 3 the gate is 16×BASE — 4×BASE is no longer enough
    expect(resonanceGain(4 * RESONANCE_BASE, {}, 3)).toBe(0);
  });
});

describe('forge run upgrades', () => {
  it('aggregates tap, global and per-generator multipliers', () => {
    const p = crystalRunPowers({ c_tap1: true, c_global1: true, c_shard: true });
    expect(p.tapMult).toBe(2);
    expect(p.globalMult).toBe(1.5);
    expect(p.genMult.shard).toBe(2);
  });

  it('is all-neutral with no upgrades', () => {
    const p = crystalRunPowers({});
    expect(p.tapMult).toBe(1);
    expect(p.globalMult).toBe(1);
    expect(p.genMult).toEqual({});
  });

  it('per-generator multiplier flows into total CPS', () => {
    const gens = { shard: 10 };
    const p = crystalRunPowers({ c_shard: true });
    const boosted = crystalTotalCps(gens, 1, p.genMult);
    const plain = crystalTotalCps(gens, 1);
    expect(boosted).toBeCloseTo(plain * 2);
  });

  it('checks genCount and lifetime unlock conditions', () => {
    const shardUp = CRYSTAL_GEN_UPGRADES_BY_ID.c_shard; // genCount shard 10
    expect(
      crystalUpgradeUnlockMet(shardUp, { crystalGenerators: { shard: 9 }, lifetimeCrystals: 0 }),
    ).toBe(false);
    expect(
      crystalUpgradeUnlockMet(shardUp, { crystalGenerators: { shard: 10 }, lifetimeCrystals: 0 }),
    ).toBe(true);

    const globalUp = CRYSTAL_GEN_UPGRADES_BY_ID.c_global1; // lifetime 50_000
    expect(
      crystalUpgradeUnlockMet(globalUp, { crystalGenerators: {}, lifetimeCrystals: 49_999 }),
    ).toBe(false);
    expect(
      crystalUpgradeUnlockMet(globalUp, { crystalGenerators: {}, lifetimeCrystals: 50_000 }),
    ).toBe(true);
  });
});
