import {
  DM_UPGRADES_BY_ID,
  darkMatterPowers,
  darkMatterUpgradeCost,
  mineralStockpile,
} from '../darkmatter';

describe('darkMatterUpgradeCost', () => {
  it('scales linearly with level', () => {
    const def = DM_UPGRADES_BY_ID.stellar_density; // baseCost 1
    expect(darkMatterUpgradeCost(def, 0)).toBe(1);
    expect(darkMatterUpgradeCost(def, 1)).toBe(2);
    expect(darkMatterUpgradeCost(def, 4)).toBe(5);
    const warp = DM_UPGRADES_BY_ID.warp_logistics; // baseCost 2
    expect(darkMatterUpgradeCost(warp, 3)).toBe(8);
  });
});

describe('mineralStockpile', () => {
  it('is zero at level 0 and grows by 10x per level', () => {
    expect(mineralStockpile(1000, 0)).toBe(0);
    expect(mineralStockpile(1000, 1)).toBe(1000);
    expect(mineralStockpile(1000, 2)).toBe(10_000);
    expect(mineralStockpile(1000, 5)).toBe(1e7);
  });
});

describe('darkMatterPowers', () => {
  it('is neutral with no upgrades', () => {
    const p = darkMatterPowers({});
    expect(p.globalMult).toBe(1);
    expect(p.tapMult).toBe(1);
    expect(p.dmGainMult).toBe(1);
    expect(p.startAsteroidIndex).toBe(0);
    expect(p.startMinerals).toBe(0);
  });

  it('aggregates production, tap and dm-gain levels', () => {
    const p = darkMatterPowers({
      stellar_density: 3, // +40%*3
      kinetic_amplifier: 2, // +75%*2
      dark_compression: 4, // +20%*4
    });
    expect(p.globalMult).toBeCloseTo(1 + 0.4 * 3);
    expect(p.tapMult).toBeCloseTo(1 + 0.75 * 2);
    expect(p.dmGainMult).toBeCloseTo(1 + 0.2 * 4);
  });

  it('compounds comet and expedition multipliers, sums head starts', () => {
    const p = darkMatterPowers({
      cosmic_magnet: 2, // spawn (0.95)^2, reward +40%
      warp_logistics: 2, // speed/fuel (0.92)^2, loot +24%
      belt_resonance: 3,
      quantum_reserves: 2,
      temporal_vault: 3,
    });
    expect(p.cometSpawnMult).toBeCloseTo(0.95 ** 2);
    expect(p.cometRewardMult).toBeCloseTo(1.4);
    expect(p.expeditionSpeedMult).toBeCloseTo(0.92 ** 2);
    expect(p.expeditionLootMult).toBeCloseTo(1.24);
    expect(p.startAsteroidIndex).toBe(3);
    expect(p.startMinerals).toBe(10_000);
    expect(p.offlineCapBonusMs).toBe(3 * 2 * 3600_000);
  });
});
