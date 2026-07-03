import { isPrimeFormation, crystalFormationBonus, crystalFormationHp, PRIME_HP_MULT, PRIME_REWARD_MULT } from '../crystalGame';
import { pickCrystalEvent, CRYSTAL_EVENT_COUNT } from '../crystalEvents';
import { RELICS, relicPowers, relicsCrossed, relicsForDepth } from '../relics';

describe('Prime formations', () => {
  it('every 10th formation is Prime', () => {
    expect(isPrimeFormation(8)).toBe(false);
    expect(isPrimeFormation(9)).toBe(true);
    expect(isPrimeFormation(10)).toBe(false);
    expect(isPrimeFormation(19)).toBe(true);
  });

  it('Primes have multiplied HP and shatter payout', () => {
    const baseHp = Math.ceil(50 * 1.8 ** 9);
    expect(crystalFormationHp(9)).toBe(baseHp * PRIME_HP_MULT);
    expect(crystalFormationBonus(9)).toBe(Math.floor(2 + 9 * 0.5) * PRIME_REWARD_MULT);
    // Non-primes are untouched.
    expect(crystalFormationHp(8)).toBe(Math.ceil(50 * 1.8 ** 8));
  });
});

describe('Harmonic Relics', () => {
  it('every relic is bound to a Prime formation', () => {
    for (const r of RELICS) expect(isPrimeFormation(r.formationIndex)).toBe(true);
  });

  it('aggregates owned relics into multipliers', () => {
    expect(relicPowers({}).globalMult).toBe(1);
    const p = relicPowers({ echo_prism: true, fractal_seed: true, deep_tuning_fork: true });
    expect(p.globalMult).toBeCloseTo(1.25 * 1.5);
    expect(p.tapMult).toBe(2);
    expect(relicPowers({ geode_heart: true }).geodeMult).toBe(1.5);
    expect(relicPowers({ resonant_core: true }).resonanceGainMult).toBe(1.25);
    expect(relicPowers({ attuned_lens: true }).attunementGainMult).toBe(1.25);
  });

  it('finds relics crossed by a shatter span and retro-grants by depth', () => {
    expect(relicsCrossed(0, 9).length).toBe(0); // stopped short of the Prime
    expect(relicsCrossed(9, 10).map((r) => r.id)).toEqual(['echo_prism']);
    expect(relicsCrossed(0, 25).map((r) => r.id)).toEqual(['echo_prism', 'deep_tuning_fork']);
    // Depth 10 means formation index 9 was shattered → first relic owned.
    expect(relicsForDepth(9).length).toBe(0);
    expect(relicsForDepth(10).map((r) => r.id)).toEqual(['echo_prism']);
  });
});

describe('Resonant Echo events', () => {
  it('builds each event with crystal-scaled rewards', () => {
    for (let i = 0; i < CRYSTAL_EVENT_COUNT; i++) {
      const ev = pickCrystalEvent({ crystalCps: 10, crystals: 100 }, () => i / CRYSTAL_EVENT_COUNT);
      expect(ev.id).toBeTruthy();
      expect(ev.options.length).toBeGreaterThan(0);
    }
    // The windfall event scales with crystal CPS.
    const cache = pickCrystalEvent({ crystalCps: 100, crystals: 0 }, () => 2 / CRYSTAL_EVENT_COUNT);
    expect(cache.id).toBe('geode_cache');
    expect(cache.options[0].outcome).toEqual({ kind: 'windfall', amount: 100 * 300 });
  });
});
