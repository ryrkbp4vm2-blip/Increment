import { costOfNext, globalMultiplier } from '../../game/math';
import { singularityMult } from '../../game/ascension';
import { GENERATORS_BY_ID } from '../../game/balance';
import { achievementBonus } from '../../game/achievements';
import { ZONE_WARP_ASCENSIONS, sectorMult, sectorTrait } from '../../game/zones';
import { CRYSTAL_UPGRADES_BY_ID, TRANSCEND_ASCENSIONS } from '../../game/transcend';
import { CONVERGENCE_ATTUNEMENT } from '../../game/convergence';
import { initialPersistedState, useGameStore } from '../gameStore';

function reset(overrides: Partial<ReturnType<typeof initialPersistedState>> = {}) {
  useGameStore.getState().hydrate({ ...initialPersistedState(1000), ...overrides }, 1000);
}

describe('gameStore', () => {
  beforeEach(() => reset());

  it('Drill Heat builds with rapid taps and boosts later taps', () => {
    reset();
    const e1 = useGameStore.getState().tap();
    const h1 = useGameStore.getState().tapHeat;
    const e2 = useGameStore.getState().tap();
    const h2 = useGameStore.getState().tapHeat;
    expect(h1).toBeCloseTo(0.1);
    expect(h2).toBeGreaterThan(h1);
    // The second tap is multiplied by higher heat, so it earns more.
    expect(e2).toBeGreaterThan(e1);
  });

  it('tap earns the cached tap value and counts taps', () => {
    const earned = useGameStore.getState().tap();
    expect(earned).toBe(1);
    const s = useGameStore.getState();
    expect(s.minerals).toBe(1);
    expect(s.lifetimeThisRun).toBe(1);
    expect(s.totalTaps).toBe(1);
  });

  it('buyGenerator deducts cost and recomputes cps', () => {
    reset({ minerals: 100 });
    useGameStore.getState().buyGenerator('drone', 1);
    const s = useGameStore.getState();
    expect(s.generators.drone).toBe(1);
    expect(s.minerals).toBe(90);
    expect(s.cachedCps).toBeCloseTo(0.5);
  });

  it('refuses unaffordable purchases', () => {
    reset({ minerals: 5 });
    useGameStore.getState().buyGenerator('drone', 1);
    expect(useGameStore.getState().generators.drone).toBe(0);
    expect(useGameStore.getState().minerals).toBe(5);
  });

  it('buy max purchases the exact affordable amount', () => {
    reset({ minerals: 100 });
    useGameStore.getState().buyGenerator('drone', 'max');
    const s = useGameStore.getState();
    expect(s.generators.drone).toBe(6); // bulkCost(0,6)=88 <= 100 < bulkCost(0,7)=111
    expect(s.minerals).toBeLessThan(costOfNext(GENERATORS_BY_ID.drone, 6));
  });

  it('buyUpgrade enforces cost, unlock condition and uniqueness', () => {
    reset({ minerals: 1000, totalTaps: 5 });
    useGameStore.getState().buyUpgrade('tap1'); // needs 10 taps
    expect(useGameStore.getState().upgrades.tap1).toBeUndefined();

    reset({ minerals: 1000, totalTaps: 25 });
    useGameStore.getState().buyUpgrade('tap1');
    let s = useGameStore.getState();
    expect(s.upgrades.tap1).toBe(true);
    expect(s.minerals).toBe(950);
    expect(s.cachedTapValue).toBe(2);

    useGameStore.getState().buyUpgrade('tap1'); // already owned: no double charge
    expect(useGameStore.getState().minerals).toBe(950);
  });

  it('applyTick earns cachedCps over the elapsed delta, clamped', () => {
    reset({ minerals: 0, generators: { ...initialPersistedState().generators, excavator: 10 } });
    const s0 = useGameStore.getState();
    expect(s0.cachedCps).toBeCloseTo(30);
    s0.applyTick(2000); // 1s after hydrate at t=1000
    expect(useGameStore.getState().minerals).toBeCloseTo(30);
    useGameStore.getState().applyTick(60_000); // 58s gap clamps to 2s
    expect(useGameStore.getState().minerals).toBeCloseTo(90);
  });

  it('comet frenzy multiplies tick earnings until it expires', () => {
    reset({ minerals: 0, generators: { ...initialPersistedState().generators, excavator: 10 } });
    useGameStore.getState().collectComet({ kind: 'frenzy', mult: 7, durationMs: 30_000 }, 1000);
    useGameStore.getState().applyTick(2000); // 1s inside frenzy: 30 * 7
    expect(useGameStore.getState().minerals).toBeCloseTo(210);
    useGameStore.getState().applyTick(32_000); // clamped 2s, frenzy expired at 31s
    expect(useGameStore.getState().minerals).toBeCloseTo(210 + 60);
  });

  it('comet windfall grants minerals immediately', () => {
    reset({ minerals: 10 });
    useGameStore.getState().collectComet({ kind: 'windfall', amount: 350 }, 1000);
    const s = useGameStore.getState();
    expect(s.minerals).toBe(360);
    expect(s.lifetimeThisRun).toBe(350);
  });

  it('earnings damage the asteroid and shatter pays a bonus', () => {
    reset();
    // Asteroid 0 has 400 HP; a 450 windfall shatters it (bonus 40 = 10% of HP).
    useGameStore.getState().collectComet({ kind: 'windfall', amount: 450 }, 1000);
    const s = useGameStore.getState();
    expect(s.asteroidIndex).toBe(1);
    expect(s.asteroidDamage).toBe(50);
    expect(s.minerals).toBe(450 + 40);
    // Belt richness applies to the tap value immediately.
    expect(s.cachedTapValue).toBeCloseTo(1.15);
  });

  it('expeditions launch, deduct fuel, and pay out on claim', () => {
    reset({ minerals: 5000 });
    useGameStore.getState().launchExpedition('scout', 1000);
    let s = useGameStore.getState();
    expect(s.expedition).not.toBeNull();
    expect(s.minerals).toBe(5000 - 25); // fuel floor at zero cps
    expect(s.expedition!.endsAt).toBe(1000 + 5 * 60_000);

    // Can't double-launch or claim early.
    useGameStore.getState().launchExpedition('survey', 2000);
    expect(useGameStore.getState().expedition!.defId).toBe('scout');
    expect(useGameStore.getState().claimExpedition(2000)).toBeNull();

    const result = useGameStore.getState().claimExpedition(1000 + 5 * 60_000);
    expect(result).not.toBeNull();
    s = useGameStore.getState();
    expect(s.expedition).toBeNull();
    expect(s.minerals).toBeGreaterThan(5000 - 25);
    if (result!.artifactId) {
      expect(s.artifacts[result!.artifactId]).toBe(true);
    }
  });

  it('buyDarkMatterUpgrade spends Dark Matter and boosts production', () => {
    reset({ minerals: 0, darkMatter: 5, generators: { ...initialPersistedState().generators, excavator: 10 } });
    expect(useGameStore.getState().cachedCps).toBeCloseTo(30);
    useGameStore.getState().buyDarkMatterUpgrade('stellar_density'); // lvl1 costs 1, +40%
    let s = useGameStore.getState();
    expect(s.darkMatter).toBe(4);
    expect(s.dmUpgrades.stellar_density).toBe(1);
    expect(s.cachedCps).toBeCloseTo(30 * 1.4);

    // Can't buy what you can't afford.
    reset({ darkMatter: 0, generators: { ...initialPersistedState().generators, excavator: 10 } });
    useGameStore.getState().buyDarkMatterUpgrade('stellar_density');
    expect(useGameStore.getState().dmUpgrades.stellar_density).toBeUndefined();
  });

  it('prestige awards dark matter, resets the run, keeps shop and artifacts', () => {
    reset({
      minerals: 5e12,
      lifetimeThisRun: 4e10, // sqrt(4e10/1e10) = 2 DM
      lifetimeAllTime: 6e12,
      generators: { ...initialPersistedState().generators, dyson: 5 },
      upgrades: { tap1: true },
      darkMatter: 3,
      totalDarkMatter: 3,
      dmUpgrades: { stellar_density: 2 },
      prestigeCount: 1,
      asteroidIndex: 12,
      asteroidDamage: 999,
      artifacts: { pulsar_shard: true },
    });
    useGameStore.getState().doPrestige();
    const s = useGameStore.getState();
    expect(s.darkMatter).toBe(5); // 3 + 2
    expect(s.totalDarkMatter).toBe(5);
    expect(s.prestigeCount).toBe(2);
    expect(s.minerals).toBe(0); // no head-start upgrades owned
    expect(s.lifetimeThisRun).toBe(0);
    expect(s.lifetimeAllTime).toBe(6e12);
    expect(s.generators.dyson).toBe(0);
    expect(s.upgrades.tap1).toBeUndefined();
    // the belt resets; shop and artifacts survive
    expect(s.asteroidIndex).toBe(0);
    expect(s.asteroidDamage).toBe(0);
    expect(s.dmUpgrades.stellar_density).toBe(2);
    expect(s.artifacts.pulsar_shard).toBe(true);
    // shop (+40%*2 = x1.8), artifact (x1.1) and carried-over achievement
    // bonuses all apply immediately.
    expect(s.cachedTapValue).toBeCloseTo(1.8 * 1.1 * achievementBonus(s.achievements));
  });

  it('prestige head-start upgrades grant starting minerals and belt depth', () => {
    reset({
      lifetimeThisRun: 1e10,
      dmUpgrades: { quantum_reserves: 2, belt_resonance: 3 },
    });
    useGameStore.getState().doPrestige();
    const s = useGameStore.getState();
    expect(s.minerals).toBe(10_000); // mineralStockpile(1000, 2) = 1000 * 10^1
    expect(s.asteroidIndex).toBe(3);
  });

  it('prestige applies the DM-gain multiplier', () => {
    reset({ lifetimeThisRun: 1e12, dmUpgrades: { dark_compression: 5 } }); // +20%*5 = x2
    useGameStore.getState().doPrestige();
    // pending = sqrt(1e12/1e10) = 10, x2 = 20
    expect(useGameStore.getState().darkMatter).toBe(20);
  });

  it('prestige does nothing below the threshold', () => {
    reset({ minerals: 100, lifetimeThisRun: 1e8 });
    useGameStore.getState().doPrestige();
    expect(useGameStore.getState().minerals).toBe(100);
    expect(useGameStore.getState().prestigeCount).toBe(0);
  });

  it('tracks comet, expedition and shatter counters for achievements', () => {
    reset({ minerals: 5000 });
    useGameStore.getState().collectComet({ kind: 'windfall', amount: 100 }, 1000);
    expect(useGameStore.getState().cometsCaught).toBe(1);
    useGameStore.getState().collectComet({ kind: 'frenzy', mult: 7, durationMs: 1000 }, 1000);
    expect(useGameStore.getState().cometsCaught).toBe(2);

    reset({ minerals: 0 });
    // a 450 windfall shatters asteroid 0 (400 HP)
    useGameStore.getState().collectComet({ kind: 'windfall', amount: 450 }, 1000);
    expect(useGameStore.getState().asteroidsShattered).toBe(1);
  });

  it('hydrate silently completes already-met achievements without toasts', () => {
    reset({ totalTaps: 100, lifetimeAllTime: 1e3 });
    const s = useGameStore.getState();
    expect(s.achievements.t_100).toBe(true);
    expect(s.achievements.m_1k).toBe(true);
    expect(s.newAchievements).toEqual([]);
  });

  it('tickAchievements unlocks new goals, queues toasts and boosts production', () => {
    reset({ generators: { ...initialPersistedState().generators, drone: 10 } });
    const before = useGameStore.getState().cachedCps;
    // Tap to 100 to qualify for t_100.
    for (let i = 0; i < 100; i++) useGameStore.getState().tap();
    useGameStore.getState().tickAchievements();
    const s = useGameStore.getState();
    expect(s.achievements.t_100).toBe(true);
    expect(s.newAchievements).toContain('t_100');
    // +2% production bonus is now active.
    expect(s.cachedCps).toBeCloseTo(before * 1.02);
    // consume clears the queue
    expect(useGameStore.getState().consumeAchievements()).toContain('t_100');
    expect(useGameStore.getState().newAchievements).toEqual([]);
  });

  it('mints Research Points when asteroids shatter', () => {
    reset({ minerals: 0 });
    // 450 windfall shatters asteroid 0 (400 HP); rpFromShatter(0) = 1
    useGameStore.getState().collectComet({ kind: 'windfall', amount: 450 }, 1000);
    expect(useGameStore.getState().researchPoints).toBe(1);
    expect(useGameStore.getState().totalResearch).toBe(1);
  });

  it('buyResearch enforces RP, prerequisites and uniqueness, and boosts production', () => {
    reset({ researchPoints: 100, generators: { ...initialPersistedState().generators, drone: 10 } });
    const before = useGameStore.getState().cachedCps;

    // ex2 needs ex1 first.
    useGameStore.getState().buyResearch('ex2');
    expect(useGameStore.getState().research.ex2).toBeUndefined();

    useGameStore.getState().buyResearch('ex1'); // cost 3, +25% production
    let s = useGameStore.getState();
    expect(s.research.ex1).toBe(true);
    expect(s.researchPoints).toBe(97);
    expect(s.cachedCps).toBeCloseTo(before * 1.25);

    // Now ex2 unlocks.
    useGameStore.getState().buyResearch('ex2');
    expect(useGameStore.getState().research.ex2).toBe(true);

    // No double purchase.
    const rpAfter = useGameStore.getState().researchPoints;
    useGameStore.getState().buyResearch('ex1');
    expect(useGameStore.getState().researchPoints).toBe(rpAfter);
  });

  it('research survives prestige', () => {
    reset({ lifetimeThisRun: 1e10, researchPoints: 20, research: { ex1: true } });
    useGameStore.getState().doPrestige();
    const s = useGameStore.getState();
    expect(s.research.ex1).toBe(true);
    expect(s.researchPoints).toBe(20);
  });

  it('applyEventOutcome handles each cosmic-event reward', () => {
    reset({ minerals: 1000, researchPoints: 5 });
    useGameStore.getState().applyEventOutcome({ kind: 'rp', amount: 7 }, 1000);
    expect(useGameStore.getState().researchPoints).toBe(12);

    // 500 windfall mines through asteroid 0 (400 HP), paying a +40 shatter bonus.
    useGameStore.getState().applyEventOutcome({ kind: 'windfall', amount: 500 }, 1000);
    expect(useGameStore.getState().minerals).toBe(1540);

    useGameStore.getState().applyEventOutcome({ kind: 'frenzy', mult: 3, durationMs: 5000 }, 1000);
    expect(useGameStore.getState().frenzyUntil).toBe(6000);

    useGameStore.getState().applyEventOutcome({ kind: 'loseMineralsPct', pct: 0.1 }, 1000);
    expect(useGameStore.getState().minerals).toBeCloseTo(1540 * 0.9);
  });

  it('prestige banks Dark Matter toward ascension', () => {
    reset({ lifetimeThisRun: 1e12 }); // pending 10 DM
    useGameStore.getState().doPrestige();
    expect(useGameStore.getState().dmSinceAscension).toBe(10);
  });

  it('doAscend grants cores, resets the DM layer, keeps research/artifacts', () => {
    reset({
      dmSinceAscension: 4e6, // sqrt(4e6/1e6) = 2 cores
      darkMatter: 50,
      dmUpgrades: { stellar_density: 5 },
      research: { ex1: true },
      researchPoints: 30,
      artifacts: { pulsar_shard: true },
      generators: { ...initialPersistedState().generators, dyson: 3 },
      ascensionCount: 1,
    });
    useGameStore.getState().doAscend();
    const s = useGameStore.getState();
    expect(s.singularityCores).toBe(2);
    expect(s.ascensionCount).toBe(2);
    expect(s.dmSinceAscension).toBe(0);
    // Dark Matter layer is sacrificed
    expect(s.darkMatter).toBe(0);
    expect(s.dmUpgrades).toEqual({});
    expect(s.generators.dyson).toBe(0);
    // deeper layers persist
    expect(s.research.ex1).toBe(true);
    expect(s.researchPoints).toBe(30);
    expect(s.artifacts.pulsar_shard).toBe(true);
    // The 2-core ×2 bonus is folded into the live production multiplier.
    expect(singularityMult(s.singularityCores)).toBe(2);
    expect(s.cachedTapValue).toBeCloseTo(globalMultiplier(s));
  });

  it('doAscend does nothing below the threshold', () => {
    reset({ dmSinceAscension: 50, darkMatter: 10 });
    useGameStore.getState().doAscend();
    expect(useGameStore.getState().singularityCores).toBe(0);
    expect(useGameStore.getState().darkMatter).toBe(10);
  });

  it('buySingularityPerk spends cores, blocks dupes and the unaffordable', () => {
    reset({ singularityCores: 2 });
    useGameStore.getState().buySingularityPerk('auto_driller'); // cost 1
    expect(useGameStore.getState().singularityCores).toBe(1);
    expect(useGameStore.getState().singularityPerks.auto_driller).toBe(true);
    // already owned: no further charge
    useGameStore.getState().buySingularityPerk('auto_driller');
    expect(useGameStore.getState().singularityCores).toBe(1);
    // unaffordable (core_resonance costs 8)
    useGameStore.getState().buySingularityPerk('core_resonance');
    expect(useGameStore.getState().singularityPerks.core_resonance).toBeUndefined();
  });

  it('Core Resonance strengthens the live production multiplier', () => {
    reset({
      singularityCores: 10,
      totalSingularityCores: 4,
      generators: { ...initialPersistedState().generators, excavator: 10 },
    });
    const before = useGameStore.getState().cachedCps;
    useGameStore.getState().buySingularityPerk('core_resonance');
    // 1+0.75*4 = 4 vs 1+0.5*4 = 3
    expect(useGameStore.getState().cachedCps).toBeCloseTo((before * 4) / 3);
  });

  it('doAscend keeps perks and accrues total cores; Belt Memory seeds the belt', () => {
    reset({ dmSinceAscension: 4e6, singularityPerks: { belt_memory: true }, totalSingularityCores: 3 });
    useGameStore.getState().doAscend();
    const s = useGameStore.getState();
    expect(s.singularityPerks.belt_memory).toBe(true);
    expect(s.totalSingularityCores).toBe(5); // 3 + 2 gained
    expect(s.asteroidIndex).toBe(4); // BELT_MEMORY_INDEX
  });

  it('autoTick Auto-Driller mines and Auto-Foreman buys', () => {
    reset({ minerals: 100, singularityPerks: { auto_driller: true, auto_foreman: true } });
    const now = Date.now() + 10_000;
    // The driller taps 5×/sec = 0.5 per 100ms tick, carried fractionally —
    // two ticks are guaranteed to land at least one tap.
    useGameStore.getState().autoTick(now);
    useGameStore.getState().autoTick(now + 100);
    const s = useGameStore.getState();
    expect(s.totalTaps).toBeGreaterThanOrEqual(1); // driller tapped
    expect(s.generators.drone).toBe(1); // foreman bought the cheapest
  });

  it('enterChallenge resets the run but keeps all meta progression', () => {
    reset({
      minerals: 1e6,
      darkMatter: 50,
      ascensionCount: 1, // famine unlocks at 1 ascension
      research: { ex1: true },
      achievements: { t_100: true },
      generators: { ...initialPersistedState().generators, drone: 30 },
      singularityCores: 4,
    });
    useGameStore.getState().enterChallenge('famine');
    const s = useGameStore.getState();
    expect(s.activeChallenge).toBe('famine');
    expect(s.generators.drone).toBe(0); // run reset
    expect(s.lifetimeThisRun).toBe(0);
    expect(s.darkMatter).toBe(50); // meta kept
    expect(s.research.ex1).toBe(true);
    expect(s.achievements.t_100).toBe(true);
    expect(s.singularityCores).toBe(4);
  });

  it('famine challenge throttles production to 20%', () => {
    reset({ generators: { ...initialPersistedState().generators, excavator: 10 } });
    const normal = useGameStore.getState().cachedCps;
    reset({
      generators: { ...initialPersistedState().generators, excavator: 10 },
      activeChallenge: 'famine',
    });
    expect(useGameStore.getState().cachedCps).toBeCloseTo(normal * 0.2);
  });

  it('asceticism disables generator purchases', () => {
    reset({ minerals: 1e6, activeChallenge: 'asceticism' });
    useGameStore.getState().buyGenerator('drone', 1);
    expect(useGameStore.getState().generators.drone).toBe(0);
  });

  it('completeChallenge grants the permanent reward and clears the run', () => {
    reset({ activeChallenge: 'famine', lifetimeThisRun: 1e8 });
    const before = globalMultiplier({ ...useGameStore.getState(), activeChallenge: null });
    useGameStore.getState().completeChallenge();
    const s = useGameStore.getState();
    expect(s.activeChallenge).toBeNull();
    expect(s.challengesCompleted.famine).toBe(true);
    expect(s.lifetimeThisRun).toBe(0);
    // famine reward is ×2 global production, now active with no modifier
    expect(globalMultiplier(s)).toBeCloseTo(before * 2);
  });

  it('completeChallenge does nothing before the goal is met', () => {
    reset({ activeChallenge: 'famine', lifetimeThisRun: 1e3 });
    useGameStore.getState().completeChallenge();
    expect(useGameStore.getState().activeChallenge).toBe('famine');
    expect(useGameStore.getState().challengesCompleted.famine).toBeUndefined();
  });

  it('locks permanent-power purchases while a challenge is active', () => {
    // Spending banked meta-currency mid-challenge would multiply production
    // past the goal snapshotted at entry, trivializing the run.
    reset({
      activeChallenge: 'famine',
      darkMatter: 1e6,
      researchPoints: 1e6,
      singularityCores: 100,
    });
    useGameStore.getState().buyDarkMatterUpgrade('stellar_density');
    useGameStore.getState().buyResearch('ex1');
    useGameStore.getState().buyCoreUpgrade('core_overcharge');
    useGameStore.getState().buySingularityPerk('auto_driller');
    const s = useGameStore.getState();
    expect(s.dmUpgrades).toEqual({});
    expect(s.research).toEqual({});
    expect(s.coreUpgrades).toEqual({});
    expect(s.singularityPerks).toEqual({});
    // ...and all of them work again once the challenge is abandoned.
    useGameStore.getState().abandonChallenge();
    useGameStore.getState().buyDarkMatterUpgrade('stellar_density');
    expect(useGameStore.getState().dmUpgrades.stellar_density).toBe(1);
  });

  it('doPrestige cancels an in-flight expedition (loot was priced at old CPS)', () => {
    reset({
      lifetimeThisRun: 1e12,
      expedition: { defId: 'scout', startedAt: 0, endsAt: 10, loot: 1e9 },
    });
    useGameStore.getState().doPrestige();
    expect(useGameStore.getState().expedition).toBeNull();
  });

  it('enterChallenge enforces the ascension unlock gate in the store', () => {
    reset({ ascensionCount: 0 });
    useGameStore.getState().enterChallenge('famine'); // needs 1 ascension
    expect(useGameStore.getState().activeChallenge).toBeNull();
    useGameStore.getState().enterChallenge('asceticism'); // unlocked from 0
    expect(useGameStore.getState().activeChallenge).toBe('asceticism');
  });

  it('enterChallenge snapshots a goal scaled by permanent power', () => {
    // A heavily-ascended player carries a large permanent multiplier, so the
    // challenge goal must scale up to stay a real fight (not insta-cleared).
    reset({ totalSingularityCores: 10, ascensionCount: 1 });
    const power = singularityMult(10);
    useGameStore.getState().enterChallenge('famine');
    const s = useGameStore.getState();
    expect(power).toBeGreaterThan(1);
    // famine base goal is 1e8; the snapshot is at least that, scaled by power.
    expect(s.activeChallengeGoal).toBeGreaterThan(1e8);
    expect(s.activeChallengeGoal).toBeGreaterThanOrEqual(1e8 * power);
    // The same fixed lifetime that used to clear it no longer does.
    useGameStore.setState({ lifetimeThisRun: 1e8 });
    useGameStore.getState().completeChallenge();
    expect(useGameStore.getState().activeChallenge).toBe('famine');
  });

  it('abandonChallenge exits with no reward', () => {
    reset({ activeChallenge: 'famine', lifetimeThisRun: 1e8 });
    useGameStore.getState().abandonChallenge();
    const s = useGameStore.getState();
    expect(s.activeChallenge).toBeNull();
    expect(s.challengesCompleted.famine).toBeUndefined();
  });

  it('claimDaily grants a reward once per cooldown and tracks the streak', () => {
    reset({ generators: { ...initialPersistedState().generators, excavator: 10 }, lastDailyAt: 0 });
    const t1 = 1_000_000_000;
    const first = useGameStore.getState().claimDaily(t1);
    expect(first).not.toBeNull();
    expect(first!.streak).toBe(1);
    expect(useGameStore.getState().minerals).toBeGreaterThan(0);
    // Immediate re-claim is refused.
    expect(useGameStore.getState().claimDaily(t1 + 1000)).toBeNull();
    // After the cooldown, claim again and the streak grows.
    const second = useGameStore.getState().claimDaily(t1 + 20 * 3600_000);
    expect(second!.streak).toBe(2);
  });

  it('buyCoreUpgrade spends cores for a repeatable production boost', () => {
    reset({
      singularityCores: 10,
      generators: { ...initialPersistedState().generators, excavator: 10 },
    });
    const before = useGameStore.getState().cachedCps;
    useGameStore.getState().buyCoreUpgrade('core_overcharge'); // +25%, costs 1
    let s = useGameStore.getState();
    expect(s.singularityCores).toBe(9);
    expect(s.coreUpgrades.core_overcharge).toBe(1);
    expect(s.cachedCps).toBeCloseTo(before * 1.25);
    // Cost rises with level, so cores keep having a sink.
    useGameStore.getState().buyCoreUpgrade('core_overcharge'); // level 1 -> 2 costs 2
    s = useGameStore.getState();
    expect(s.singularityCores).toBe(7);
    expect(s.coreUpgrades.core_overcharge).toBe(2);
  });

  it('core upgrades survive ascension and warp', () => {
    reset({ dmSinceAscension: 4e6, coreUpgrades: { core_overcharge: 3 } });
    useGameStore.getState().doAscend();
    expect(useGameStore.getState().coreUpgrades.core_overcharge).toBe(3);
  });

  it('doAscend counts toward the sector warp gate', () => {
    reset({ dmSinceAscension: 4e6, ascensionsSinceWarp: 2 });
    useGameStore.getState().doAscend();
    expect(useGameStore.getState().ascensionsSinceWarp).toBe(3);
  });

  it('doWarp advances the sector, resets the layers, keeps collections', () => {
    reset({
      ascensionsSinceWarp: ZONE_WARP_ASCENSIONS, // meets the warp gate
      sector: 0,
      darkMatter: 99,
      dmUpgrades: { stellar_density: 4 },
      singularityCores: 7,
      totalSingularityCores: 7,
      generators: { ...initialPersistedState().generators, dyson: 4 },
      research: { ex1: true },
      artifacts: { pulsar_shard: true },
      achievements: { t_100: true },
      singularityPerks: { auto_driller: true },
    });
    useGameStore.getState().doWarp();
    const s = useGameStore.getState();
    expect(s.sector).toBe(1);
    expect(s.ascensionsSinceWarp).toBe(0);
    // sacrificed layers
    expect(s.darkMatter).toBe(0);
    expect(s.dmUpgrades).toEqual({});
    expect(s.singularityCores).toBe(0);
    expect(s.generators.dyson).toBe(0);
    // carried over
    expect(s.totalSingularityCores).toBe(7); // multiplier preserved
    expect(s.research.ex1).toBe(true);
    expect(s.artifacts.pulsar_shard).toBe(true);
    expect(s.achievements.t_100).toBe(true);
    expect(s.singularityPerks.auto_driller).toBe(true);
    // the ×50 sector bonus and the sector-1 trait are both live in production
    expect(globalMultiplier(s)).toBeCloseTo(
      globalMultiplier({ ...s, sector: 0 }) * sectorMult(1) * sectorTrait(1).productionMult,
    );
  });

  it('doWarp does nothing before the ascension gate is met', () => {
    reset({ ascensionsSinceWarp: ZONE_WARP_ASCENSIONS - 1, sector: 0 });
    useGameStore.getState().doWarp();
    expect(useGameStore.getState().sector).toBe(0);
  });

  it('doTranscend wipes the empire for Crystals, keeping the Matrix and records', () => {
    reset({
      ascensionsSinceTranscend: TRANSCEND_ASCENSIONS + 1, // 6 -> 2 crystals
      ascensionCount: 8,
      sector: 3,
      darkMatter: 500,
      dmUpgrades: { stellar_density: 4 },
      singularityCores: 9,
      totalSingularityCores: 12,
      research: { ex1: true },
      artifacts: { pulsar_shard: true },
      achievements: { t_100: true },
      crystalUpgrades: { crystal_resonance: 2 },
      generators: { ...initialPersistedState().generators, dyson: 5 },
    });
    useGameStore.getState().doTranscend();
    const s = useGameStore.getState();
    // gained pendingCrystals(6) = 2 crystals
    expect(s.crystals).toBe(2);
    expect(s.totalCrystals).toBe(2);
    expect(s.transcendCount).toBe(1);
    expect(s.ascensionsSinceTranscend).toBe(0);
    // the whole empire below is wiped
    expect(s.sector).toBe(0);
    expect(s.darkMatter).toBe(0);
    expect(s.dmUpgrades).toEqual({});
    expect(s.totalSingularityCores).toBe(0);
    expect(s.research).toEqual({});
    expect(s.artifacts).toEqual({});
    expect(s.generators.dyson).toBe(0);
    // the Crystal Matrix and permanent records survive
    expect(s.crystalUpgrades).toEqual({ crystal_resonance: 2 });
    expect(s.achievements.t_100).toBe(true);
    expect(s.ascensionCount).toBe(8); // lifetime count keeps the layer unlocked
  });

  it('crystal challenge: enter resets the run, constrains it, and pays a permanent reward', () => {
    reset({
      transcendCount: 1,
      resonance: 2,
      crystals: 5000,
      lifetimeCrystals: 9000,
      crystalGenerators: { shard: 20 },
      crystalRunUpgrades: { c_tap1: true },
    });
    // Bare Hands (resonance 2): generators disabled, tap-only.
    useGameStore.getState().enterCrystalChallenge('cc_bare_hands');
    let s = useGameStore.getState();
    expect(s.activeCrystalChallenge).toBe('cc_bare_hands');
    expect(s.activeCrystalChallengeGoal).toBeGreaterThan(0);
    expect(s.crystals).toBe(0); // run reset
    expect(s.crystalGenerators).toEqual({});
    expect(s.cachedCrystalCps).toBe(0); // generators disabled
    expect(s.resonance).toBe(2); // permanent layers untouched
    // Generator purchases are refused during the run.
    useGameStore.setState({ crystals: 1e9 });
    useGameStore.getState().buyCrystalGenerator('shard', 1);
    expect(useGameStore.getState().crystalGenerators).toEqual({});
    // Cascading mid-challenge is blocked (it would destroy the attempt).
    useGameStore.setState({ lifetimeCrystals: 1e12 });
    useGameStore.getState().doResonate();
    expect(useGameStore.getState().activeCrystalChallenge).toBe('cc_bare_hands');
    // Reaching the snapshot goal completes it: permanent tap ×4, run resets.
    useGameStore.getState().completeCrystalChallenge();
    s = useGameStore.getState();
    expect(s.activeCrystalChallenge).toBeNull();
    expect(s.crystalChallengesCompleted.cc_bare_hands).toBe(true);
    expect(s.lifetimeCrystals).toBe(0);
    const rewardedTap = s.cachedCrystalTapValue;
    useGameStore.setState({ crystalChallengesCompleted: {} });
    useGameStore.getState().buyCrystalRunUpgrade('nope'); // no-op, refreshes nothing
    // Compare tap value with and without the reward via a cache rebuild.
    reset({ transcendCount: 1, resonance: 2 });
    expect(rewardedTap).toBeCloseTo(useGameStore.getState().cachedCrystalTapValue * 4);
  });

  it('crystal challenge: gates on resonance and blocks permanent purchases mid-run', () => {
    reset({ transcendCount: 1, resonance: 1, attunement: 1e9, eons: 1e9 });
    useGameStore.getState().enterCrystalChallenge('cc_bare_hands'); // needs resonance 2
    expect(useGameStore.getState().activeCrystalChallenge).toBeNull();
    useGameStore.getState().enterCrystalChallenge('cc_silent_forge'); // unlocked at 1
    expect(useGameStore.getState().activeCrystalChallenge).toBe('cc_silent_forge');
    // Forge upgrades sealed by this challenge; Matrix + Eon trees locked mid-run.
    useGameStore.setState({ crystals: 1e9, crystalGenerators: { shard: 10 } });
    useGameStore.getState().buyCrystalRunUpgrade('c_tap1');
    expect(useGameStore.getState().crystalRunUpgrades).toEqual({});
    useGameStore.getState().buyCrystalUpgrade('crystal_resonance');
    expect(useGameStore.getState().crystalUpgrades).toEqual({});
    useGameStore.getState().buyEonUpgrade('eon_flux');
    expect(useGameStore.getState().eonUpgrades).toEqual({});
    // Abandoning restores normal play with no reward.
    useGameStore.getState().abandonCrystalChallenge();
    expect(useGameStore.getState().activeCrystalChallenge).toBeNull();
    expect(useGameStore.getState().crystalChallengesCompleted).toEqual({});
  });

  it('crystal challenge rewards survive a Cascade and a Convergence', () => {
    reset({
      transcendCount: 1,
      resonance: 3,
      lifetimeCrystals: 1e12,
      crystalChallengesCompleted: { cc_silent_forge: true },
      attunementSinceConverge: CONVERGENCE_ATTUNEMENT,
    });
    useGameStore.getState().doResonate();
    expect(useGameStore.getState().crystalChallengesCompleted.cc_silent_forge).toBe(true);
    useGameStore.getState().doConverge();
    expect(useGameStore.getState().crystalChallengesCompleted.cc_silent_forge).toBe(true);
  });

  it('doTranscend is one-way: it refuses to fire a second time', () => {
    // Crystal mode replaces the mineral game permanently; a second Transcend
    // would wipe Resonance and Attunement, so it must be impossible.
    reset({
      transcendCount: 1,
      ascensionsSinceTranscend: TRANSCEND_ASCENSIONS + 3,
      resonance: 5,
      attunement: 100,
      crystals: 10,
    });
    useGameStore.getState().doTranscend();
    const s = useGameStore.getState();
    expect(s.transcendCount).toBe(1);
    expect(s.resonance).toBe(5);
    expect(s.attunement).toBe(100);
    expect(s.crystals).toBe(10);
  });

  it('doTranscend does nothing before the ascension gate is met', () => {
    reset({ ascensionsSinceTranscend: TRANSCEND_ASCENSIONS - 1, crystals: 0 });
    useGameStore.getState().doTranscend();
    expect(useGameStore.getState().crystals).toBe(0);
    expect(useGameStore.getState().transcendCount).toBe(0);
  });

  it('crystalTap mines crystals and tracks lifetime crystals', () => {
    reset({ transcendCount: 1, crystals: 0, lifetimeCrystals: 0 });
    const earned = useGameStore.getState().crystalTap();
    const s = useGameStore.getState();
    expect(earned).toBeGreaterThan(0);
    expect(s.crystals).toBe(earned);
    expect(s.lifetimeCrystals).toBe(earned);
  });

  it('crystalTap builds Drill Heat that boosts later taps', () => {
    reset({ transcendCount: 1, crystals: 0, lifetimeCrystals: 0 });
    useGameStore.getState().crystalTap();
    const heat = useGameStore.getState().tapHeat;
    expect(heat).toBeGreaterThan(0);
    // A rapid second tap (heat still high) yields more than the cold first tap.
    const first = useGameStore.getState().crystals;
    const gained2 = useGameStore.getState().crystalTap();
    expect(gained2).toBeGreaterThan(first);
  });

  it('buyCrystalGenerator spends crystals and raises crystal CPS', () => {
    reset({ transcendCount: 1, crystals: 1000 });
    const before = useGameStore.getState().cachedCrystalCps;
    useGameStore.getState().buyCrystalGenerator('shard', 1);
    const s = useGameStore.getState();
    expect(s.crystalGenerators.shard).toBe(1);
    expect(s.crystals).toBeLessThan(1000);
    expect(s.cachedCrystalCps).toBeGreaterThan(before);
  });

  it('a geode windfall pays out Crystals in crystal mode', () => {
    // Deep formation so the windfall doesn't shatter it and add bonus crystals.
    reset({ transcendCount: 1, crystals: 0, lifetimeCrystals: 0, crystalFormationIndex: 40 });
    useGameStore.getState().collectComet({ kind: 'windfall', amount: 500 }, 2000);
    const s = useGameStore.getState();
    expect(s.crystals).toBe(500);
    expect(s.lifetimeCrystals).toBe(500);
    expect(s.cometsCaught).toBe(1);
  });

  it('a geode frenzy boosts crystal production via frenzyFactor', () => {
    // A deep formation never shatters in the window, so the gain is clean.
    reset({ transcendCount: 1, crystalGenerators: { shard: 100 }, crystalFormationIndex: 40 });
    useGameStore.getState().collectComet({ kind: 'frenzy', mult: 7, durationMs: 30_000 }, 2000);
    const s = useGameStore.getState();
    expect(s.frenzyMult).toBe(7);
    expect(s.frenzyUntil).toBe(32_000);
    // applyTick over 2s (lastTickAt was 1000) inside the frenzy → ×7 the base CPS.
    // Formation 40 → depth bonus = 1 + 0.1 × floor(40/5) = 1.8.
    const before = useGameStore.getState().crystals;
    useGameStore.getState().applyTick(3000);
    const gained = useGameStore.getState().crystals - before;
    expect(gained).toBeCloseTo(s.cachedCrystalCps * 1.8 * 2 * 7);
  });

  it('Auto-Forge buys generators each tick once unlocked at the Resonance gate', () => {
    // Locked below the gate: nothing is bought even with crystals and the toggle on.
    reset({ transcendCount: 1, resonance: 2, autoForge: true, crystals: 1e6 });
    useGameStore.getState().autoTick(1_000_000);
    expect(
      Object.values(useGameStore.getState().crystalGenerators).reduce((a, b) => a + b, 0),
    ).toBe(0);
    // At the gate, a tick buys the best-payback affordable generator.
    reset({ transcendCount: 1, resonance: 3, autoForge: true, crystals: 1e6 });
    useGameStore.getState().autoTick(2_000_000);
    const owned = Object.values(useGameStore.getState().crystalGenerators).reduce(
      (a, b) => a + b,
      0,
    );
    expect(owned).toBeGreaterThan(0);
    expect(useGameStore.getState().crystals).toBeLessThan(1e6);
  });

  it('Auto-Forge does nothing while disabled', () => {
    reset({ transcendCount: 1, resonance: 5, autoForge: false, crystals: 1e6 });
    useGameStore.getState().autoTick(3_000_000);
    expect(
      Object.values(useGameStore.getState().crystalGenerators).reduce((a, b) => a + b, 0),
    ).toBe(0);
  });

  it('Auto-Buy Upgrades is gated by two ascensions, then buys mineral upgrades', () => {
    // One ascension short: nothing is bought even with the toggle on.
    reset({ ascensionCount: 1, autoUpgrade: true, minerals: 1e6, totalTaps: 100 });
    useGameStore.getState().autoTick(11_000_000);
    expect(Object.keys(useGameStore.getState().upgrades).length).toBe(0);
    // At two ascensions, a tick buys the cheapest unlocked upgrade (tap1).
    reset({ ascensionCount: 2, autoUpgrade: true, minerals: 1e6, totalTaps: 100 });
    useGameStore.getState().autoTick(12_000_000);
    const s = useGameStore.getState();
    expect(s.upgrades.tap1).toBe(true);
    expect(s.minerals).toBeLessThan(1e6);
  });

  it('Auto-Buy Forge Upgrades is gated by Resonance, then buys crystal upgrades', () => {
    // Below Resonance 2: nothing bought.
    reset({
      transcendCount: 1,
      resonance: 1,
      autoCrystalUpgrade: true,
      crystals: 1e6,
      crystalGenerators: { shard: 10 },
    });
    useGameStore.getState().autoTick(13_000_000);
    expect(Object.keys(useGameStore.getState().crystalRunUpgrades).length).toBe(0);
    // At Resonance 2, a tick buys the cheapest unlocked Forge upgrade.
    reset({
      transcendCount: 1,
      resonance: 2,
      autoCrystalUpgrade: true,
      crystals: 1e6,
      crystalGenerators: { shard: 10 },
    });
    useGameStore.getState().autoTick(14_000_000);
    expect(Object.keys(useGameStore.getState().crystalRunUpgrades).length).toBeGreaterThan(0);
    expect(useGameStore.getState().crystals).toBeLessThan(1e6);
  });

  it('buyCrystalRunUpgrade spends crystals and applies its multiplier', () => {
    reset({ transcendCount: 1, crystals: 1000, crystalGenerators: { shard: 1 } });
    const tapBefore = useGameStore.getState().cachedCrystalTapValue;
    useGameStore.getState().buyCrystalRunUpgrade('c_tap1'); // ×2 tap, unlock shard ≥ 1
    const s = useGameStore.getState();
    expect(s.crystalRunUpgrades.c_tap1).toBe(true);
    expect(s.crystals).toBeLessThan(1000);
    expect(s.cachedCrystalTapValue).toBeCloseTo(tapBefore * 2);
  });

  it('buyCrystalRunUpgrade is blocked until its unlock condition is met', () => {
    reset({ transcendCount: 1, crystals: 1e9, crystalGenerators: {} });
    useGameStore.getState().buyCrystalRunUpgrade('c_shard'); // needs shard ≥ 10
    expect(useGameStore.getState().crystalRunUpgrades.c_shard).toBeUndefined();
  });

  it('doResonate resets the crystal run for permanent Resonance', () => {
    reset({
      transcendCount: 1,
      crystals: 50_000,
      lifetimeCrystals: 400_000, // pendingResonance(4e5, 0): levels 1 (1e5) + 2 (4e5) = 2
      crystalGenerators: { shard: 20 },
      crystalFormationIndex: 5,
      crystalRunUpgrades: { c_tap1: true },
      crystalUpgrades: { crystal_resonance: 1 },
      resonance: 0,
    });
    useGameStore.getState().doResonate();
    const s = useGameStore.getState();
    // Gains 2 Resonance levels.
    expect(s.resonance).toBe(2);
    // …and Attunement = floor(sqrt(400000 / 10000)) = floor(sqrt(40)) = 6.
    expect(s.attunement).toBe(6);
    expect(s.totalAttunement).toBe(6);
    // The crystal run resets.
    expect(s.crystals).toBe(0);
    expect(s.lifetimeCrystals).toBe(0);
    expect(s.crystalGenerators).toEqual({});
    expect(s.crystalFormationIndex).toBe(0);
    expect(s.crystalRunUpgrades).toEqual({});
    // The Matrix and transcend state survive.
    expect(s.crystalUpgrades).toEqual({ crystal_resonance: 1 });
    expect(s.transcendCount).toBe(1);
  });

  it('doResonate does nothing below the lifetime-crystal gate', () => {
    reset({ transcendCount: 1, lifetimeCrystals: 100, resonance: 0 });
    useGameStore.getState().doResonate();
    expect(useGameStore.getState().resonance).toBe(0);
  });

  it('doConverge collapses the crystal layer into Eons', () => {
    reset({
      transcendCount: 1,
      resonance: 40,
      attunementSinceConverge: CONVERGENCE_ATTUNEMENT * 4, // pendingEons = sqrt(4) = 2
      crystals: 5000,
      lifetimeCrystals: 9000,
      crystalGenerators: { shard: 30 },
      crystalRunUpgrades: { c_tap1: true },
      crystalUpgrades: { crystal_resonance: 3 },
      attunement: 40,
    });
    useGameStore.getState().doConverge();
    const s = useGameStore.getState();
    // Gains 2 Eons and a Convergence.
    expect(s.eons).toBe(2);
    expect(s.totalEons).toBe(2);
    expect(s.convergenceCount).toBe(1);
    // The whole crystal layer — including Resonance, the Matrix and the
    // channelled-Attunement gate — resets.
    expect(s.resonance).toBe(0);
    expect(s.crystals).toBe(0);
    expect(s.lifetimeCrystals).toBe(0);
    expect(s.crystalGenerators).toEqual({});
    expect(s.crystalUpgrades).toEqual({});
    expect(s.attunement).toBe(0);
    expect(s.attunementSinceConverge).toBe(0);
    // Crystal mode and records persist.
    expect(s.transcendCount).toBe(1);
  });

  it('doConverge does nothing below the channelled-Attunement gate', () => {
    reset({ transcendCount: 1, attunementSinceConverge: CONVERGENCE_ATTUNEMENT - 1 });
    useGameStore.getState().doConverge();
    expect(useGameStore.getState().convergenceCount).toBe(0);
  });

  it('eonMult permanently boosts crystal production', () => {
    reset({ transcendCount: 1, resonance: 0, crystalGenerators: { shard: 100 } });
    const before = useGameStore.getState().cachedCrystalCps;
    // 2 Eons ever earned -> ×(1 + 1*2) = ×3 crystal production in the caches.
    reset({ transcendCount: 1, resonance: 0, totalEons: 2, crystalGenerators: { shard: 100 } });
    expect(useGameStore.getState().cachedCrystalCps).toBeCloseTo(before * 3);
  });

  it('buyEonUpgrade spends Eons and levels the Convergence tree', () => {
    reset({ transcendCount: 1, eons: 10 });
    useGameStore.getState().buyEonUpgrade('eon_flux');
    const s = useGameStore.getState();
    expect(s.eonUpgrades.eon_flux).toBe(1);
    expect(s.eons).toBeLessThan(10);
  });

  it('buyEonUpgrade is blocked without enough Eons', () => {
    reset({ transcendCount: 1, eons: 0 });
    useGameStore.getState().buyEonUpgrade('eon_flux');
    expect(useGameStore.getState().eonUpgrades.eon_flux).toBeUndefined();
  });

  it('keeps remembered preferences (buy qty, auto toggles) through a Cascade', () => {
    reset({
      transcendCount: 1,
      lifetimeCrystals: 400_000,
      resonance: 0,
      autoResonate: true,
      autoForge: true,
      buyQty: 'max',
    });
    useGameStore.getState().doResonate();
    const s = useGameStore.getState();
    expect(s.resonance).toBeGreaterThan(0);
    expect(s.autoResonate).toBe(true);
    expect(s.autoForge).toBe(true);
    expect(s.buyQty).toBe('max');
  });

  it('setBuyQty remembers the chosen quantity', () => {
    reset({});
    useGameStore.getState().setBuyQty(10);
    expect(useGameStore.getState().buyQty).toBe(10);
    useGameStore.getState().setBuyQty('max');
    expect(useGameStore.getState().buyQty).toBe('max');
  });

  it('buyCrystalUpgrade spends Attunement, not crystals', () => {
    reset({ transcendCount: 1, crystals: 1e9, attunement: 10, crystalUpgrades: {} });
    const def = CRYSTAL_UPGRADES_BY_ID.crystal_resonance; // baseCost 2
    useGameStore.getState().buyCrystalUpgrade('crystal_resonance');
    const s = useGameStore.getState();
    expect(s.crystalUpgrades.crystal_resonance).toBe(1);
    expect(s.attunement).toBe(10 - def.baseCost);
    expect(s.crystals).toBe(1e9); // crystals untouched
  });

  it('buyCrystalUpgrade is blocked without enough Attunement', () => {
    reset({ transcendCount: 1, crystals: 1e9, attunement: 0, crystalUpgrades: {} });
    useGameStore.getState().buyCrystalUpgrade('crystal_resonance');
    expect(useGameStore.getState().crystalUpgrades.crystal_resonance).toBeUndefined();
  });

  it('buyCrystalUpgrade gates deep-tier upgrades behind Resonance', () => {
    // crystal_amplifier unlocks at Resonance 3.
    reset({ transcendCount: 1, attunement: 100, resonance: 2, crystalUpgrades: {} });
    useGameStore.getState().buyCrystalUpgrade('crystal_amplifier');
    expect(useGameStore.getState().crystalUpgrades.crystal_amplifier).toBeUndefined();
    // At Resonance 3 it becomes buyable.
    reset({ transcendCount: 1, attunement: 100, resonance: 3, crystalUpgrades: {} });
    useGameStore.getState().buyCrystalUpgrade('crystal_amplifier');
    expect(useGameStore.getState().crystalUpgrades.crystal_amplifier).toBe(1);
  });

  it('Resonance Amplifier raises the per-level production bonus in caches', () => {
    reset({ transcendCount: 1, resonance: 2, crystalGenerators: { shard: 100 }, crystalUpgrades: {} });
    const before = useGameStore.getState().cachedCrystalCps;
    // +20%/level to the per-level bonus: at resonance 2, base mult ×3 → ×3.8.
    reset({
      transcendCount: 1,
      resonance: 2,
      crystalGenerators: { shard: 100 },
      crystalUpgrades: { crystal_amplifier: 2 },
    });
    const after = useGameStore.getState().cachedCrystalCps;
    expect(after).toBeGreaterThan(before);
    // mult goes from (1+1*2)=3 to (1 + 1*1.4*2)=3.8 → ratio 3.8/3.
    expect(after / before).toBeCloseTo(3.8 / 3);
  });

  it('resetGame wipes all progress back to a fresh state', () => {
    reset({ minerals: 1e9, darkMatter: 50, prestigeCount: 3, achievements: { t_100: true } });
    useGameStore.getState().resetGame();
    const s = useGameStore.getState();
    expect(s.minerals).toBe(0);
    expect(s.darkMatter).toBe(0);
    expect(s.prestigeCount).toBe(0);
    expect(s.achievements).toEqual({});
  });
});
