import { create } from 'zustand';
import { achievementBonus, computeMetrics, newlyCompleted } from '../game/achievements';
import {
  AUTO_TAPS_PER_SEC,
  AUTO_UPGRADE_ASCENSIONS,
  CORE_UPGRADES_BY_ID,
  SINGULARITY_PERKS_BY_ID,
  coreUpgradeCost,
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
import { HEAT_PER_TAP, decayHeat, heatMultiplier } from '../game/heat';
import { canWarp } from '../game/zones';
import {
  CRYSTAL_UPGRADES_BY_ID,
  TRANSCEND_ASCENSIONS,
  canTranscend,
  crystalFormationBonusMult,
  crystalGain,
  crystalPowers,
  crystalUpgradeCost,
  resonancePowerMult,
} from '../game/transcend';
import {
  AUTO_FORGE_RESONANCE,
  AUTO_UPGRADE_RESONANCE,
  CRYSTAL_GENS,
  CRYSTAL_GENS_BY_ID,
  CRYSTAL_GEN_UPGRADES,
  CRYSTAL_GEN_UPGRADES_BY_ID,
  CRYSTAL_TAP_BASE,
  RESONANCE_BONUS,
  applyCrystalFormationDamage,
  attunementGain,
  canResonate,
  crystalGenBulkCost,
  crystalGenCostOfNext,
  crystalGenMaxAffordable,
  crystalRunPowers,
  crystalTotalCps,
  crystalUpgradeUnlockMet,
  formationDepthBonus,
  resonanceGain,
  resonanceMult,
} from '../game/crystalGame';
import { RESEARCH_BY_ID, isResearchUnlocked } from '../game/research';
import { GENERATORS, GENERATORS_BY_ID, MAX_TICK_DELTA_MS, UPGRADES, UPGRADES_BY_ID } from '../game/balance';
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
  crystalTap(): number;
  buyGenerator(id: GeneratorId, qty: BuyQty): void;
  buyUpgrade(id: string): void;
  buyCrystalGenerator(id: string, qty: 1 | 10 | 'max'): void;
  buyCrystalRunUpgrade(id: string): void;
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
  doWarp(): void;
  doTranscend(): void;
  doResonate(): void;
  toggleAutoResonate(): void;
  toggleAutoForge(): void;
  toggleAutoUpgrade(): void;
  toggleAutoCrystalUpgrade(): void;
  setBuyQty(qty: BuyQty): void;
  buySingularityPerk(id: string): void;
  buyCoreUpgrade(id: string): void;
  buyCrystalUpgrade(id: string): void;
  enterChallenge(id: string): void;
  abandonChallenge(): void;
  completeChallenge(): void;
  autoTick(nowMs: number): void;
  claimDaily(nowMs: number): { reward: number; streak: number } | null;
  tickAchievements(): void;
  consumeAchievements(): string[];
  resetGame(): void;
  /** TEMPORARY dev helper: jump to a Transcendence-ready empire. */
  devUnlockCrystals(): void;
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
    coreUpgrades: {},
    activeChallenge: null,
    challengesCompleted: {},
    lastDailyAt: 0,
    dailyStreak: 0,
    sector: 0,
    ascensionsSinceWarp: 0,
    crystals: 0,
    totalCrystals: 0,
    transcendCount: 0,
    ascensionsSinceTranscend: 0,
    crystalUpgrades: {},
    crystalGenerators: {},
    crystalFormationIndex: 0,
    crystalFormationDamage: 0,
    resonance: 0,
    lifetimeCrystals: 0,
    crystalRunUpgrades: {},
    crystalFormationsShattered: 0,
    autoResonate: false,
    autoForge: false,
    autoUpgrade: false,
    autoCrystalUpgrade: false,
    attunement: 0,
    totalAttunement: 0,
    buyQty: 1,
  };
}

// Returns everything except transient fields (newAchievements queue, Drill
// Heat), which are preserved across these partial updates by zustand's shallow
// merge.
function withCaches(
  persisted: PersistedState,
  lastTickAt: number,
): Omit<GameState, 'newAchievements' | 'tapHeat' | 'lastTapAt'> {
  const cachedCps = cps(persisted);
  const cPowers = crystalPowers(persisted.crystalUpgrades);
  // The Resonance Amplifier raises the per-level production bonus each Resonance grants.
  const rMult = resonanceMult(
    persisted.resonance,
    RESONANCE_BONUS * resonancePowerMult(persisted.crystalUpgrades),
  );
  const runP = crystalRunPowers(persisted.crystalRunUpgrades);
  return {
    ...persisted,
    lastTickAt,
    cachedCps,
    cachedTapValue: tapValue(persisted, cachedCps),
    cachedCrystalCps: crystalTotalCps(
      persisted.crystalGenerators,
      cPowers.globalMult * rMult * runP.globalMult * achievementBonus(persisted.achievements),
      runP.genMult,
    ),
    cachedCrystalTapValue: CRYSTAL_TAP_BASE * cPowers.tapMult * rMult * runP.tapMult
      * achievementBonus(persisted.achievements),
  };
}

/**
 * Transcendence-layer fields carried across every lower reset (prestige,
 * ascension, warp). Crystals and the Crystal Matrix sit above everything else,
 * so they always survive — as does the remembered buy-quantity preference.
 */
function carryTranscend(state: GameState): Pick<
  PersistedState,
  | 'crystals'
  | 'totalCrystals'
  | 'transcendCount'
  | 'ascensionsSinceTranscend'
  | 'crystalUpgrades'
  | 'resonance'
  | 'attunement'
  | 'totalAttunement'
  | 'buyQty'
  | 'autoUpgrade'
  | 'autoCrystalUpgrade'
> {
  return {
    crystals: state.crystals,
    totalCrystals: state.totalCrystals,
    transcendCount: state.transcendCount,
    ascensionsSinceTranscend: state.ascensionsSinceTranscend,
    crystalUpgrades: state.crystalUpgrades,
    attunement: state.attunement,
    totalAttunement: state.totalAttunement,
    resonance: state.resonance,
    buyQty: state.buyQty,
    autoUpgrade: state.autoUpgrade,
    autoCrystalUpgrade: state.autoCrystalUpgrade,
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
  const result = applyDamage(state.asteroidIndex, state.asteroidDamage, amount, state.sector);
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

/**
 * Credit `amount` crystals, deal matching damage to the current Crystal
 * Formation, and pay out any shatter bonus. Returns the state delta. Used by
 * tapping, the passive tick and offline earnings in crystal mode.
 */
function earnCrystals(state: GameState, amount: number): Partial<GameState> {
  const result = applyCrystalFormationDamage(
    state.crystalFormationIndex,
    state.crystalFormationDamage,
    amount,
  );
  const bonusMult = crystalFormationBonusMult(state.crystalUpgrades);
  const total = amount + result.bonus * bonusMult;
  const shattered = result.formationIndex - state.crystalFormationIndex;
  const delta: Partial<GameState> = {
    crystals: state.crystals + total,
    lifetimeCrystals: state.lifetimeCrystals + total,
    totalCrystals: state.totalCrystals + total,
    crystalFormationIndex: result.formationIndex,
    crystalFormationDamage: result.formationDamage,
  };
  if (shattered > 0) {
    delta.crystalFormationsShattered = state.crystalFormationsShattered + shattered;
  }
  return delta;
}

// Throttles for automation perks (module-level; not part of saved state).
let lastAutoBuyAt = 0;
let lastAutoFleetAt = 0;
let lastAutoForgeAt = 0;
let lastAutoUpgradeAt = 0;
let lastAutoCrystalUpgradeAt = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  ...withCaches(initialPersistedState(), Date.now()),
  newAchievements: [],
  tapHeat: 0,
  lastTapAt: 0,

  hydrate(persisted, nowMs) {
    // Silently grant any achievements an existing save already qualifies for,
    // so loading doesn't spam toasts but the bonus still applies.
    const achievements = { ...persisted.achievements };
    for (const id of newlyCompleted(persisted.achievements, computeMetrics(persisted))) {
      achievements[id] = true;
    }
    set({ ...withCaches({ ...persisted, achievements }, nowMs), newAchievements: [], tapHeat: 0, lastTapAt: 0 });
  },

  tap() {
    const state = get();
    const now = Date.now();
    // Reward this tap by the heat already built (a cold first tap is ×1), then
    // stoke the combo for the next tap.
    const decayed = decayHeat(state.tapHeat, now - state.lastTapAt);
    const earned = state.cachedTapValue * frenzyFactor(state, now) * heatMultiplier(decayed);
    const heat = Math.min(1, decayed + HEAT_PER_TAP);
    set({ ...earn(state, earned), totalTaps: state.totalTaps + 1, tapHeat: heat, lastTapAt: now });
    return earned;
  },

  crystalTap() {
    const state = get();
    const now = Date.now();
    // Drill Heat combo + formation depth bonus + any active Resonance Surge frenzy.
    const decayed = decayHeat(state.tapHeat, now - state.lastTapAt);
    const earned =
      state.cachedCrystalTapValue *
      formationDepthBonus(state.crystalFormationIndex) *
      frenzyFactor(state, now) *
      heatMultiplier(decayed);
    const heat = Math.min(1, decayed + HEAT_PER_TAP);
    const delta = earnCrystals(state, earned);
    set({ ...delta, totalTaps: state.totalTaps + 1, tapHeat: heat, lastTapAt: now });
    return (delta.crystals ?? state.crystals) - state.crystals;
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
    if (challengeModifiers(state.activeChallenge).disableUpgrades) return;
    const def = UPGRADES_BY_ID[id];
    if (!def || state.upgrades[id]) return;
    if (state.minerals < def.cost || !isUnlockMet(def.unlock, state)) return;
    const upgrades = { ...state.upgrades, [id]: true as const };
    set(withCaches({ ...state, minerals: state.minerals - def.cost, upgrades }, state.lastTickAt));
  },

  buyCrystalGenerator(id, qty) {
    const state = get();
    const def = CRYSTAL_GENS_BY_ID[id];
    if (!def) return;
    const owned = state.crystalGenerators[id] ?? 0;
    const count = qty === 'max' ? crystalGenMaxAffordable(def, owned, state.crystals) : qty;
    if (count <= 0) return;
    const cost = crystalGenBulkCost(def, owned, count);
    if (cost > state.crystals) return;
    const crystalGenerators = { ...state.crystalGenerators, [id]: owned + count };
    set(withCaches({ ...state, crystals: state.crystals - cost, crystalGenerators }, state.lastTickAt));
  },

  buyCrystalRunUpgrade(id) {
    const state = get();
    const def = CRYSTAL_GEN_UPGRADES_BY_ID[id];
    if (!def || state.crystalRunUpgrades[id]) return;
    if (state.crystals < def.cost || !crystalUpgradeUnlockMet(def, state)) return;
    const crystalRunUpgrades = { ...state.crystalRunUpgrades, [id]: true as const };
    set(withCaches({ ...state, crystals: state.crystals - def.cost, crystalRunUpgrades }, state.lastTickAt));
  },

  applyTick(nowMs) {
    const state = get();
    const deltaMs = Math.min(Math.max(nowMs - state.lastTickAt, 0), MAX_TICK_DELTA_MS);
    if (state.transcendCount > 0) {
      // Crystal mode: passive generators earn crystals, boosted by the active
      // formation depth, any Resonant Geode frenzy, and achievementBonus.
      if (state.cachedCrystalCps > 0) {
        const earned =
          state.cachedCrystalCps *
          formationDepthBonus(state.crystalFormationIndex) *
          (deltaMs / 1000) *
          frenzyFactor(state, nowMs);
        set({ ...earnCrystals(state, earned), lastTickAt: nowMs });
      } else {
        set({ lastTickAt: nowMs });
      }
      // Auto-Resonate: fire the cascade automatically when the gate is met.
      if (state.autoResonate) {
        const s = get();
        if (canResonate(s.lifetimeCrystals, s.resonance)) get().doResonate();
      }
    } else {
      const earned = state.cachedCps * (deltaMs / 1000) * frenzyFactor(state, nowMs);
      set({ ...earn(state, earned), lastTickAt: nowMs });
    }
  },

  applyOffline(earned, nowMs) {
    const state = get();
    if (state.transcendCount > 0) {
      set({ ...earnCrystals(state, earned), lastTickAt: nowMs });
    } else {
      set({ ...earn(state, earned), lastTickAt: nowMs });
    }
  },

  collectComet(reward, nowMs) {
    const state = get();
    const cometsCaught = state.cometsCaught + 1;
    if (reward.kind === 'frenzy') {
      set({ frenzyUntil: nowMs + reward.durationMs, frenzyMult: reward.mult, cometsCaught });
    } else if (state.transcendCount > 0) {
      // Crystal mode: a windfall pays out Crystals (and damages the formation).
      set({ ...earnCrystals(state, reward.amount), cometsCaught });
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
          ...carryTranscend(state),
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
          coreUpgrades: state.coreUpgrades,
          challengesCompleted: state.challengesCompleted,
          lastDailyAt: state.lastDailyAt,
          dailyStreak: state.dailyStreak,
          sector: state.sector,
          ascensionsSinceWarp: state.ascensionsSinceWarp,
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
          ...carryTranscend(state),
          // Each ascension counts toward the next Transcend.
          ascensionsSinceTranscend: state.ascensionsSinceTranscend + 1,
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
          coreUpgrades: state.coreUpgrades,
          challengesCompleted: state.challengesCompleted,
          lastDailyAt: state.lastDailyAt,
          dailyStreak: state.dailyStreak,
          sector: state.sector,
          ascensionsSinceWarp: state.ascensionsSinceWarp + 1,
          asteroidIndex: perkStartAsteroid(state.singularityPerks),
        },
        state.lastTickAt,
      ),
    );
  },

  doWarp() {
    const state = get();
    if (!canWarp(state.ascensionsSinceWarp)) return;
    set(
      withCaches(
        {
          ...initialPersistedState(Date.now()),
          ...carryTranscend(state),
          // Warping advances to the next sector for a big permanent production
          // multiplier. The run, Dark Matter layer and spendable cores reset;
          // collections, research, perks and the singularity multiplier carry.
          lifetimeAllTime: state.lifetimeAllTime,
          totalTaps: state.totalTaps,
          prestigeCount: state.prestigeCount,
          ascensionCount: state.ascensionCount,
          artifacts: state.artifacts,
          achievements: state.achievements,
          asteroidsShattered: state.asteroidsShattered,
          cometsCaught: state.cometsCaught,
          expeditionsCompleted: state.expeditionsCompleted,
          researchPoints: state.researchPoints,
          totalResearch: state.totalResearch,
          research: state.research,
          totalDarkMatter: state.totalDarkMatter,
          totalSingularityCores: state.totalSingularityCores,
          singularityPerks: state.singularityPerks,
          coreUpgrades: state.coreUpgrades,
          challengesCompleted: state.challengesCompleted,
          lastDailyAt: state.lastDailyAt,
          dailyStreak: state.dailyStreak,
          sector: state.sector + 1,
          ascensionsSinceWarp: 0,
          asteroidIndex: perkStartAsteroid(state.singularityPerks),
        },
        state.lastTickAt,
      ),
    );
  },

  doTranscend() {
    const state = get();
    if (!canTranscend(state.ascensionsSinceTranscend)) return;
    const gained = crystalGain(state.ascensionsSinceTranscend, state.crystalUpgrades);
    if (gained < 1) return;
    set(
      withCaches(
        {
          ...initialPersistedState(Date.now()),
          // Transcendence wipes the entire mineral empire — Dark Matter, cores,
          // sectors, research, artifacts and all — leaving only the permanent
          // Crystal Matrix and the records (achievements, all-time stats).
          crystals: state.crystals + gained,
          totalCrystals: state.totalCrystals + gained,
          transcendCount: state.transcendCount + 1,
          ascensionsSinceTranscend: 0,
          crystalUpgrades: state.crystalUpgrades,
          // Lifetime ascension count is a permanent record (and keeps the
          // Transcendence layer unlocked once reached) — carry it through.
          ascensionCount: state.ascensionCount,
          lifetimeAllTime: state.lifetimeAllTime,
          totalTaps: state.totalTaps,
          achievements: state.achievements,
          asteroidsShattered: state.asteroidsShattered,
          cometsCaught: state.cometsCaught,
          expeditionsCompleted: state.expeditionsCompleted,
          lastDailyAt: state.lastDailyAt,
          dailyStreak: state.dailyStreak,
          buyQty: state.buyQty,
          autoUpgrade: state.autoUpgrade,
          autoCrystalUpgrade: state.autoCrystalUpgrade,
        },
        state.lastTickAt,
      ),
    );
  },

  doResonate() {
    const state = get();
    if (!canResonate(state.lifetimeCrystals, state.resonance)) return;
    const gained = resonanceGain(state.lifetimeCrystals, state.crystalUpgrades, state.resonance);
    if (gained < 1) return;
    // A Cascade also pays out Attunement — the permanent Crystal-Matrix currency.
    const attune = attunementGain(state.lifetimeCrystals);
    set(
      withCaches(
        {
          ...initialPersistedState(Date.now()),
          // Resonance Cascade — the in-crystal prestige. Reset the crystal run
          // (balance, generators, formation depth) for permanent Resonance,
          // which multiplies all crystal production. The Matrix and records stay.
          transcendCount: state.transcendCount,
          ascensionCount: state.ascensionCount,
          crystalUpgrades: state.crystalUpgrades,
          resonance: state.resonance + gained,
          attunement: state.attunement + attune,
          totalAttunement: state.totalAttunement + attune,
          totalCrystals: state.totalCrystals,
          crystals: 0,
          lifetimeCrystals: 0,
          crystalGenerators: {},
          crystalFormationIndex: 0,
          crystalFormationDamage: 0,
          crystalRunUpgrades: {},
          lifetimeAllTime: state.lifetimeAllTime,
          totalTaps: state.totalTaps,
          achievements: state.achievements,
          asteroidsShattered: state.asteroidsShattered,
          crystalFormationsShattered: state.crystalFormationsShattered,
          cometsCaught: state.cometsCaught,
          expeditionsCompleted: state.expeditionsCompleted,
          lastDailyAt: state.lastDailyAt,
          dailyStreak: state.dailyStreak,
          // Remembered preferences survive the Cascade — otherwise Auto-Cascade
          // would disable itself the instant it fired.
          autoResonate: state.autoResonate,
          autoForge: state.autoForge,
          autoCrystalUpgrade: state.autoCrystalUpgrade,
          buyQty: state.buyQty,
        },
        state.lastTickAt,
      ),
    );
  },

  toggleAutoResonate() {
    const state = get();
    set({ autoResonate: !state.autoResonate });
  },

  toggleAutoForge() {
    const state = get();
    set({ autoForge: !state.autoForge });
  },

  toggleAutoUpgrade() {
    const state = get();
    set({ autoUpgrade: !state.autoUpgrade });
  },

  toggleAutoCrystalUpgrade() {
    const state = get();
    set({ autoCrystalUpgrade: !state.autoCrystalUpgrade });
  },

  setBuyQty(qty) {
    set({ buyQty: qty });
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

  buyCoreUpgrade(id) {
    const state = get();
    const def = CORE_UPGRADES_BY_ID[id];
    if (!def) return;
    const level = state.coreUpgrades[id] ?? 0;
    if (level >= def.maxLevel) return;
    const cost = coreUpgradeCost(def, level);
    if (state.singularityCores < cost) return;
    const coreUpgrades = { ...state.coreUpgrades, [id]: level + 1 };
    set(
      withCaches(
        { ...state, singularityCores: state.singularityCores - cost, coreUpgrades },
        state.lastTickAt,
      ),
    );
  },

  buyCrystalUpgrade(id) {
    const state = get();
    const def = CRYSTAL_UPGRADES_BY_ID[id];
    if (!def) return;
    // Deep-tier upgrades stay locked until Resonance reaches their gate.
    if (def.unlockResonance && state.resonance < def.unlockResonance) return;
    const level = state.crystalUpgrades[id] ?? 0;
    if (level >= def.maxLevel) return;
    const cost = crystalUpgradeCost(def, level);
    // The permanent Matrix is bought with Attunement (a Cascade reward), not the
    // crystals you mine this run.
    if (state.attunement < cost) return;
    const crystalUpgrades = { ...state.crystalUpgrades, [id]: level + 1 };
    set(
      withCaches(
        { ...state, attunement: state.attunement - cost, crystalUpgrades },
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
    // Auto-Forge: in crystal mode, buy the best-payback affordable generator so
    // a re-climb after a Cascade doesn't need manual re-buying (~2/sec).
    if (
      state.autoForge &&
      state.transcendCount > 0 &&
      state.resonance >= AUTO_FORGE_RESONANCE &&
      nowMs - lastAutoForgeAt > 500
    ) {
      lastAutoForgeAt = nowMs;
      const s = get();
      const genMult = crystalRunPowers(s.crystalRunUpgrades).genMult;
      let bestId: string | null = null;
      let bestPayback = Infinity;
      for (const def of CRYSTAL_GENS) {
        const owned = s.crystalGenerators[def.id] ?? 0;
        const cost = crystalGenCostOfNext(def, owned);
        if (cost > s.crystals) continue;
        const marginal = def.baseProd * (genMult[def.id] ?? 1);
        const payback = marginal > 0 ? cost / marginal : Infinity;
        if (payback < bestPayback) {
          bestPayback = payback;
          bestId = def.id;
        }
      }
      if (bestId) get().buyCrystalGenerator(bestId, 1);
    }
    // Auto-Buy Upgrades (mineral shop): once unlocked, buy the cheapest
    // affordable, unlocked, unowned upgrade each ~500ms.
    if (
      state.autoUpgrade &&
      state.transcendCount === 0 &&
      state.ascensionCount >= AUTO_UPGRADE_ASCENSIONS &&
      nowMs - lastAutoUpgradeAt > 500
    ) {
      lastAutoUpgradeAt = nowMs;
      const s = get();
      let bestId: string | null = null;
      let bestCost = Infinity;
      for (const def of UPGRADES) {
        if (s.upgrades[def.id] || def.cost > s.minerals || def.cost >= bestCost) continue;
        if (!isUnlockMet(def.unlock, s)) continue;
        bestCost = def.cost;
        bestId = def.id;
      }
      if (bestId) get().buyUpgrade(bestId);
    }
    // Auto-Buy Upgrades (crystal Forge): same idea for the run-scoped Forge
    // upgrades, gated by Resonance (the crystal-game ascension analogue).
    if (
      state.autoCrystalUpgrade &&
      state.transcendCount > 0 &&
      state.resonance >= AUTO_UPGRADE_RESONANCE &&
      nowMs - lastAutoCrystalUpgradeAt > 500
    ) {
      lastAutoCrystalUpgradeAt = nowMs;
      const s = get();
      let bestId: string | null = null;
      let bestCost = Infinity;
      for (const def of CRYSTAL_GEN_UPGRADES) {
        if (s.crystalRunUpgrades[def.id] || def.cost > s.crystals || def.cost >= bestCost) continue;
        if (!crystalUpgradeUnlockMet(def, s)) continue;
        bestCost = def.cost;
        bestId = def.id;
      }
      if (bestId) get().buyCrystalRunUpgrade(bestId);
    }
  },

  claimDaily(nowMs) {
    const state = get();
    if (!dailyAvailable(state.lastDailyAt, nowMs)) return null;
    const streak = dailyStreakAfter(state.lastDailyAt, state.dailyStreak, nowMs);
    if (state.transcendCount > 0) {
      // In crystal mode, the daily bonus is an hour of crystal production.
      const reward = dailyReward(state.cachedCrystalCps, streak);
      set({ ...earnCrystals(state, reward), lastDailyAt: nowMs, dailyStreak: streak });
      return { reward, streak };
    }
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
    set({ ...withCaches(initialPersistedState(now), now), newAchievements: [], tapHeat: 0, lastTapAt: 0 });
  },

  // TEMPORARY: jump directly into crystal mode with crystals to spend so the
  // new mining loop can be tried without a multi-day climb. Remove before release.
  devUnlockCrystals() {
    const now = Date.now();
    const base = initialPersistedState(now);
    set({
      ...withCaches(
        {
          ...base,
          lifetimeAllTime: 1e15,
          totalTaps: 5000,
          ascensionCount: 6,
          // Crystal mode: already transcended once, plenty of crystals to spend
          // and enough lifetime crystals this run to try a Resonance Cascade.
          transcendCount: 1,
          crystals: 200_000,
          totalCrystals: 200_000,
          lifetimeCrystals: 200_000,
          // Some Attunement banked so the permanent Crystal Matrix can be tried.
          attunement: 30,
          totalAttunement: 30,
          // A few generators pre-seeded so there's CPS from the start.
          crystalGenerators: { shard: 10, prism: 3 },
        },
        now,
      ),
      newAchievements: [],
      tapHeat: 0,
      lastTapAt: 0,
    });
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
