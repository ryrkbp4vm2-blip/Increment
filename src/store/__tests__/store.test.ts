import { costOfNext } from '../../game/math';
import { GENERATORS_BY_ID } from '../../game/balance';
import { initialPersistedState, useGameStore } from '../gameStore';

function reset(overrides: Partial<ReturnType<typeof initialPersistedState>> = {}) {
  useGameStore.getState().hydrate({ ...initialPersistedState(1000), ...overrides }, 1000);
}

describe('gameStore', () => {
  beforeEach(() => reset());

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

  it('prestige awards dark matter, resets the run, keeps lifetime stats and artifacts', () => {
    reset({
      minerals: 5e12,
      lifetimeThisRun: 4e12,
      lifetimeAllTime: 6e12,
      generators: { ...initialPersistedState().generators, dyson: 5 },
      upgrades: { tap1: true },
      darkMatter: 3,
      prestigeCount: 1,
      asteroidIndex: 12,
      asteroidDamage: 999,
      artifacts: { pulsar_shard: true },
    });
    useGameStore.getState().doPrestige();
    const s = useGameStore.getState();
    expect(s.darkMatter).toBe(5); // 3 + sqrt(4e12/1e12)
    expect(s.prestigeCount).toBe(2);
    expect(s.minerals).toBe(0);
    expect(s.lifetimeThisRun).toBe(0);
    expect(s.lifetimeAllTime).toBe(6e12);
    expect(s.generators.dyson).toBe(0);
    expect(s.upgrades.tap1).toBeUndefined();
    // the belt resets, artifacts survive
    expect(s.asteroidIndex).toBe(0);
    expect(s.asteroidDamage).toBe(0);
    expect(s.artifacts.pulsar_shard).toBe(true);
    // dark matter multiplier and artifact bonus apply immediately
    expect(s.cachedTapValue).toBeCloseTo(1.1 * 1.1);
  });

  it('prestige does nothing below the threshold', () => {
    reset({ minerals: 100, lifetimeThisRun: 1e11 });
    useGameStore.getState().doPrestige();
    expect(useGameStore.getState().minerals).toBe(100);
    expect(useGameStore.getState().prestigeCount).toBe(0);
  });
});
