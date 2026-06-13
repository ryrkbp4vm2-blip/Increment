import { create } from 'zustand';
import { computeMetrics, newlyCompleted } from '../game/achievements';
import {
  AUTO_TAPS_PER_SEC,
  SINGULARITY_PERKS_BY_ID,
  pendingSingularityCores,
  perkStartAsteroid,
} from '../game/ascension';
import { applyDamage, isBoss, rpFromShatter } from '../game/asteroids';
import {
  CHALLENGES_BY_ID,
  challengeComplete,
  challengeModifiers,
} from '../game/challenges';
import { dailyAvailable, dailyReward, dailyStreakAfter } from '../game/daily';
import { RESEARCH_BY_ID, isResearchUnlocked } from '../game/research';
import { GENERATORS, GENERATORS_BY_ID, MAX_TICK_DELTA_MS, UPGRADES_BY_ID } from '../game/balance';
import { DM_UPGRADES_BY_ID, darkMatterUpgradeCost } from '../game/darkmatter';
import { CometReward, frenzyFactor } from '../game/events';
import { EventOutcome } from '../game/cosmicEvents';
import {
  EXPEDITIONS,
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
  buyResearch(id: string): void;
  applyEventOutcome(outcome: EventOutcome, nowMs: number): void;
  doPrestige(): void;
  doAscend(): void;
  buySingularityPerk(id: string): void;
  enterChallenge(id: string): void;
  abandonChallenge(): void;
  completeChallenge(): void;
  autoTick(nowMs: number): void;
  claimDaily(nowMs: number): { reward: number; streak: number } | null;
  tickAchievements(): void;
  consumeAchievements(): string[];
  resetGame(): void;
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
    achievements: {},
    asteroidsShattered: 0,
    cometsCaught: 0,
    expeditionsCompleted: 0,
    researchPoints: 0,
    totalResearch: 0,
    research: {},
    singularityCores: 0,
    totalSingularityCores: 0,
    ascensionCount: 0,
    dmSinceAscension: 0,
    singularityPerks: {},
    activeChallenge: null,
    challengesCompleted: {},
    lastDailyAt: 0,
    dailyStreak: 0,
  };
}

// Returns everything except the transient `newAchievements` queue, which is
// preserved across these partial updates by zustand's shallow merge.
function withCaches(
  persisted: PersistedState,
  lastTickAt: number,
): Omit<GameState, 'newAchievements'> {
  const cachedCps = cps(persisted);
  return {
    ...persisted,
    lastTickAt,
    cachedCps,
    cachedTapValue: tapValue(persisted, cachedCps),
  };
}

/**
 * Run-scoped fields for starting (or leaving) a challenge. Spread over the
 * current state so every meta-currency, collection and upgrade is preserved
 * automatically; only the active run resets.
 */
function challengeRunReset(state: GameState, activeChallenge: string | null): Partial<PersistedState> {
  const powers = effectivePowers(state.artifacts, state.dmUpgrades, state.research);
  return {
    minerals: powers.startMinerals,
    lifetimeThisRun: 0,
    generators: emptyGenerators(),
    upgrades: {},
    frenzyUntil: 0,
    frenzyMult: 1,
    asteroidIndex: Math.max(powers.startAsteroidIndex, perkStartAsteroid(state.singularityPerks)),
    asteroidDamage: 0,
    expedition: null,
    activeChallenge,
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
    delta.asteroidsShattered = state.asteroidsShattered + result.shattered;
    // Research Points are minted by each asteroid we break, scaled by depth.
    const rpMult = effectivePowers(state.artifacts, state.dmUpgrades, state.research).rpGainMult;
    let rp = 0;
    let bossDown = false;
    for (let i = state.asteroidIndex; i < result.asteroidIndex; i++) {
      rp += rpFromShatter(i);
      if (isBoss(i)) bossDown = true;
    }
    rp = Math.ceil(rp * rpMult);
    delta.researchPoints = state.researchPoints + rp;
    delta.totalResearch = state.totalResearch + rp;
    // Felling a boss kicks off a victory production frenzy.
    if (bossDown) {
      delta.frenzyUntil = Date.now() + 30_000;
      delta.frenzyMult = Math.max(state.frenzyMult, 4);
    }
    const next = { ...state, ...delta } as GameState;
    delta.cachedCps = cps(next);
    delta.cachedTapValue = tapValue(next, delta.cachedCps);
  }
  return delta;
}

// Throttles for automation perks (module-level; not part of saved state).
let lastAutoBuyAt = 0;
let lastAutoFleetAt = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  ...withCaches(initialPersistedState(), Date.now()),
  newAchievements: [],

  hydrate(persisted, nowMs) {
    // Silently grant any achievements an existing save already qualifies for,
    // so loading doesn't spam toasts but the bonus still applies.
    const achievements = { ...persisted.achievements };
    for (const id of newlyCompleted(persisted.achievements, computeMetrics(persisted))) {
      achievements[id] = true;
    }
    set({ ...withCaches({ ...persisted, achievements }, nowMs), newAchievements: [] });
  },

  tap() {
    const state = get();
    const earned = state.cachedTapValue * frenzyFactor(state, Date.now());
    set({ ...earn(state, earned), totalTaps: state.totalTaps + 1 });
    return earned;
  },

  buyGenerator(id, qty) {
    const state = get();
    if (challengeModifiers(state.activeChallenge).disableGenerators) return;
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
    const cometsCaught = state.cometsCaught + 1;
    if (reward.kind === 'frenzy') {
      set({ frenzyUntil: nowMs + reward.durationMs, frenzyMult: reward.mult, cometsCaught });
    } else {
      set({ ...earn(state, reward.amount), cometsCaught });
    }
  },

  launchExpedition(defId, nowMs) {
    const state = get();
    const def = EXPEDITIONS_BY_ID[defId];
    if (!def || state.expedition) return;
    const powers = effectivePowers(state.artifacts, state.dmUpgrades, state.research);
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
      expeditionsCompleted: state.expeditionsCompleted + 1,
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

  buyResearch(id) {
    const state = get();
    const node = RESEARCH_BY_ID[id];
    if (!node || state.research[id]) return;
    if (state.researchPoints < node.cost || !isResearchUnlocked(node, state.research)) return;
    const research = { ...state.research, [id]: true as const };
    set(
      withCaches(
        { ...state, researchPoints: state.researchPoints - node.cost, research },
        state.lastTickAt,
      ),
    );
  },

  enterChallenge(id) {
    const state = get();
    if (state.activeChallenge || !CHALLENGES_BY_ID[id]) return;
    set(withCaches({ ...state, ...challengeRunReset(state, id) }, state.lastTickAt));
  },

  abandonChallenge() {
    const state = get();
    if (!state.activeChallenge) return;
    set(withCaches({ ...state, ...challengeRunReset(state, null) }, state.lastTickAt));
  },

  completeChallenge() {
    const state = get();
    const active = state.activeChallenge;
    if (!active || !challengeComplete(active, state.lifetimeThisRun)) return;
    const challengesCompleted = { ...state.challengesCompleted, [active]: true as const };
    set(
      withCaches(
        { ...state, challengesCompleted, ...challengeRunReset(state, null) },
        state.lastTickAt,
      ),
    );
  },

  applyEventOutcome(outcome, nowMs) {
    const state = get();
    switch (outcome.kind) {
      case 'frenzy':
        set({ frenzyUntil: nowMs + outcome.durationMs, frenzyMult: outcome.mult });
        break;
      case 'windfall':
        set(earn(state, outcome.amount));
        break;
      case 'rp':
        set({
          researchPoints: state.researchPoints + outcome.amount,
          totalResearch: state.totalResearch + outcome.amount,
        });
        break;
      case 'loseMineralsPct':
        set({ minerals: state.minerals * (1 - outcome.pct) });
        break;
    }
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
          dmSinceAscension: state.dmSinceAscension + gained,
          singularityCores: state.singularityCores,
          totalSingularityCores: state.totalSingularityCores,
          ascensionCount: state.ascensionCount,
          singularityPerks: state.singularityPerks,
          challengesCompleted: state.challengesCompleted,
          lastDailyAt: state.lastDailyAt,
          dailyStreak: state.dailyStreak,
          dmUpgrades: state.dmUpgrades,
          prestigeCount: state.prestigeCount + 1,
          artifacts: state.artifacts,
          expedition: state.expedition,
          achievements: state.achievements,
          asteroidsShattered: state.asteroidsShattered,
          cometsCaught: state.cometsCaught,
          expeditionsCompleted: state.expeditionsCompleted,
          researchPoints: state.researchPoints,
          totalResearch: state.totalResearch,
          research: state.research,
          // Head start from the Dark Matter shop, floored by the Belt Memory perk.
          minerals: powers.startMinerals,
          asteroidIndex: Math.max(powers.startAsteroidIndex, perkStartAsteroid(state.singularityPerks)),
        },
        state.lastTickAt,
      ),
    );
  },

  doAscend() {
    const state = get();
    const gained = pendingSingularityCores(state.dmSinceAscension);
    if (gained < 1) return;
    set(
      withCaches(
        {
          ...initialPersistedState(Date.now()),
          // Ascension keeps the deepest meta-layers but sacrifices the Dark
          // Matter economy (currency + shop) for permanent Singularity Cores.
          lifetimeAllTime: state.lifetimeAllTime,
          totalTaps: state.totalTaps,
          prestigeCount: state.prestigeCount,
          artifacts: state.artifacts,
          achievements: state.achievements,
          asteroidsShattered: state.asteroidsShattered,
          cometsCaught: state.cometsCaught,
          expeditionsCompleted: state.expeditionsCompleted,
          researchPoints: state.researchPoints,
          totalResearch: state.totalResearch,
          research: state.research,
          totalDarkMatter: state.totalDarkMatter,
          singularityCores: state.singularityCores + gained,
          totalSingularityCores: state.totalSingularityCores + gained,
          ascensionCount: state.ascensionCount + 1,
          dmSinceAscension: 0,
          singularityPerks: state.singularityPerks,
          challengesCompleted: state.challengesCompleted,
          lastDailyAt: state.lastDailyAt,
          dailyStreak: state.dailyStreak,
          asteroidIndex: perkStartAsteroid(state.singularityPerks),
        },
        state.lastTickAt,
      ),
    );
  },

  buySingularityPerk(id) {
    const state = get();
    const def = SINGULARITY_PERKS_BY_ID[id];
    if (!def || state.singularityPerks[id]) return;
    if (state.singularityCores < def.cost) return;
    const singularityPerks = { ...state.singularityPerks, [id]: true as const };
    set(
      withCaches(
        { ...state, singularityCores: state.singularityCores - def.cost, singularityPerks },
        state.lastTickAt,
      ),
    );
  },

  autoTick(nowMs) {
    const state = get();
    const perks = state.singularityPerks;
    // Auto-Driller: mine a share of taps each 100ms tick.
    if (perks.auto_driller) {
      const taps = Math.max(1, Math.round(AUTO_TAPS_PER_SEC / 10));
      let acc: Partial<GameState> = {};
      let base: GameState = state;
      for (let i = 0; i < taps; i++) {
        const earned = base.cachedTapValue * frenzyFactor(base, nowMs);
        acc = earn(base, earned);
        acc.totalTaps = base.totalTaps + 1;
        base = { ...base, ...acc } as GameState;
      }
      set(acc);
    }
    // Auto-Foreman: buy the single cheapest affordable generator (~1/sec).
    if (perks.auto_foreman && nowMs - lastAutoBuyAt > 1000) {
      lastAutoBuyAt = nowMs;
      const s = get();
      let bestId: GeneratorId | null = null;
      let bestCost = Infinity;
      for (const def of GENERATORS) {
        const cost = costOfNext(def, s.generators[def.id] ?? 0);
        if (cost <= s.minerals && cost < bestCost) {
          bestCost = cost;
          bestId = def.id;
        }
      }
      if (bestId) get().buyGenerator(bestId, 1);
    }
    // Fleet AI: launch the most expensive affordable expedition when idle.
    if (perks.fleet_ai && nowMs - lastAutoFleetAt > 2000) {
      lastAutoFleetAt = nowMs;
      const s = get();
      if (!s.expedition) {
        const powers = effectivePowers(s.artifacts, s.dmUpgrades, s.research);
        let pick: string | null = null;
        for (const def of EXPEDITIONS) {
          if (s.minerals >= expeditionFuel(def, s.cachedCps, powers)) pick = def.id;
        }
        if (pick) get().launchExpedition(pick, nowMs);
      }
    }
  },

  claimDaily(nowMs) {
    const state = get();
    if (!dailyAvailable(state.lastDailyAt, nowMs)) return null;
    const streak = dailyStreakAfter(state.lastDailyAt, state.dailyStreak, nowMs);
    const reward = dailyReward(state.cachedCps, streak);
    set({ ...earn(state, reward), lastDailyAt: nowMs, dailyStreak: streak });
    return { reward, streak };
  },

  tickAchievements() {
    const state = get();
    const newly = newlyCompleted(state.achievements, computeMetrics(state));
    if (newly.length === 0) return;
    const achievements = { ...state.achievements };
    for (const id of newly) achievements[id] = true;
    // Recompute caches: the completion bonus changes production.
    set({
      ...withCaches({ ...state, achievements }, state.lastTickAt),
      newAchievements: [...state.newAchievements, ...newly],
    });
  },

  consumeAchievements() {
    const queued = get().newAchievements;
    if (queued.length > 0) set({ newAchievements: [] });
    return queued;
  },

  resetGame() {
    const now = Date.now();
    set({ ...withCaches(initialPersistedState(now), now), newAchievements: [] });
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
