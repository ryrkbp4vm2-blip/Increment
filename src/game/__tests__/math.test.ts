import { GENERATORS_BY_ID } from '../balance';
import {
  bulkCost,
  costOfNext,
  cps,
  generatorProduction,
  maxAffordable,
  milestoneMultiplier,
  tapValue,
} from '../math';

const drone = GENERATORS_BY_ID.drone;

describe('costOfNext', () => {
  it('returns base cost for the first unit', () => {
    expect(costOfNext(drone, 0)).toBe(10);
  });

  it('applies 1.15 growth with ceil', () => {
    expect(costOfNext(drone, 1)).toBe(12); // ceil(11.5)
    expect(costOfNext(drone, 10)).toBe(Math.ceil(10 * 1.15 ** 10)); // 41
    expect(costOfNext(drone, 10)).toBe(41);
  });
});

describe('bulkCost', () => {
  it('is zero for zero count', () => {
    expect(bulkCost(drone, 5, 0)).toBe(0);
  });

  it('matches the geometric sum within rounding of the sequential costs', () => {
    const sequential = Array.from({ length: 10 }, (_, i) => costOfNext(drone, 3 + i)).reduce(
      (a, b) => a + b,
      0,
    );
    const bulk = bulkCost(drone, 3, 10);
    // bulkCost ceils once at the end; sequential ceils every step.
    expect(Math.abs(bulk - sequential)).toBeLessThanOrEqual(10);
  });
});

describe('maxAffordable', () => {
  it('is zero when the next unit is unaffordable', () => {
    expect(maxAffordable(drone, 0, 9)).toBe(0);
  });

  it('round-trips with bulkCost', () => {
    for (const funds of [15, 100, 1234, 99999, 1e7, 3.7e9]) {
      for (const owned of [0, 7, 42]) {
        const max = maxAffordable(drone, owned, funds);
        expect(bulkCost(drone, owned, max)).toBeLessThanOrEqual(funds);
        expect(bulkCost(drone, owned, max + 1)).toBeGreaterThan(funds);
      }
    }
  });
});

const baseState = {
  generators: { drone: 0, excavator: 0, refinery: 0, hauler: 0, station: 0, harvester: 0, cracker: 0, dyson: 0, forge: 0, core: 0 },
  upgrades: {} as Record<string, true>,
  artifacts: {} as Record<string, true>,
  dmUpgrades: {} as Record<string, number>,
  achievements: {} as Record<string, true>,
  research: {} as Record<string, true>,
  singularityCores: 0,
  totalSingularityCores: 0,
  singularityPerks: {} as Record<string, true>,
  activeChallenge: null as string | null,
  challengesCompleted: {} as Record<string, true>,
  asteroidIndex: 0,
};

describe('production', () => {
  it('scales linearly with owned count', () => {
    expect(generatorProduction(drone, 10, baseState)).toBeCloseTo(5.0);
  });

  it('applies generator multiplier upgrades', () => {
    const state = { ...baseState, upgrades: { drone_x2_a: true as const } };
    expect(generatorProduction(drone, 10, state)).toBeCloseTo(10.0);
  });

  it('doubles output at every 25-owned milestone', () => {
    expect(milestoneMultiplier(0)).toBe(1);
    expect(milestoneMultiplier(24)).toBe(1);
    expect(milestoneMultiplier(25)).toBe(2);
    expect(milestoneMultiplier(50)).toBe(4);
    expect(milestoneMultiplier(75)).toBe(8);
    // 25 drones at 0.5 each, doubled once
    expect(generatorProduction(drone, 25, baseState)).toBeCloseTo(25);
  });

  it('applies global upgrades and the Dark Matter shop to cps', () => {
    const state = {
      ...baseState,
      generators: { ...baseState.generators, drone: 10 },
      upgrades: { global1: true as const }, // x1.5
      dmUpgrades: { stellar_density: 5 }, // +40%*5 = x3
    };
    expect(cps(state)).toBeCloseTo(5 * 1.5 * 3);
  });

  it('applies belt richness from the asteroid index', () => {
    const state = {
      ...baseState,
      generators: { ...baseState.generators, drone: 10 },
      asteroidIndex: 5, // 1.15^5
    };
    expect(cps(state)).toBeCloseTo(5 * 1.15 ** 5);
  });

  it('applies artifact bonuses to production and taps', () => {
    const state = {
      ...baseState,
      generators: { ...baseState.generators, drone: 10 },
      artifacts: {
        pulsar_shard: true as const, // global x1.1
        von_neumann_seed: true as const, // drones x3
        alien_drill: true as const, // tap x3
      },
    };
    expect(cps(state)).toBeCloseTo(5 * 1.1 * 3);
    // tap: base 1 * tapMult 3 * globalMult 1.1
    expect(tapValue(state, 0)).toBeCloseTo(3 * 1.1);
  });
});

describe('tapValue', () => {
  it('is 1 with no upgrades', () => {
    expect(tapValue(baseState)).toBe(1);
  });

  it('applies tap multipliers, the shop and global multiplier', () => {
    const state = {
      ...baseState,
      upgrades: { tap1: true as const, tap2: true as const }, // tap x4
      dmUpgrades: { kinetic_amplifier: 4 }, // +75%*4 = x4
    };
    expect(tapValue(state)).toBeCloseTo(4 * 4);
  });

  it('adds a percentage of cps (5% baseline + upgrades)', () => {
    const state = {
      ...baseState,
      generators: { ...baseState.generators, excavator: 10 }, // 30/s
      upgrades: { tap4: true as const }, // +2% of cps, on top of the 5% baseline
    };
    // 1 (base tap) + 30 * (0.05 + 0.02)
    expect(tapValue(state)).toBeCloseTo(1 + 30 * 0.07);
  });

  it('the 5% baseline makes a bare tap worth a slice of production', () => {
    const state = { ...baseState, generators: { ...baseState.generators, excavator: 10 } };
    expect(tapValue(state)).toBeCloseTo(1 + 30 * 0.05);
  });
});
