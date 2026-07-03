/**
 * Smoke tests: every screen renders (and unmounts) without crashing in a
 * representative store state, in both mineral and crystal mode. These catch
 * selector violations, missing fields after save-shape changes, and
 * render-time crashes that the pure game-logic tests can't see.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { initialPersistedState, useGameStore } from '../../store/gameStore';
import { PersistedState } from '../../game/types';
import { GameRoot } from '../GameRoot';
import { CrystalForgeScreen } from '../CrystalForgeScreen';
import { CrystalMineScreen } from '../CrystalMineScreen';
import { FleetScreen } from '../FleetScreen';
import { GoalsScreen } from '../GoalsScreen';
import { MineScreen } from '../MineScreen';
import { PrestigeScreen } from '../PrestigeScreen';
import { ResearchScreen } from '../ResearchScreen';
import { ShopScreen } from '../ShopScreen';

function hydrate(overrides: Partial<PersistedState> = {}) {
  useGameStore.getState().hydrate({ ...initialPersistedState(1000), ...overrides }, 1000);
}

// Screens schedule comet/event timers on mount; fake timers keep jest clean.
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('mineral-mode screens', () => {
  const MID_GAME: Partial<PersistedState> = {
    minerals: 5e6,
    lifetimeThisRun: 1e7,
    lifetimeAllTime: 1e9,
    prestigeCount: 3,
    darkMatter: 50,
    dmUpgrades: { stellar_density: 2 },
    ascensionCount: 2,
    singularityCores: 3,
    totalSingularityCores: 5,
    researchPoints: 20,
    research: { ex1: true },
    artifacts: { pulsar_shard: true },
    generators: { ...initialPersistedState().generators, drone: 30, excavator: 10 },
    asteroidIndex: 12,
    expedition: { defId: 'scout', startedAt: 500, endsAt: 5000, loot: 100 },
    activeChallenge: 'famine',
    activeChallengeGoal: 1e8,
  };

  it.each([
    ['MineScreen', MineScreen],
    ['ShopScreen', ShopScreen],
    ['FleetScreen', FleetScreen],
    ['ResearchScreen', ResearchScreen],
    ['GoalsScreen', GoalsScreen],
    ['PrestigeScreen', PrestigeScreen],
  ] as const)('%s renders mid-game', async (_name, Screen) => {
    hydrate(MID_GAME);
    const r = await render(<Screen />);
    await r.unmount();
  });

  it('all screens render on a completely fresh game', async () => {
    hydrate();
    for (const Screen of [MineScreen, ShopScreen, FleetScreen, ResearchScreen, GoalsScreen, PrestigeScreen]) {
      const r = await render(<Screen />);
      await r.unmount();
    }
  });
});

describe('crystal-mode screens', () => {
  const CRYSTAL_GAME: Partial<PersistedState> = {
    transcendCount: 1,
    crystals: 5000,
    totalCrystals: 1e6,
    lifetimeCrystals: 2e5,
    resonance: 3,
    attunement: 40,
    crystalGenerators: { shard: 12, prism: 4 },
    crystalRunUpgrades: { c_tap1: true },
    crystalUpgrades: { crystal_resonance: 1 },
    crystalFormationIndex: 9, // a Prime, so the PRIME tag renders
    crystalRelics: { echo_prism: true },
    crystalChallengesCompleted: { cc_silent_forge: true },
    eons: 2,
    totalEons: 2,
    convergenceCount: 1,
    attunementSinceConverge: 60_000,
  };

  it.each([
    ['CrystalMineScreen', CrystalMineScreen],
    ['CrystalForgeScreen', CrystalForgeScreen],
    ['GoalsScreen', GoalsScreen],
    ['PrestigeScreen', PrestigeScreen],
  ] as const)('%s renders mid-crystal-game', async (_name, Screen) => {
    hydrate(CRYSTAL_GAME);
    const r = await render(<Screen />);
    await r.unmount();
  });

  it('crystal prestige renders with an active crystal challenge', async () => {
    hydrate({ ...CRYSTAL_GAME, activeCrystalChallenge: 'cc_dark_sky', activeCrystalChallengeGoal: 1e6 });
    const r = await render(<PrestigeScreen />);
    await r.unmount();
  });
});

describe('GameRoot', () => {
  it('renders the whole app shell in mineral mode', async () => {
    hydrate({ minerals: 100 });
    const r = await render(<GameRoot initialOfflineReport={null} />);
    await r.unmount();
  });

  it('renders the whole app shell in crystal mode', async () => {
    hydrate({ transcendCount: 1, crystals: 10 });
    const r = await render(<GameRoot initialOfflineReport={null} />);
    await r.unmount();
  });
});
