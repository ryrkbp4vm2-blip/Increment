import { GameState } from '../../game/types';
import { initialPersistedState } from '../gameStore';
import { migrate, SAVE_VERSION, serialize, toPersisted } from '../persistence';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initialPersistedState(123),
    lastTickAt: 456,
    cachedCps: 99,
    cachedTapValue: 5,
    ...overrides,
  };
}

describe('serialize/migrate round trip', () => {
  it('preserves persisted fields and drops caches', () => {
    const state = makeState({
      minerals: 1234.5,
      darkMatter: 7,
      generators: { ...initialPersistedState().generators, refinery: 12 },
      upgrades: { tap1: true },
    });
    const save = migrate(serialize(state, 9999));
    expect(save).not.toBeNull();
    expect(save!.version).toBe(SAVE_VERSION);
    expect(save!.savedAt).toBe(9999);
    expect(save!.state).toEqual(toPersisted(state));
    expect((save!.state as any).cachedCps).toBeUndefined();
  });
});

describe('migrate hardening', () => {
  it('returns null for null, corrupt and non-object input', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate('not json {')).toBeNull();
    expect(migrate('42')).toBeNull();
    expect(migrate('{"version":1}')).toBeNull();
  });

  it('rejects saves from a newer version', () => {
    const state = makeState();
    const raw = serialize(state, 1).replace('"version":1', `"version":${SAVE_VERSION + 1}`);
    expect(migrate(raw)).toBeNull();
  });

  it('fills missing fields with defaults', () => {
    const save = migrate('{"version":1,"savedAt":50,"state":{"minerals":10}}');
    expect(save).not.toBeNull();
    expect(save!.state.minerals).toBe(10);
    expect(save!.state.darkMatter).toBe(0);
    expect(save!.state.generators.drone).toBe(0);
    expect(save!.state.upgrades).toEqual({});
  });

  it('round-trips artifacts and an active expedition', () => {
    const state = makeState({
      artifacts: { pulsar_shard: true, cryo_core: true },
      expedition: { defId: 'survey', startedAt: 100, endsAt: 200, loot: 5000 },
      asteroidIndex: 7,
      asteroidDamage: 123.4,
    });
    const save = migrate(serialize(state, 1))!;
    expect(save.state.artifacts).toEqual({ pulsar_shard: true, cryo_core: true });
    expect(save.state.expedition).toEqual({ defId: 'survey', startedAt: 100, endsAt: 200, loot: 5000 });
    expect(save.state.asteroidIndex).toBe(7);
    expect(save.state.asteroidDamage).toBeCloseTo(123.4);
  });

  it('drops unknown artifacts and malformed expeditions', () => {
    const save = migrate(
      '{"version":1,"savedAt":50,"state":{"artifacts":{"fake":true,"alien_drill":true},"expedition":{"defId":"nope","endsAt":1}}}',
    )!;
    expect(save.state.artifacts).toEqual({ alien_drill: true });
    expect(save.state.expedition).toBeNull();
  });

  it('sanitizes invalid values', () => {
    const save = migrate(
      '{"version":1,"savedAt":50,"state":{"minerals":-5,"totalTaps":3.7,"generators":{"drone":"lots"},"upgrades":{"fake_upgrade":true,"tap1":true}}}',
    );
    expect(save!.state.minerals).toBe(0);
    expect(save!.state.totalTaps).toBe(3);
    expect(save!.state.generators.drone).toBe(0);
    expect(save!.state.upgrades).toEqual({ tap1: true });
  });
});
