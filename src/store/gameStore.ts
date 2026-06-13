import { create } from 'zustand';
import { GENERATORS, GENERATORS_BY_ID, UPGRADES_BY_ID } from '../game/balance';
import {
  bulkCost,
  costOfNext,
  cps,
  isUnlockMet,
  maxAffordable,
  tapValue,
} from '../game/math';
import { pendingDarkMatter } from '../game/prestige';
import { advance } from '../game/tick';
import { BuyQty, GameState, GeneratorId, PersistedState } from '../game/types';

export interface GameActions {
  hydrate(persisted: PersistedState, nowMs: number): void;
  tap(): number;
  buyGenerator(id: GeneratorId, qty: BuyQty): void;
  buyUpgrade(id: string): void;
  applyTick(nowMs: number): void;
  applyOffline(earned: number, nowMs: number): void;
  doPrestige(): void;
}

export type GameStore = GameState & GameActions;

export function emptyGenerators(): Record<GeneratorId, number> {
  return Object.fromEntries(GENERATORS.map((g) => [g.id, 0])) as Record<GeneratorId, number>;
}

export function initialPersistedState(nowMs: number = Date.now()): PersistedState {
  return {
    minerals: 0,
    lifetimeThisRun: 0,
    lifetimeAllTime: 0,
    totalTaps: 0,
    generators: emptyGenerators(),
    upgrades: {},
    darkMatter: 0,
    prestigeCount: 0,
    startedAt: nowMs,
  };
}

function withCaches(persisted: PersistedState, lastTickAt: number): GameState {
  const cachedCps = cps(persisted);
  return {
    ...persisted,
    lastTickAt,
    cachedCps,
    cachedTapValue: tapValue(persisted, cachedCps),
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...withCaches(initialPersistedState(), Date.now()),

  hydrate(persisted, nowMs) {
    set(withCaches(persisted, nowMs));
  },

  tap() {
    const state = get();
    const earned = state.cachedTapValue;
    set({
      minerals: state.minerals + earned,
      lifetimeThisRun: state.lifetimeThisRun + earned,
      lifetimeAllTime: state.lifetimeAllTime + earned,
      totalTaps: state.totalTaps + 1,
    });
    return earned;
  },

  buyGenerator(id, qty) {
    const state = get();
    const def = GENERATORS_BY_ID[id];
    const owned = state.generators[id] ?? 0;
    const count =
      qty === 'max' ? maxAffordable(def, owned, state.minerals) : qty;
    if (count <= 0) return;
    const cost = bulkCost(def, owned, count);
    if (cost > state.minerals) return;
    const generators = { ...state.generators, [id]: owned + count };
    set(withCaches({ ...state, minerals: state.minerals - cost, generators }, state.lastTickAt));
  },

  buyUpgrade(id) {
    const state = get();
    const def = UPGRADES_BY_ID[id];
    if (!def || state.upgrades[id]) return;
    if (state.minerals < def.cost || !isUnlockMet(def.unlock, state)) return;
    const upgrades = { ...state.upgrades, [id]: true as const };
    set(withCaches({ ...state, minerals: state.minerals - def.cost, upgrades }, state.lastTickAt));
  },

  applyTick(nowMs) {
    set(advance(get(), nowMs));
  },

  applyOffline(earned, nowMs) {
    const state = get();
    set({
      minerals: state.minerals + earned,
      lifetimeThisRun: state.lifetimeThisRun + earned,
      lifetimeAllTime: state.lifetimeAllTime + earned,
      lastTickAt: nowMs,
    });
  },

  doPrestige() {
    const state = get();
    const gained = pendingDarkMatter(state.lifetimeThisRun);
    if (gained < 1) return;
    set(
      withCaches(
        {
          ...initialPersistedState(Date.now()),
          lifetimeAllTime: state.lifetimeAllTime,
          totalTaps: state.totalTaps,
          darkMatter: state.darkMatter + gained,
          prestigeCount: state.prestigeCount + 1,
        },
        state.lastTickAt,
      ),
    );
  },
}));

/** Cost of the next purchase at the given quantity (for display). */
export function purchaseCost(state: GameState, id: GeneratorId, qty: BuyQty): number {
  const def = GENERATORS_BY_ID[id];
  const owned = state.generators[id] ?? 0;
  if (qty === 'max') {
    const count = maxAffordable(def, owned, state.minerals);
    return count > 0 ? bulkCost(def, owned, count) : costOfNext(def, owned);
  }
  return qty === 1 ? costOfNext(def, owned) : bulkCost(def, owned, qty);
}
