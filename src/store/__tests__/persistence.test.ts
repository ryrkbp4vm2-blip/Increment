import { GameState } from '../../game/types';
import { initialPersistedState } from '../gameStore';
import { migrate, SAVE_VERSION, serialize, toPersisted } from '../persistence';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initialPersistedState(123),
    lastTickAt: 456,
    cachedCps: 99,
    cachedTapValue: 5,
    newAchievements: [],
    ...overrides,
  };
}

describe('serialize/migrate round trip', () => {
  it('preserves persisted fields and drops caches', () => {
    const state = makeState({
      minerals: 1234.5,
      darkMatter: 7,
      totalDarkMatter: 7,
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

  it('round-trips Dark Matter shop levels and total', () => {
    const state = makeState({
      darkMatter: 12,
      totalDarkMatter: 40,
      dmUpgrades: { stellar_density: 5, kinetic_amplifier: 2 },
    });
    const save = migrate(serialize(state, 1))!;
    expect(save.state.darkMatter).toBe(12);
    expect(save.state.totalDarkMatter).toBe(40);
    expect(save.state.dmUpgrades).toEqual({ stellar_density: 5, kinetic_amplifier: 2 });
  });

  it('clamps shop levels and drops unknown upgrades', () => {
    const save = migrate(
      '{"version":1,"savedAt":50,"state":{"dmUpgrades":{"stellar_density":999,"fake_dm":3,"kinetic_amplifier":-2}}}',
    )!;
    expect(save.state.dmUpgrades).toEqual({ stellar_density: 20 }); // clamped to maxLevel; negative & unknown dropped
  });

  it('seeds totalDarkMatter from the balance for old saves', () => {
    const save = migrate('{"version":1,"savedAt":50,"state":{"darkMatter":8}}')!;
    expect(save.state.totalDarkMatter).toBe(8);
    expect(save.state.dmUpgrades).toEqual({});
  });

  it('round-trips challenges and drops unknown ids', () => {
    const state = makeState({ activeChallenge: 'famine', challengesCompleted: { asceticism: true } });
    const save = migrate(serialize(state, 1))!;
    expect(save.state.activeChallenge).toBe('famine');
    expect(save.state.challengesCompleted).toEqual({ asceticism: true });

    const dirty = migrate('{"version":1,"savedAt":1,"state":{"activeChallenge":"bogus","challengesCompleted":{"nope":true,"solitude":true}}}')!;
    expect(dirty.state.activeChallenge).toBeNull();
    expect(dirty.state.challengesCompleted).toEqual({ solitude: true });
  });

  it('round-trips singularity perks and drops unknown ones', () => {
    const state = makeState({ singularityPerks: { auto_driller: true }, singularityCores: 3, totalSingularityCores: 7 });
    const save = migrate(serialize(state, 1))!;
    expect(save.state.singularityPerks).toEqual({ auto_driller: true });
    expect(save.state.totalSingularityCores).toBe(7);

    const dirty = migrate('{"version":1,"savedAt":1,"state":{"singularityPerks":{"fake":true,"fleet_ai":true},"singularityCores":5}}')!;
    expect(dirty.state.singularityPerks).toEqual({ fleet_ai: true });
    expect(dirty.state.totalSingularityCores).toBe(5); // seeded from cores
  });

  it('round-trips achievements and counters', () => {
    const state = makeState({
      achievements: { t_100: true, m_1k: true },
      asteroidsShattered: 12,
      cometsCaught: 30,
      expeditionsCompleted: 4,
    });
    const save = migrate(serialize(state, 1))!;
    expect(save.state.achievements).toEqual({ t_100: true, m_1k: true });
    expect(save.state.asteroidsShattered).toBe(12);
    expect(save.state.cometsCaught).toBe(30);
    expect(save.state.expeditionsCompleted).toBe(4);
  });

  it('drops unknown achievements and defaults missing counters', () => {
    const save = migrate(
      '{"version":1,"savedAt":50,"state":{"achievements":{"fake":true,"t_100":true}}}',
    )!;
    expect(save.state.achievements).toEqual({ t_100: true });
    expect(save.state.asteroidsShattered).toBe(0);
    expect(save.state.cometsCaught).toBe(0);
  });

  it('round-trips ascension state', () => {
    const state = makeState({ singularityCores: 4, ascensionCount: 2, dmSinceAscension: 250 });
    const save = migrate(serialize(state, 1))!;
    expect(save.state.singularityCores).toBe(4);
    expect(save.state.ascensionCount).toBe(2);
    expect(save.state.dmSinceAscension).toBe(250);
  });

  it('round-trips research and drops unknown nodes', () => {
    const state = makeState({
      researchPoints: 42,
      totalResearch: 80,
      research: { ex1: true, lo1: true },
    });
    const save = migrate(serialize(state, 1))!;
    expect(save.state.researchPoints).toBe(42);
    expect(save.state.totalResearch).toBe(80);
    expect(save.state.research).toEqual({ ex1: true, lo1: true });

    const dirty = migrate('{"version":1,"savedAt":50,"state":{"research":{"fake":true,"ex1":true}}}')!;
    expect(dirty.state.research).toEqual({ ex1: true });
    expect(dirty.state.researchPoints).toBe(0);
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
