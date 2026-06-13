/**
 * Balance regression net: simulate hours of greedy play (tap, then always buy
 * the cheapest affordable thing) and assert the economy stays sane.
 */
import { ACHIEVEMENTS } from '../achievements';
import { ARTIFACTS } from '../artifacts';
import { SINGULARITY_PERKS } from '../ascension';
import { GENERATORS, UPGRADES } from '../balance';
import { CHALLENGES } from '../challenges';
import { DM_UPGRADES } from '../darkmatter';
import { costOfNext, cps, globalMultiplier, isUnlockMet, tapValue } from '../math';
import { RESEARCH_NODES } from '../research';
import { emptyGenerators, initialPersistedState, useGameStore } from '../../store/gameStore';

function simulateSeconds(seconds: number, tapsPerSecond: number) {
  let now = useGameStore.getState().lastTickAt;
  for (let t = 0; t < seconds; t++) {
    now += 1000;
    const store = useGameStore.getState();
    store.applyTick(now);
    // applyTick clamps at 2s, so 1s steps are fully counted.
    for (let i = 0; i < tapsPerSecond; i++) store.tap();

    // Greedy: buy any affordable upgrade, then the cheapest affordable generator.
    let s = useGameStore.getState();
    for (const u of UPGRADES) {
      if (!s.upgrades[u.id] && s.minerals >= u.cost && isUnlockMet(u.unlock, s)) {
        s.buyUpgrade(u.id);
        s = useGameStore.getState();
      }
    }
    for (const g of GENERATORS) {
      while (useGameStore.getState().minerals >= costOfNext(g, useGameStore.getState().generators[g.id])) {
        const before = useGameStore.getState().generators[g.id];
        useGameStore.getState().buyGenerator(g.id, 1);
        if (useGameStore.getState().generators[g.id] === before) break;
      }
    }
  }
}

describe('economy simulation', () => {
  beforeEach(() => {
    useGameStore.getState().hydrate(initialPersistedState(0), 0);
  });

  it('one simulated hour of active play makes steady progress with no NaN', () => {
    simulateSeconds(3600, 2);
    const s = useGameStore.getState();

    expect(Number.isFinite(s.minerals)).toBe(true);
    expect(Number.isFinite(s.cachedCps)).toBe(true);
    expect(s.minerals).toBeGreaterThanOrEqual(0);
    expect(s.lifetimeThisRun).toBeGreaterThan(0);

    // After an hour of active play the engine should be well off the ground:
    // several generator tiers owned and meaningful passive income.
    const tiersOwned = GENERATORS.filter((g) => s.generators[g.id] > 0).length;
    expect(tiersOwned).toBeGreaterThanOrEqual(3);
    expect(s.cachedCps).toBeGreaterThan(10);
    expect(s.cachedCps).toBe(cps(s));
    expect(s.cachedTapValue).toBe(tapValue(s, s.cachedCps));
  });

  it('a fully-loaded state keeps production finite and positive', () => {
    const generators = emptyGenerators();
    for (const g of GENERATORS) generators[g.id] = 120;
    const trueSet = (ids: string[]) => Object.fromEntries(ids.map((i) => [i, true]));

    const loaded = {
      ...initialPersistedState(0),
      generators,
      upgrades: trueSet(UPGRADES.map((u) => u.id)) as Record<string, true>,
      artifacts: trueSet(ARTIFACTS.map((a) => a.id)) as Record<string, true>,
      research: trueSet(RESEARCH_NODES.map((n) => n.id)) as Record<string, true>,
      achievements: trueSet(ACHIEVEMENTS.map((a) => a.id)) as Record<string, true>,
      challengesCompleted: trueSet(CHALLENGES.map((c) => c.id)) as Record<string, true>,
      singularityPerks: trueSet(SINGULARITY_PERKS.map((p) => p.id)) as Record<string, true>,
      dmUpgrades: Object.fromEntries(DM_UPGRADES.map((u) => [u.id, u.maxLevel])) as Record<string, number>,
      totalSingularityCores: 1000,
      asteroidIndex: 60,
    };
    useGameStore.getState().hydrate(loaded, 0);
    const s = useGameStore.getState();

    expect(Number.isFinite(s.cachedCps)).toBe(true);
    expect(Number.isFinite(s.cachedTapValue)).toBe(true);
    expect(Number.isFinite(globalMultiplier(s))).toBe(true);
    expect(s.cachedCps).toBeGreaterThan(0);
    expect(s.cachedTapValue).toBeGreaterThan(0);
    expect(s.cachedCps).toBe(cps(s));

    // Every active challenge modifier still yields a finite production figure.
    for (const c of CHALLENGES) {
      expect(Number.isFinite(globalMultiplier({ ...s, activeChallenge: c.id }))).toBe(true);
    }
  });

  it('lifetime tracking is monotonic and consistent', () => {
    simulateSeconds(600, 1);
    const mid = useGameStore.getState().lifetimeThisRun;
    simulateSeconds(600, 1);
    const s = useGameStore.getState();
    expect(s.lifetimeThisRun).toBeGreaterThan(mid);
    expect(s.lifetimeAllTime).toBe(s.lifetimeThisRun);
    expect(s.minerals).toBeLessThanOrEqual(s.lifetimeThisRun);
  });
});
