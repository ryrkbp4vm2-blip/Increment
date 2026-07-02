/**
 * Crystal Challenges — constrained Cascade runs inside crystal mode, mirroring
 * the mineral-era Prestige Challenges. Entering resets the crystal run (like a
 * Cascade with no payout), the constraint applies for the whole run, and
 * beating the goal banks a permanent crystal-production or tap reward.
 *
 * Goals are scaled by the player's PERMANENT crystal power at entry (Resonance,
 * Matrix, Eons, achievements — everything that survives a Cascade), snapshotted
 * so the run can't be trivialised by outside growth. Run-scoped Forge upgrades
 * are wiped at entry, so they aren't part of the scale.
 */
import { achievementBonus } from './achievements';
import { eonCrystalMult, eonMult } from './convergence';
import { RESONANCE_BONUS, resonanceMult } from './crystalGame';
import { crystalPowers, resonancePowerMult } from './transcend';
import { PersistedState } from './types';

export interface CrystalChallengeReward {
  crystalGlobalMult?: number;
  crystalTapMult?: number;
}

export interface CrystalChallengeDef {
  id: string;
  name: string;
  description: string;
  /** Lifetime crystals (this run) needed, before permanent-power scaling. */
  goal: number;
  /** Crystal production multiplier while the challenge is active. */
  productionMult: number;
  /** Crystal tap multiplier while the challenge is active. */
  tapMult: number;
  disableGenerators: boolean;
  disableGeodes: boolean;
  disableForgeUpgrades: boolean;
  rewardLabel: string;
  reward: CrystalChallengeReward;
  /** Minimum Resonance before this challenge appears. */
  unlockResonance: number;
}

export const CRYSTAL_CHALLENGES: CrystalChallengeDef[] = [
  {
    id: 'cc_silent_forge',
    name: 'Silent Forge',
    description: 'Forge upgrades are sealed — raw generators only.',
    goal: 1e5,
    productionMult: 1,
    tapMult: 1,
    disableGenerators: false,
    disableGeodes: false,
    disableForgeUpgrades: true,
    rewardLabel: 'Crystal production ×1.5 forever',
    reward: { crystalGlobalMult: 1.5 },
    unlockResonance: 1,
  },
  {
    id: 'cc_bare_hands',
    name: 'Bare Hands',
    description: 'Generators are dark — mine every crystal by hand.',
    goal: 2e4,
    productionMult: 1,
    tapMult: 1,
    disableGenerators: true,
    disableGeodes: false,
    disableForgeUpgrades: false,
    rewardLabel: 'Crystal tap power ×4 forever',
    reward: { crystalTapMult: 4 },
    unlockResonance: 2,
  },
  {
    id: 'cc_dark_sky',
    name: 'Dark Sky',
    description: 'No Resonant Geodes — no frenzies, no windfalls.',
    goal: 2.5e5,
    productionMult: 1,
    tapMult: 1,
    disableGenerators: false,
    disableGeodes: true,
    disableForgeUpgrades: false,
    rewardLabel: 'Crystal production ×1.75 forever',
    reward: { crystalGlobalMult: 1.75 },
    unlockResonance: 3,
  },
  {
    id: 'cc_dim_resonance',
    name: 'Dim Resonance',
    description: 'All crystal output runs at 20%.',
    goal: 5e5,
    productionMult: 0.2,
    tapMult: 0.2,
    disableGenerators: false,
    disableGeodes: false,
    disableForgeUpgrades: false,
    rewardLabel: 'Crystal production ×2 forever',
    reward: { crystalGlobalMult: 2 },
    unlockResonance: 5,
  },
  {
    id: 'cc_void_fast',
    name: 'Void Fast',
    description: 'Output at 10% and no geodes. The deep hunger.',
    goal: 1e6,
    productionMult: 0.1,
    tapMult: 0.1,
    disableGenerators: false,
    disableGeodes: true,
    disableForgeUpgrades: false,
    rewardLabel: 'Crystal production ×2.5 forever',
    reward: { crystalGlobalMult: 2.5 },
    unlockResonance: 8,
  },
];

export const CRYSTAL_CHALLENGES_BY_ID: Record<string, CrystalChallengeDef> = Object.fromEntries(
  CRYSTAL_CHALLENGES.map((c) => [c.id, c]),
);

export interface CrystalChallengeModifiers {
  productionMult: number;
  tapMult: number;
  disableGenerators: boolean;
  disableGeodes: boolean;
  disableForgeUpgrades: boolean;
}

const NEUTRAL: CrystalChallengeModifiers = {
  productionMult: 1,
  tapMult: 1,
  disableGenerators: false,
  disableGeodes: false,
  disableForgeUpgrades: false,
};

/** Active-run modifiers from the crystal challenge currently being attempted. */
export function crystalChallengeModifiers(active: string | null): CrystalChallengeModifiers {
  if (!active) return NEUTRAL;
  const def = CRYSTAL_CHALLENGES_BY_ID[active];
  if (!def) return NEUTRAL;
  return {
    productionMult: def.productionMult,
    tapMult: def.tapMult,
    disableGenerators: def.disableGenerators,
    disableGeodes: def.disableGeodes,
    disableForgeUpgrades: def.disableForgeUpgrades,
  };
}

export function geodesDisabled(active: string | null): boolean {
  return crystalChallengeModifiers(active).disableGeodes;
}

/** Permanent crystal multipliers from all completed crystal challenges. */
export function crystalChallengeRewardMult(completed: Record<string, true>): {
  globalMult: number;
  tapMult: number;
} {
  let globalMult = 1;
  let tapMult = 1;
  for (const id of Object.keys(completed)) {
    const r = CRYSTAL_CHALLENGES_BY_ID[id]?.reward;
    if (!r) continue;
    if (r.crystalGlobalMult) globalMult *= r.crystalGlobalMult;
    if (r.crystalTapMult) tapMult *= r.crystalTapMult;
  }
  return { globalMult, tapMult };
}

type CrystalPowerState = Pick<
  PersistedState,
  'resonance' | 'crystalUpgrades' | 'totalEons' | 'eonUpgrades' | 'achievements' | 'crystalChallengesCompleted'
>;

/**
 * Everything boosting crystal production that survives a Cascade — the same
 * permanent factors withCaches feeds into cachedCrystalCps, minus the
 * run-scoped Forge upgrades (wiped at challenge entry) and the active
 * challenge's own throttle.
 */
export function permanentCrystalPowerMultiplier(state: CrystalPowerState): number {
  return (
    crystalPowers(state.crystalUpgrades).globalMult *
    resonanceMult(state.resonance, RESONANCE_BONUS * resonancePowerMult(state.crystalUpgrades)) *
    eonMult(state.totalEons) *
    eonCrystalMult(state.eonUpgrades) *
    achievementBonus(state.achievements) *
    crystalChallengeRewardMult(state.crystalChallengesCompleted).globalMult
  );
}

/** The run goal scaled by permanent crystal power (never below the base). */
export function scaledCrystalChallengeGoal(def: CrystalChallengeDef, power: number): number {
  return Math.ceil(def.goal * Math.max(1, power));
}

/** Whether the active crystal challenge's goal has been met this run. */
export function crystalChallengeComplete(
  active: string | null,
  lifetimeCrystals: number,
  goal?: number,
): boolean {
  if (!active) return false;
  const def = CRYSTAL_CHALLENGES_BY_ID[active];
  if (!def) return false;
  const target = goal && goal > 0 ? goal : def.goal;
  return lifetimeCrystals >= target;
}

/** Crystal challenges visible at the given Resonance. */
export function unlockedCrystalChallenges(resonance: number): CrystalChallengeDef[] {
  return CRYSTAL_CHALLENGES.filter((c) => c.unlockResonance <= resonance);
}

/** The Resonance at which the next batch unlocks, or null if all are visible. */
export function nextCrystalChallengeUnlockAt(resonance: number): number | null {
  const next = CRYSTAL_CHALLENGES.find((c) => c.unlockResonance > resonance);
  return next ? next.unlockResonance : null;
}
