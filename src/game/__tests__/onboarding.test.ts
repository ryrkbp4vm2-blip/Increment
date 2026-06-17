import { nextCrystalObjective, nextObjective, prestigeAttention } from '../onboarding';
import { PRESTIGE_BASE } from '../balance';
import { ASCEND_BASE } from '../ascension';
import { ZONE_WARP_ASCENSIONS } from '../zones';
import { TRANSCEND_ASCENSIONS } from '../transcend';
import { RESONANCE_BASE } from '../crystalGame';

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
  ascensionsSinceTranscend: 0,
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

  it('flags an available transcend once the layer is unlocked', () => {
    const o = nextObjective({
      ...base,
      totalTaps: 20,
      generators: { drone: 5 },
      asteroidsShattered: 4,
      expeditionsCompleted: 1,
      prestigeCount: 6,
      ascensionCount: 6,
      ascensionsSinceTranscend: TRANSCEND_ASCENSIONS,
    });
    expect(o?.id).toBe('transcend_ready');
    expect(o?.tab).toBe('prestige');
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

  it('never re-teaches the basics after the first Collapse', () => {
    // A fresh post-prestige run has no generators, but the player already knows
    // the loop, so the "buy a drone" tutorial must not reappear.
    expect(
      nextObjective({
        ...base,
        totalTaps: 500,
        minerals: 1e6,
        generators: {},
        asteroidsShattered: 0,
        prestigeCount: 1,
      }),
    ).toBeNull();
  });
});

describe('nextCrystalObjective', () => {
  const cbase = {
    crystals: 0,
    crystalGenerators: {} as Record<string, number>,
    crystalRunUpgrades: {} as Record<string, true>,
    lifetimeCrystals: 0,
    resonance: 0,
    convergenceCount: 0,
  };

  it('teaches tapping the formation before the first generator is affordable', () => {
    expect(nextCrystalObjective({ ...cbase, crystals: 2 })?.id).toBe('c_tap');
  });

  it('points to the Forge once a Crystal Shard is affordable', () => {
    const o = nextCrystalObjective({ ...cbase, crystals: 100 });
    expect(o?.id).toBe('c_buy_shard');
    expect(o?.tab).toBe('crystal_forge');
  });

  it('introduces a Forge upgrade once one is unlocked and affordable', () => {
    // c_tap1 unlocks at shard ≥ 1, costs 60.
    const o = nextCrystalObjective({
      ...cbase,
      crystalGenerators: { shard: 5 },
      crystals: 100,
    });
    expect(o?.id).toBe('c_forge');
    expect(o?.tab).toBe('crystal_forge');
  });

  it('flags the first Cascade when the Resonance gate is met', () => {
    const o = nextCrystalObjective({
      ...cbase,
      crystalGenerators: { shard: 10 },
      crystalRunUpgrades: { c_tap1: true },
      lifetimeCrystals: RESONANCE_BASE,
    });
    expect(o?.id).toBe('c_cascade_ready');
    expect(o?.tab).toBe('prestige');
  });

  it('nudges toward the Cascade as the gate approaches', () => {
    expect(
      nextCrystalObjective({
        ...cbase,
        crystalGenerators: { shard: 10 },
        crystalRunUpgrades: { c_tap1: true },
        lifetimeCrystals: RESONANCE_BASE * 0.5,
      })?.id,
    ).toBe('c_cascade_soon');
  });

  it('stops the intro entirely once the first Cascade has happened', () => {
    // After the first Cascade (resonance > 0) the card never reappears, even on
    // a fresh crystal run with no generators that would otherwise re-teach.
    expect(
      nextCrystalObjective({
        ...cbase,
        crystalGenerators: {},
        crystalRunUpgrades: {},
        resonance: 1,
        crystals: 1e6,
      }),
    ).toBeNull();
  });

  it('returns nothing for an established crystal player mid-run', () => {
    expect(
      nextCrystalObjective({
        ...cbase,
        crystalGenerators: { shard: 20 },
        crystalRunUpgrades: { c_tap1: true },
        resonance: 3,
        lifetimeCrystals: 1000,
      }),
    ).toBeNull();
  });

  it('does not re-teach after a Convergence (which resets resonance to 0)', () => {
    // Convergence collapses the crystal layer back to resonance 0, but the
    // player is a veteran — convergenceCount > 0 must keep the intro suppressed.
    expect(
      nextCrystalObjective({
        ...cbase,
        crystalGenerators: {},
        crystalRunUpgrades: {},
        resonance: 0,
        convergenceCount: 1,
        crystals: 2,
      }),
    ).toBeNull();
  });
});

describe('prestigeAttention', () => {
  const calm = {
    lifetimeThisRun: 0,
    dmSinceAscension: 0,
    ascensionsSinceWarp: 0,
    ascensionsSinceTranscend: 0,
  };

  it('is false with nothing to claim', () => {
    expect(prestigeAttention(calm)).toBe(false);
  });

  it('is true when a collapse is available', () => {
    expect(prestigeAttention({ ...calm, lifetimeThisRun: PRESTIGE_BASE })).toBe(true);
  });

  it('is true when an ascension is available', () => {
    expect(prestigeAttention({ ...calm, dmSinceAscension: ASCEND_BASE })).toBe(true);
  });

  it('is true when a warp is available', () => {
    expect(prestigeAttention({ ...calm, ascensionsSinceWarp: ZONE_WARP_ASCENSIONS })).toBe(true);
  });

  it('is true when a transcend is available', () => {
    expect(prestigeAttention({ ...calm, ascensionsSinceTranscend: TRANSCEND_ASCENSIONS })).toBe(true);
  });
});
