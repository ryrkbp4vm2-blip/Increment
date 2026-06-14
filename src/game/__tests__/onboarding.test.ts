import { nextObjective, prestigeAttention } from '../onboarding';
import { PRESTIGE_BASE } from '../balance';
import { ASCEND_BASE } from '../ascension';
import { ZONE_WARP_ASCENSIONS } from '../zones';

const base = {
  totalTaps: 0,
  minerals: 0,
  generators: {} as Record<string, number>,
  asteroidsShattered: 0,
  researchPoints: 0,
  research: {} as Record<string, true>,
  expeditionsCompleted: 0,
  lifetimeThisRun: 0,
  prestigeCount: 0,
  dmSinceAscension: 0,
  ascensionCount: 0,
  ascensionsSinceWarp: 0,
};

describe('nextObjective', () => {
  it('starts by teaching the tap', () => {
    expect(nextObjective(base)?.id).toBe('tap');
  });

  it('points to the Empire tab once a drone is affordable', () => {
    const o = nextObjective({ ...base, totalTaps: 10, minerals: 50 });
    expect(o?.id).toBe('buy_drone');
    expect(o?.tab).toBe('shop');
  });

  it('nudges the player to keep tapping when a drone is not yet affordable', () => {
    expect(nextObjective({ ...base, totalTaps: 10, minerals: 3 })?.id).toBe('save_drone');
  });

  it('teaches shattering after the first generator', () => {
    expect(
      nextObjective({ ...base, totalTaps: 20, generators: { drone: 1 } })?.id,
    ).toBe('shatter');
  });

  it('introduces the Lab once Research Points exist', () => {
    const o = nextObjective({
      ...base,
      totalTaps: 20,
      generators: { drone: 5 },
      asteroidsShattered: 2,
      researchPoints: 3,
    });
    expect(o?.id).toBe('research');
    expect(o?.tab).toBe('lab');
  });

  it('introduces the Fleet after a few shatters', () => {
    expect(
      nextObjective({
        ...base,
        totalTaps: 20,
        generators: { drone: 5 },
        asteroidsShattered: 4,
        researchPoints: 3,
        research: { ex1: true },
      })?.id,
    ).toBe('fleet');
  });

  it('flags the first collapse when Dark Matter is available', () => {
    const o = nextObjective({
      ...base,
      totalTaps: 20,
      generators: { drone: 5 },
      asteroidsShattered: 4,
      expeditionsCompleted: 1,
      lifetimeThisRun: PRESTIGE_BASE,
    });
    expect(o?.id).toBe('collapse_ready');
    expect(o?.tab).toBe('prestige');
  });

  it('flags an available warp', () => {
    const o = nextObjective({
      ...base,
      totalTaps: 20,
      generators: { drone: 5 },
      asteroidsShattered: 4,
      expeditionsCompleted: 1,
      prestigeCount: 3,
      ascensionCount: 2,
      ascensionsSinceWarp: ZONE_WARP_ASCENSIONS,
    });
    expect(o?.id).toBe('warp_ready');
  });

  it('returns nothing for an established player with no pending action', () => {
    expect(
      nextObjective({
        ...base,
        totalTaps: 500,
        generators: { drone: 50 },
        asteroidsShattered: 30,
        expeditionsCompleted: 5,
        prestigeCount: 4,
        ascensionCount: 2,
        ascensionsSinceWarp: 1,
      }),
    ).toBeNull();
  });
});

describe('prestigeAttention', () => {
  it('is false with nothing to claim', () => {
    expect(
      prestigeAttention({ lifetimeThisRun: 0, dmSinceAscension: 0, ascensionsSinceWarp: 0 }),
    ).toBe(false);
  });

  it('is true when a collapse is available', () => {
    expect(
      prestigeAttention({ lifetimeThisRun: PRESTIGE_BASE, dmSinceAscension: 0, ascensionsSinceWarp: 0 }),
    ).toBe(true);
  });

  it('is true when an ascension is available', () => {
    expect(
      prestigeAttention({ lifetimeThisRun: 0, dmSinceAscension: ASCEND_BASE, ascensionsSinceWarp: 0 }),
    ).toBe(true);
  });

  it('is true when a warp is available', () => {
    expect(
      prestigeAttention({
        lifetimeThisRun: 0,
        dmSinceAscension: 0,
        ascensionsSinceWarp: ZONE_WARP_ASCENSIONS,
      }),
    ).toBe(true);
  });
});
