import { effectivePowers } from '../powers';

describe('effectivePowers', () => {
  it('is neutral when nothing is owned', () => {
    const p = effectivePowers({}, {});
    expect(p.globalMult).toBe(1);
    expect(p.tapMult).toBe(1);
    expect(p.cometRewardMult).toBe(1);
    expect(p.dmGainMult).toBe(1);
  });

  it('multiplies artifact and Dark Matter shop bonuses together', () => {
    const p = effectivePowers(
      { pulsar_shard: true }, // global x1.1
      { stellar_density: 2 }, // +40%*2 = x1.8
    );
    expect(p.globalMult).toBeCloseTo(1.1 * 1.8);
  });

  it('combines the comet reward from both sources', () => {
    const p = effectivePowers(
      { singing_crystal: true }, // comet x1.5
      { cosmic_magnet: 1 }, // +20%
    );
    expect(p.cometRewardMult).toBeCloseTo(1.5 * 1.2);
  });

  it('folds the Dark Matter Locket artifact into DM gain', () => {
    const p = effectivePowers(
      { dm_locket: true }, // dmBonusMult x1.25
      { dark_compression: 5 }, // +20%*5 = x2
    );
    expect(p.dmGainMult).toBeCloseTo(1.25 * 2);
  });

  it('sums offline-cap bonuses from artifacts and the shop', () => {
    const p = effectivePowers(
      { cryo_core: true }, // +4h
      { temporal_vault: 2 }, // +2h*2
    );
    expect(p.offlineCapBonusMs).toBe((4 + 4) * 3600_000);
  });
});
