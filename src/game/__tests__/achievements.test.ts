import {
  ACHIEVEMENTS,
  achievementBonus,
  computeMetrics,
  isMet,
  newlyCompleted,
} from '../achievements';
import { initialPersistedState } from '../../store/gameStore';

function stateWith(overrides: Partial<ReturnType<typeof initialPersistedState>>) {
  return { ...initialPersistedState(0), ...overrides };
}

describe('computeMetrics', () => {
  it('derives metrics from persisted state', () => {
    const s = stateWith({
      lifetimeAllTime: 5e6,
      totalTaps: 120,
      prestigeCount: 2,
      totalDarkMatter: 15,
      asteroidsShattered: 7,
      cometsCaught: 30,
      expeditionsCompleted: 3,
      artifacts: { pulsar_shard: true, cryo_core: true },
      generators: { ...initialPersistedState().generators, drone: 40, station: 11 },
    });
    const m = computeMetrics(s);
    expect(m.lifetime).toBe(5e6);
    expect(m.taps).toBe(120);
    expect(m.prestige).toBe(2);
    expect(m.totalDM).toBe(15);
    expect(m.shattered).toBe(7);
    expect(m.comets).toBe(30);
    expect(m.expeditions).toBe(3);
    expect(m.artifacts).toBe(2);
    expect(m.genTotal).toBe(51);
    expect(m.gen.drone).toBe(40);
  });
});

describe('isMet / newlyCompleted', () => {
  it('detects met thresholds across metric kinds', () => {
    const m = computeMetrics(stateWith({ totalTaps: 100, lifetimeAllTime: 1e3 }));
    const tap = ACHIEVEMENTS.find((a) => a.id === 't_100')!;
    const m1m = ACHIEVEMENTS.find((a) => a.id === 'm_1m')!;
    expect(isMet(tap, m)).toBe(true);
    expect(isMet(m1m, m)).toBe(false);
  });

  it('returns only not-yet-completed ids', () => {
    const m = computeMetrics(stateWith({ totalTaps: 100, lifetimeAllTime: 1e3 }));
    const all = newlyCompleted({}, m);
    expect(all).toContain('t_100');
    expect(all).toContain('m_1k');
    const partial = newlyCompleted({ t_100: true }, m);
    expect(partial).not.toContain('t_100');
    expect(partial).toContain('m_1k');
  });

  it('handles per-generator achievements', () => {
    const m = computeMetrics(
      stateWith({ generators: { ...initialPersistedState().generators, drone: 25 } }),
    );
    expect(newlyCompleted({}, m)).toContain('g_drone25');
  });
});

describe('ascension and deep milestones', () => {
  it('tracks the ascension metric', () => {
    const m = computeMetrics(stateWith({ ascensionCount: 1 }));
    expect(m.ascension).toBe(1);
    expect(newlyCompleted({}, m)).toContain('asc_1');
  });

  it('unlocks the 18-artifact completionist only with the full set', () => {
    const eleven = computeMetrics(stateWith({ artifacts: { a: true, b: true } as any }));
    expect(newlyCompleted({}, eleven)).not.toContain('a_18');
  });
});

describe('achievementBonus', () => {
  it('is 1 with nothing completed', () => {
    expect(achievementBonus({})).toBe(1);
  });

  it('sums the per-achievement bonuses', () => {
    // t_100 (0.02) + m_1t (0.05)
    expect(achievementBonus({ t_100: true, m_1t: true })).toBeCloseTo(1.07);
  });

  it('ignores unknown ids', () => {
    expect(achievementBonus({ not_real: true })).toBe(1);
  });
});
