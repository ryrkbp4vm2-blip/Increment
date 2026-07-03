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
  scaledChallengeGoal,
} from '../game/challenges';
import {
  CRYSTAL_CHALLENGES_BY_ID,
  crystalChallengeComplete,
  crystalChallengeModifiers,
  crystalChallengeRewardMult,
  permanentCrystalPowerMultiplier,
  scaledCrystalChallengeGoal,
} from '../game/crystalChallenges';
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
import {
  EON_UPGRADES_BY_ID,
  canConverge,
  eonAttuneMult,
  eonCrystalMult,
  eonMult,
  eonResonanceMult,
  eonUpgradeCost,
  eonYieldMult,
  pendingEons,
} from '../game/convergence';
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
  challengeGoalPower,
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
  doConverge(): void;
  buyEonUpgrade(id: string): void;
  toggleAutoResonate(): void;
  toggleAutoForge(): void;
  toggleAutoUpgrade(): void;
  toggleAutoCrystalUpgrade(): void;
  setBuyQty(qty: BuyQty): void;
  setNotificationsEnabled(on: boolean): void;
  buySingularityPerk(id: string): void;
  buyCoreUpgrade(id: string): void;
  buyCrystalUpgrade(id: string): void;
  enterChallenge(id: string): void;
  abandonChallenge(): void;
  completeChallenge(): void;
  enterCrystalChallenge(id: string): void;
  abandonCrystalChallenge(): void;
  completeCrystalChallenge(): void;
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
    activeChallengeGoal: 0,
    challengesCompleted: {},
    activeCrystalChallenge: null,
    activeCrystalChallengeGoal: 0,
    crystalChallengesCompleted: {},
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
    attunementSinceConverge: 0,
    eons: 0,
    totalEons: 0,
    convergenceCount: 0,
    eonUpgrades: {},
    buyQty: 1,
    notificationsEnabled: false,
    fastestCollapseMs: 0,
    deepestAsteroid: 0,
    deepestFormation: 0,
    peakCps: 0,
    peakCrystalCps: 0,
    totalPlayMs: 0,
  };
}

// Returns everything except transient fields (newAchievements queue, Drill
// Heat, automation throttles), which are preserved across these partial
// updates by zustand's shallow merge.
type TransientField =
  | 'newAchievements'
  | 'tapHeat'
  | 'lastTapAt'
  | 'lastAutoBuyAt'
  | 'lastAutoFleetAt'
  | 'lastAutoForgeAt'
  | 'lastAutoUpgradeAt'
  | 'lastAutoCrystalUpgradeAt'
  | 'autoTapCarry';

function withCaches(
  persisted: PersistedState,
  lastTickAt: number,
): Omit<GameState, TransientField> {
  const cachedCps = cps(persisted);
  const cPowers = crystalPowers(persisted.crystalUpgrades);
  // The Resonance Amplifier raises the per-level production bonus each Resonance grants.
  const rMult = resonanceMult(
    persisted.resonance,
    RESONANCE_BONUS * resonancePowerMult(persisted.crystalUpgrades),
  );
  const runP = crystalRunPowers(persisted.crystalRunUpgrades);
  // Convergence layer: a permanent crystal-production boost that survives every
  // Convergence (eonMult per Eon ever earned, plus the Stellar Flux tree).
  const eMult = eonMult(persisted.totalEons) * eonCrystalMult(persisted.eonUpgrades);
  // Crystal challenges: permanent rewards from completed runs, plus the active
  // run's constraint (throttle / disabled generators).
  const ccReward = crystalChallengeRewardMult(persisted.crystalChallengesCompleted);
  const ccMods = crystalChallengeModifiers(persisted.activeCrystalChallenge);
  const cachedCrystalCps = ccMods.disableGenerators
    ? 0
    : crystalTotalCps(
        persisted.crystalGenerators,
        cPowers.globalMult * rMult * runP.globalMult * eMult
          * achievementBonus(persisted.achievements)
          * ccReward.globalMult * ccMods.productionMult,
        runP.genMult,
      );
  return {
    ...persisted,
    lastTickAt,
    cachedCps,
    cachedTapValue: tapValue(persisted, cachedCps),
    cachedCrystalCps,
    cachedCrystalTapValue: CRYSTAL_TAP_BASE * cPowers.tapMult * rMult * runP.tapMult * eMult
      * achievementBonus(persisted.achievements)
      * ccReward.tapMult * ccMods.tapMult,
    // Production records: caches change exactly when production changes, so
    // this is the one place peaks need tracking.
    peakCps: Math.max(persisted.peakCps, cachedCps),
    peakCrystalCps: Math.max(persisted.peakCrystalCps, cachedCrystalCps),
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
  | 'attunementSinceConverge'
  | 'eons'
  | 'totalEons'
  | 'convergenceCount'
  | 'eonUpgrades'
  | 'buyQty'
  | 'notificationsEnabled'
  | 'autoUpgrade'
  | 'autoCrystalUpgrade'
  | 'crystalChallengesCompleted'
  | 'fastestCollapseMs'
  | 'deepestAsteroid'
  | 'deepestFormation'
  | 'peakCps'
  | 'peakCrystalCps'
  | 'totalPlayMs'
> {
  return {
    crystals: state.crystals,
    totalCrystals: state.totalCrystals,
    transcendCount: state.transcendCount,
    ascensionsSinceTranscend: state.ascensionsSinceTranscend,
    crystalUpgrades: state.crystalUpgrades,
    attunement: state.attunement,
    totalAttunement: state.totalAttunement,
    attunementSinceConverge: state.attunementSinceConverge,
    eons: state.eons,
    totalEons: state.totalEons,
    convergenceCount: state.convergenceCount,
    eonUpgrades: state.eonUpgrades,
    resonance: state.resonance,
    buyQty: state.buyQty,
    notificationsEnabled: state.notificationsEnabled,
    autoUpgrade: state.autoUpgrade,
    autoCrystalUpgrade: state.autoCrystalUpgrade,
    crystalChallengesCompleted: state.crystalChallengesCompleted,
    fastestCollapseMs: state.fastestCollapseMs,
    deepestAsteroid: state.deepestAsteroid,
    deepestFormation: state.deepestFormation,
    peakCps: state.peakCps,
    peakCrystalCps: state.peakCrystalCps,
    totalPlayMs: state.totalPlayMs,
  };
}

/**
 * Run-scoped fields for starting (or leaving) a challenge. Spread over the
 * current state so every meta-currency, collection and upgrade is preserved
 * automatically; only the active run resets.
 */
function challengeRunReset(
  state: GameState,
  activeChallenge: string | null,
  activeChallengeGoal = 0,
): Partial<PersistedState> {
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
    activeChallengeGoal,
  };
}

/**
 * Run-scoped crystal fields for starting (or leaving) a crystal challenge —
 * the same wipe a Cascade performs, with no Resonance payout. Everything
 * permanent (Matrix, Resonance, Eons, records) is untouched by omission.
 */
function crystalChallengeRunReset(
  activeCrystalChallenge: string | null,
  activeCrystalChallengeGoal: number,
): Partial<PersistedState> {
  return {
    crystals: 0,
    lifetimeCrystals: 0,
    crystalGenerators: {},
    crystalRunUpgrades: {},
    crystalFormationIndex: 0,
    crystalFormationDamage: 0,
    activeCrystalChallenge,
    activeCrystalChallengeGoal,
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
    delta.deepestAsteroid = Math.max(state.deepestAsteroid, result.asteroidIndex);
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
    // Felling a boss kicks off a victory production frenzy. frenzyMult lingers
    // after frenzyUntil passes, so only an *active* stronger frenzy is kept —
    // an expired ×7 comet must not turn every later boss kill into ×7.
    if (bossDown) {
      const now = Date.now();
      const activeMult = state.frenzyUntil > now ? state.frenzyMult : 1;
      delta.frenzyUntil = now + 30_000;
      delta.frenzyMult = Math.max(activeMult, 4);
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
    delta.deepestFormation = Math.max(state.deepestFormation, result.formationIndex);
  }
  return delta;
}

/** Zeroed transient fields, used at store creation and on every hydrate. */
const initialTransients = {
  newAchievements: [] as string[],
  tapHeat: 0,
  lastTapAt: 0,
  lastAutoBuyAt: 0,
  lastAutoFleetAt: 0,
  lastAutoForgeAt: 0,
  lastAutoUpgradeAt: 0,
  lastAutoCrystalUpgradeAt: 0,
  autoTapCarry: 0,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...withCaches(initialPersistedState(), Date.now()),
  ...initialTransients,

  hydrate(persisted, nowMs) {
    // Silently grant any achievements an existing save already qualifies for,
    // so loading doesn't spam toasts but the bonus still applies.
    const achievements = { ...persisted.achievements };
    for (const id of newlyCompleted(persisted.achievements, computeMetrics(persisted))) {
      achievements[id] = true;
    }
    set({ ...withCaches({ ...persisted, achievements }, nowMs), ...initialTransients });
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
    // Some crystal challenges forbid generators (also gates Auto-Forge).
    if (crystalChallengeModifiers(state.activeCrystalChallenge).disableGenerators) return;
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
    // Some crystal challenges seal the Forge (also gates Auto-Buy Upgrades).
    if (crystalChallengeModifiers(state.activeCrystalChallenge).disableForgeUpgrades) return;
    const def = CRYSTAL_GEN_UPGRADES_BY_ID[id];
    if (!def || state.crystalRunUpgrades[id]) return;
    if (state.crystals < def.cost || !crystalUpgradeUnlockMet(def, state)) return;
    const crystalRunUpgrades = { ...state.crystalRunUpgrades, [id]: true as const };
    set(withCaches({ ...state, crystals: state.crystals - def.cost, crystalRunUpgrades }, state.lastTickAt));
  },

  applyTick(nowMs) {
    const state = get();
    const deltaMs = Math.min(Math.max(nowMs - state.lastTickAt, 0), MAX_TICK_DELTA_MS);
    // Foreground playtime record (offline stretches skip this path entirely).
    const totalPlayMs = state.totalPlayMs + deltaMs;
    if (state.transcendCount > 0) {
      // Crystal mode: passive generators earn crystals, boosted by the active
      // formation depth, any Resonant Geode frenzy, and achievementBonus.
      if (state.cachedCrystalCps > 0) {
        const earned =
          state.cachedCrystalCps *
          formationDepthBonus(state.crystalFormationIndex) *
          (deltaMs / 1000) *
          frenzyFactor(state, nowMs);
        set({ ...earnCrystals(state, earned), lastTickAt: nowMs, totalPlayMs });
      } else {
        set({ lastTickAt: nowMs, totalPlayMs });
      }
      // Auto-Resonate: fire the cascade automatically when the gate is met.
      // Auto-Cascade pauses during a crystal challenge — a Cascade would
      // silently cancel the attempt mid-run.
      if (state.autoResonate && !state.activeCrystalChallenge) {
        const s = get();
        if (canResonate(s.lifetimeCrystals, s.resonance)) get().doResonate();
      }
    } else {
      const earned = state.cachedCps * (deltaMs / 1000) * frenzyFactor(state, nowMs);
      set({ ...earn(state, earned), lastTickAt: nowMs, totalPlayMs });
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
    // Permanent-power purchases are locked during a challenge: the goal was
    // snapshotted against entry power, so buying power mid-run would dodge it.
    if (state.activeChallenge) return;
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
    // Locked during a challenge — see buyDarkMatterUpgrade.
    if (state.activeChallenge) return;
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
    const def = CHALLENGES_BY_ID[id];
    if (state.activeChallenge || !def) return;
    // The ascension gate is enforced here too, not just hidden in the UI.
    if (state.ascensionCount < def.unlockAscensions) return;
    const goal = scaledChallengeGoal(def, challengeGoalPower(state));
    set(withCaches({ ...state, ...challengeRunReset(state, id, goal) }, state.lastTickAt));
  },

  abandonChallenge() {
    const state = get();
    if (!state.activeChallenge) return;
    set(withCaches({ ...state, ...challengeRunReset(state, null) }, state.lastTickAt));
  },

  completeChallenge() {
    const state = get();
    const active = state.activeChallenge;
    if (!active || !challengeComplete(active, state.lifetimeThisRun, state.activeChallengeGoal)) return;
    const challengesCompleted = { ...state.challengesCompleted, [active]: true as const };
    set(
      withCaches(
        { ...state, challengesCompleted, ...challengeRunReset(state, null) },
        state.lastTickAt,
      ),
    );
  },

  enterCrystalChallenge(id) {
    const state = get();
    const def = CRYSTAL_CHALLENGES_BY_ID[id];
    if (state.activeCrystalChallenge || !def || state.transcendCount === 0) return;
    if (state.crystalChallengesCompleted[id]) return;
    if (state.resonance < def.unlockResonance) return;
    const goal = scaledCrystalChallengeGoal(def, permanentCrystalPowerMultiplier(state));
    set(
      withCaches(
        { ...state, ...crystalChallengeRunReset(id, goal) },
        state.lastTickAt,
      ),
    );
  },

  abandonCrystalChallenge() {
    const state = get();
    if (!state.activeCrystalChallenge) return;
    set(withCaches({ ...state, ...crystalChallengeRunReset(null, 0) }, state.lastTickAt));
  },

  completeCrystalChallenge() {
    const state = get();
    const active = state.activeCrystalChallenge;
    if (
      !active ||
      !crystalChallengeComplete(active, state.lifetimeCrystals, state.activeCrystalChallengeGoal)
    ) {
      return;
    }
    const crystalChallengesCompleted = {
      ...state.crystalChallengesCompleted,
      [active]: true as const,
    };
    set(
      withCaches(
        { ...state, crystalChallengesCompleted, ...crystalChallengeRunReset(null, 0) },
        state.lastTickAt,
      ),
    );
  },

  applyEventOutcome(outcome, nowMs) {
    const state = get();
    switch (outcome.kind) {
      case 'frenzy': {
        // Don't let a weaker event frenzy (×3) overwrite an active stronger
        // one (×7 comet): the stronger frenzy keeps its multiplier AND expiry.
        const activeMult = state.frenzyUntil > nowMs ? state.frenzyMult : 1;
        if (outcome.mult >= activeMult) {
          set({ frenzyUntil: nowMs + outcome.durationMs, frenzyMult: outcome.mult });
        }
        break;
      }
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
    const runMs = Date.now() - state.startedAt;
    set(
      withCaches(
        {
          ...initialPersistedState(Date.now()),
          ...carryTranscend(state),
          // Speedrun record: shortest run-start → Collapse ever.
          fastestCollapseMs:
            state.fastestCollapseMs > 0 ? Math.min(state.fastestCollapseMs, runMs) : runMs,
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
          // The in-flight expedition dies with the run (matching ascend/warp):
          // its loot was snapshotted from pre-collapse CPS, so claiming it into
          // a fresh run would largely re-fund the next prestige.
          expedition: null,
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
    // Transcendence is one-way by design: crystal mode replaces the mineral
    // game permanently, so a second Transcend is impossible (minerals and
    // ascensions can no longer be earned) — and would wipe Resonance and
    // Attunement if it ever fired. Guard it explicitly.
    if (state.transcendCount > 0) return;
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
          notificationsEnabled: state.notificationsEnabled,
          autoUpgrade: state.autoUpgrade,
          autoCrystalUpgrade: state.autoCrystalUpgrade,
          eons: state.eons,
          totalEons: state.totalEons,
          convergenceCount: state.convergenceCount,
          eonUpgrades: state.eonUpgrades,
          // All-time records ride through into crystal mode.
          fastestCollapseMs: state.fastestCollapseMs,
          deepestAsteroid: state.deepestAsteroid,
          deepestFormation: state.deepestFormation,
          peakCps: state.peakCps,
          peakCrystalCps: state.peakCrystalCps,
          totalPlayMs: state.totalPlayMs,
        },
        state.lastTickAt,
      ),
    );
  },

  doResonate() {
    const state = get();
    // No Cascading mid-challenge: it would silently destroy the attempt.
    // Finish or abandon the challenge first.
    if (state.activeCrystalChallenge) return;
    if (!canResonate(state.lifetimeCrystals, state.resonance)) return;
    // The Convergence tree boosts both Cascade payouts (Resonant Echo, Deep Attunement).
    const gained = Math.floor(
      resonanceGain(state.lifetimeCrystals, state.crystalUpgrades, state.resonance) *
        eonResonanceMult(state.eonUpgrades),
    );
    if (gained < 1) return;
    // A Cascade also pays out Attunement — the permanent Crystal-Matrix currency.
    const attune = Math.floor(attunementGain(state.lifetimeCrystals) * eonAttuneMult(state.eonUpgrades));
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
          // Channelled Attunement accumulates across Cascades toward Convergence.
          attunementSinceConverge: state.attunementSinceConverge + attune,
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
          autoUpgrade: state.autoUpgrade,
          autoCrystalUpgrade: state.autoCrystalUpgrade,
          buyQty: state.buyQty,
          notificationsEnabled: state.notificationsEnabled,
          // Convergence layer sits above the Cascade — Eons and tree survive.
          eons: state.eons,
          totalEons: state.totalEons,
          convergenceCount: state.convergenceCount,
          eonUpgrades: state.eonUpgrades,
          // Crystal challenge rewards are permanent; the active attempt (if
          // any) is a run and dies with the Cascade.
          crystalChallengesCompleted: state.crystalChallengesCompleted,
          fastestCollapseMs: state.fastestCollapseMs,
          deepestAsteroid: state.deepestAsteroid,
          deepestFormation: state.deepestFormation,
          peakCps: state.peakCps,
          peakCrystalCps: state.peakCrystalCps,
          totalPlayMs: state.totalPlayMs,
        },
        state.lastTickAt,
      ),
    );
  },

  doConverge() {
    const state = get();
    if (!canConverge(state.attunementSinceConverge)) return;
    const gained = pendingEons(state.attunementSinceConverge, state.eonUpgrades);
    if (gained < 1) return;
    set(
      withCaches(
        {
          ...initialPersistedState(Date.now()),
          // Convergence — the deepest reset. The entire crystal layer collapses:
          // balance, generators, Forge upgrades, Resonance, Attunement and the
          // whole Crystal Matrix all reset (attunementSinceConverge back to 0).
          // Only Eons, the Convergence tree and the permanent records survive.
          transcendCount: state.transcendCount,
          ascensionCount: state.ascensionCount,
          eons: state.eons + gained,
          totalEons: state.totalEons + gained,
          convergenceCount: state.convergenceCount + 1,
          eonUpgrades: state.eonUpgrades,
          // Records and all-time stats persist.
          totalCrystals: state.totalCrystals,
          totalAttunement: state.totalAttunement,
          lifetimeAllTime: state.lifetimeAllTime,
          totalTaps: state.totalTaps,
          achievements: state.achievements,
          asteroidsShattered: state.asteroidsShattered,
          crystalFormationsShattered: state.crystalFormationsShattered,
          cometsCaught: state.cometsCaught,
          expeditionsCompleted: state.expeditionsCompleted,
          lastDailyAt: state.lastDailyAt,
          dailyStreak: state.dailyStreak,
          // Remembered preferences survive.
          autoResonate: state.autoResonate,
          autoForge: state.autoForge,
          autoUpgrade: state.autoUpgrade,
          autoCrystalUpgrade: state.autoCrystalUpgrade,
          buyQty: state.buyQty,
          notificationsEnabled: state.notificationsEnabled,
          // Crystal challenge rewards are permanent records too.
          crystalChallengesCompleted: state.crystalChallengesCompleted,
          fastestCollapseMs: state.fastestCollapseMs,
          deepestAsteroid: state.deepestAsteroid,
          deepestFormation: state.deepestFormation,
          peakCps: state.peakCps,
          peakCrystalCps: state.peakCrystalCps,
          totalPlayMs: state.totalPlayMs,
        },
        state.lastTickAt,
      ),
    );
  },

  buyEonUpgrade(id) {
    const state = get();
    // Locked during a crystal challenge — Eons multiply crystal production,
    // and the goal was snapshotted against entry power.
    if (state.activeCrystalChallenge) return;
    const def = EON_UPGRADES_BY_ID[id];
    if (!def) return;
    const level = state.eonUpgrades[id] ?? 0;
    if (level >= def.maxLevel) return;
    const cost = eonUpgradeCost(def, level);
    if (state.eons < cost) return;
    const eonUpgrades = { ...state.eonUpgrades, [id]: level + 1 };
    set(withCaches({ ...state, eons: state.eons - cost, eonUpgrades }, state.lastTickAt));
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

  setNotificationsEnabled(on) {
    set({ notificationsEnabled: on });
  },

  buySingularityPerk(id) {
    const state = get();
    // Locked during a challenge — see buyDarkMatterUpgrade.
    if (state.activeChallenge) return;
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
    // Locked during a challenge — see buyDarkMatterUpgrade.
    if (state.activeChallenge) return;
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
    // Locked during a crystal challenge — the Matrix multiplies crystal
    // production, and the goal was snapshotted against entry power.
    if (state.activeCrystalChallenge) return;
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
    // Auto-Driller: mine a share of taps each 100ms tick. The rate is
    // fractional per tick (5/sec = 0.5/tick), so carry the remainder instead
    // of rounding up — rounding gave 1 tap every tick, double the perk's rate.
    if (perks.auto_driller) {
      const carry = state.autoTapCarry + AUTO_TAPS_PER_SEC / 10;
      const taps = Math.floor(carry);
      if (taps > 0) {
        // Merge every iteration's delta: a shatter mid-loop writes fields
        // (research points, caches) the final iteration may not touch.
        let merged: Partial<GameState> = { autoTapCarry: carry - taps };
        let base: GameState = state;
        for (let i = 0; i < taps; i++) {
          const earned = base.cachedTapValue * frenzyFactor(base, nowMs);
          const delta = earn(base, earned);
          delta.totalTaps = base.totalTaps + 1;
          merged = { ...merged, ...delta };
          base = { ...base, ...delta } as GameState;
        }
        set(merged);
      } else {
        set({ autoTapCarry: carry });
      }
    }
    // Auto-Foreman: buy the single cheapest affordable generator (~1/sec).
    if (perks.auto_foreman && nowMs - state.lastAutoBuyAt > 1000) {
      set({ lastAutoBuyAt: nowMs });
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
    if (perks.fleet_ai && nowMs - state.lastAutoFleetAt > 2000) {
      set({ lastAutoFleetAt: nowMs });
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
      nowMs - state.lastAutoForgeAt > 500
    ) {
      set({ lastAutoForgeAt: nowMs });
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
      nowMs - state.lastAutoUpgradeAt > 500
    ) {
      set({ lastAutoUpgradeAt: nowMs });
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
      nowMs - state.lastAutoCrystalUpgradeAt > 500
    ) {
      set({ lastAutoCrystalUpgradeAt: nowMs });
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
