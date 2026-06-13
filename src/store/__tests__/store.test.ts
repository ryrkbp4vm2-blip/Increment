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
    expect(s.minerals).toBe(85);
    expect(s.cachedCps).toBeCloseTo(0.1);
  });

  it('refuses unaffordable purchases', () => {
    reset({ minerals: 10 });
    useGameStore.getState().buyGenerator('drone', 1);
    expect(useGameStore.getState().generators.drone).toBe(0);
    expect(useGameStore.getState().minerals).toBe(10);
  });

  it('buy max purchases the exact affordable amount', () => {
    reset({ minerals: 100 });
    useGameStore.getState().buyGenerator('drone', 'max');
    const s = useGameStore.getState();
    expect(s.generators.drone).toBe(4); // 15+18+20+23 = 76 <= 100; +27 > 100
    expect(s.minerals).toBeLessThan(costOfNext(GENERATORS_BY_ID.drone, 4));
  });

  it('buyUpgrade enforces cost, unlock condition and uniqueness', () => {
    reset({ minerals: 1000, totalTaps: 10 });
    useGameStore.getState().buyUpgrade('tap1'); // needs 25 taps
    expect(useGameStore.getState().upgrades.tap1).toBeUndefined();

    reset({ minerals: 1000, totalTaps: 25 });
    useGameStore.getState().buyUpgrade('tap1');
    let s = useGameStore.getState();
    expect(s.upgrades.tap1).toBe(true);
    expect(s.minerals).toBe(900);
    expect(s.cachedTapValue).toBe(2);

    useGameStore.getState().buyUpgrade('tap1'); // already owned: no double charge
    expect(useGameStore.getState().minerals).toBe(900);
  });

  it('applyTick earns cachedCps over the elapsed delta, clamped', () => {
    reset({ minerals: 0, generators: { ...initialPersistedState().generators, excavator: 10 } });
    const s0 = useGameStore.getState();
    expect(s0.cachedCps).toBeCloseTo(10);
    s0.applyTick(2000); // 1s after hydrate at t=1000
    expect(useGameStore.getState().minerals).toBeCloseTo(10);
    useGameStore.getState().applyTick(60_000); // 58s gap clamps to 2s
    expect(useGameStore.getState().minerals).toBeCloseTo(30);
  });

  it('prestige awards dark matter, resets the run, keeps lifetime stats', () => {
    reset({
      minerals: 5e12,
      lifetimeThisRun: 4e12,
      lifetimeAllTime: 6e12,
      generators: { ...initialPersistedState().generators, dyson: 5 },
      upgrades: { tap1: true },
      darkMatter: 3,
      prestigeCount: 1,
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
    // dark matter multiplier applies immediately
    expect(s.cachedTapValue).toBeCloseTo(1.1);
  });

  it('prestige does nothing below the threshold', () => {
    reset({ minerals: 100, lifetimeThisRun: 1e11 });
    useGameStore.getState().doPrestige();
    expect(useGameStore.getState().minerals).toBe(100);
    expect(useGameStore.getState().prestigeCount).toBe(0);
  });
});
