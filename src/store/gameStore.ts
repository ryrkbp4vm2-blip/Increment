import { create } from 'zustand';
import { applyDamage } from '../game/asteroids';
import { GENERATORS, GENERATORS_BY_ID, MAX_TICK_DELTA_MS, UPGRADES_BY_ID } from '../game/balance';
import { DM_UPGRADES_BY_ID, darkMatterUpgradeCost } from '../game/darkmatter';
import { CometReward, frenzyFactor } from '../game/events';
import {
  ExpeditionResult,
  EXPEDITIONS_BY_ID,
  expeditionDuration,
  expeditionFuel,
  expeditionLoot,
  rollExpeditionResult,
} from '../game/expeditions';
import {
  bulkCost,
  costOfNext,
  cps,
  isUnlockMet,
  maxAffordable,
  tapValue,
} from '../game/math';
import { effectivePowers } from '../game/powers';
import { darkMatterGain, pendingDarkMatter } from '../game/prestige';
import { BuyQty, GameState, GeneratorId, PersistedState } from '../game/types';

export interface GameActions {
  hydrate(persisted: PersistedState, nowMs: number): void;
  tap(): number;
  buyGenerator(id: GeneratorId, qty: BuyQty): void;
  buyUpgrade(id: string): void;
  applyTick(nowMs: number): void;
  applyOffline(earned: number, nowMs: number): void;
  collectComet(reward: CometReward, nowMs: number): void;
  launchExpedition(defId: string, nowMs: number): void;
  claimExpedition(nowMs: number): ExpeditionResult | null;
  buyDarkMatterUpgrade(id: string): void;
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
    totalDarkMatter: 0,
    dmUpgrades: {},
    prestigeCount: 0,
    startedAt: nowMs,
    frenzyUntil: 0,
    frenzyMult: 1,
    asteroidIndex: 0,
    asteroidDamage: 0,
    artifacts: {},
    expedition: null,
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

/**
 * Credit earned minerals, deal matching damage to the current asteroid, and
 * pay out any shatter bonuses. Returns the state delta; when an asteroid
 * shatters the production caches are refreshed (richness changed).
 */
function earn(state: GameState, amount: number): Partial<GameState> {
  const result = applyDamage(state.asteroidIndex, state.asteroidDamage, amount);
  const total = amount + result.bonus;
  const delta: Partial<GameState> = {
    minerals: state.minerals + total,
    lifetimeThisRun: state.lifetimeThisRun + total,
    lifetimeAllTime: state.lifetimeAllTime + total,
    asteroidIndex: result.asteroidIndex,
    asteroidDamage: result.asteroidDamage,
  };
  if (result.shattered > 0) {
    const next = { ...state, ...delta } as GameState;
    delta.cachedCps = cps(next);
    delta.cachedTapValue = tapValue(next, delta.cachedCps);
  }
  return delta;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...withCaches(initialPersistedState(), Date.now()),

  hydrate(persisted, nowMs) {
    set(withCaches(persisted, nowMs));
  },

  tap() {
    const state = get();
    const earned = state.cachedTapValue * frenzyFactor(state, Date.now());
    set({ ...earn(state, earned), totalTaps: state.totalTaps + 1 });
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
    const state = get();
    const deltaMs = Math.min(Math.max(nowMs - state.lastTickAt, 0), MAX_TICK_DELTA_MS);
    const earned = state.cachedCps * (deltaMs / 1000) * frenzyFactor(state, nowMs);
    set({ ...earn(state, earned), lastTickAt: nowMs });
  },

  applyOffline(earned, nowMs) {
    const state = get();
    set({ ...earn(state, earned), lastTickAt: nowMs });
  },

  collectComet(reward, nowMs) {
    const state = get();
    if (reward.kind === 'frenzy') {
      set({ frenzyUntil: nowMs + reward.durationMs, frenzyMult: reward.mult });
    } else {
      set(earn(state, reward.amount));
    }
  },

  launchExpedition(defId, nowMs) {
    const state = get();
    const def = EXPEDITIONS_BY_ID[defId];
    if (!def || state.expedition) return;
    const powers = effectivePowers(state.artifacts, state.dmUpgrades);
    const fuel = expeditionFuel(def, state.cachedCps, powers);
    if (state.minerals < fuel) return;
    set({
      minerals: state.minerals - fuel,
      expedition: {
        defId,
        startedAt: nowMs,
        endsAt: nowMs + expeditionDuration(def, powers),
        loot: expeditionLoot(def, state.cachedCps, powers),
      },
    });
  },

  claimExpedition(nowMs) {
    const state = get();
    if (!state.expedition || nowMs < state.expedition.endsAt) return null;
    const result = rollExpeditionResult(state.expedition, state.artifacts);
    const artifacts = result.artifactId
      ? { ...state.artifacts, [result.artifactId]: true as const }
      : state.artifacts;
    set({
      ...withCaches({ ...state, artifacts, expedition: null }, state.lastTickAt),
      ...earn({ ...state, artifacts } as GameState, result.loot),
      expedition: null,
    });
    return result;
  },

  buyDarkMatterUpgrade(id) {
    const state = get();
    const def = DM_UPGRADES_BY_ID[id];
    if (!def) return;
    const level = state.dmUpgrades[id] ?? 0;
    if (level >= def.maxLevel) return;
    const cost = darkMatterUpgradeCost(def, level);
    if (state.darkMatter < cost) return;
    const dmUpgrades = { ...state.dmUpgrades, [id]: level + 1 };
    set(withCaches({ ...state, darkMatter: state.darkMatter - cost, dmUpgrades }, state.lastTickAt));
  },

  doPrestige() {
    const state = get();
    if (pendingDarkMatter(state.lifetimeThisRun) < 1) return;
    const powers = effectivePowers(state.artifacts, state.dmUpgrades);
    const gained = darkMatterGain(state.lifetimeThisRun, powers.dmGainMult);
    set(
      withCaches(
        {
          ...initialPersistedState(Date.now()),
          // Carry the permanent meta-progression across the collapse.
          lifetimeAllTime: state.lifetimeAllTime,
          totalTaps: state.totalTaps,
          darkMatter: state.darkMatter + gained,
          totalDarkMatter: state.totalDarkMatter + gained,
          dmUpgrades: state.dmUpgrades,
          prestigeCount: state.prestigeCount + 1,
          artifacts: state.artifacts,
          expedition: state.expedition,
          // Head start from the Dark Matter shop.
          minerals: powers.startMinerals,
          asteroidIndex: powers.startAsteroidIndex,
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
