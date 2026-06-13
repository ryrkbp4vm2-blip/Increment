/** Prestige Challenges — constrained runs that grant permanent rewards. */

export interface ChallengeReward {
  globalMult?: number;
  tapMult?: number;
}

export interface ChallengeDef {
  id: string;
  name: string;
  description: string;
  /** Lifetime minerals (this run) needed to complete the challenge. */
  goal: number;
  /** Production multiplier applied while the challenge is active. */
  productionMult: number;
  /** Tap-power multiplier applied while the challenge is active. */
  tapMult: number;
  disableGenerators: boolean;
  disableComets: boolean;
  disableUpgrades: boolean;
  rewardLabel: string;
  reward: ChallengeReward;
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'asceticism',
    name: 'Asceticism',
    description: 'Generators are disabled — mine the whole run by hand.',
    goal: 1e6,
    productionMult: 1,
    tapMult: 1,
    disableGenerators: true,
    disableComets: false,
    disableUpgrades: false,
    rewardLabel: 'Tap power ×4 forever',
    reward: { tapMult: 4 },
  },
  {
    id: 'famine',
    name: 'Famine',
    description: 'All production runs at 20% — squeeze blood from the belt.',
    goal: 1e8,
    productionMult: 0.2,
    tapMult: 0.2,
    disableGenerators: false,
    disableComets: false,
    disableUpgrades: false,
    rewardLabel: 'All production ×2 forever',
    reward: { globalMult: 2 },
  },
  {
    id: 'solitude',
    name: 'Solitude',
    description: 'No comets, no cosmic events — just you and the rock.',
    goal: 5e7,
    productionMult: 1,
    tapMult: 1,
    disableGenerators: false,
    disableComets: true,
    disableUpgrades: false,
    rewardLabel: 'All production ×1.75 forever',
    reward: { globalMult: 1.75 },
  },
  {
    id: 'idle_doctrine',
    name: 'Idle Doctrine',
    description: 'Tapping does nothing — win on passive income alone.',
    goal: 1e8,
    productionMult: 1,
    tapMult: 0,
    disableGenerators: false,
    disableComets: false,
    disableUpgrades: false,
    rewardLabel: 'All production ×1.75 forever',
    reward: { globalMult: 1.75 },
  },
  {
    id: 'purity',
    name: 'Purity',
    description: 'Mineral upgrades are forbidden — raw generators only.',
    goal: 5e7,
    productionMult: 1,
    tapMult: 1,
    disableGenerators: false,
    disableComets: false,
    disableUpgrades: true,
    rewardLabel: 'All production ×1.5 forever',
    reward: { globalMult: 1.5 },
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    description: 'Production at 10% and no comets. For masochists.',
    goal: 1e8,
    productionMult: 0.1,
    tapMult: 0.1,
    disableGenerators: false,
    disableComets: true,
    disableUpgrades: false,
    rewardLabel: 'All production ×2.5 forever',
    reward: { globalMult: 2.5 },
  },
];

export const CHALLENGES_BY_ID: Record<string, ChallengeDef> = Object.fromEntries(
  CHALLENGES.map((c) => [c.id, c]),
);

export interface ChallengeModifiers {
  productionMult: number;
  tapMult: number;
  disableGenerators: boolean;
  disableComets: boolean;
  disableUpgrades: boolean;
}

const NEUTRAL: ChallengeModifiers = {
  productionMult: 1,
  tapMult: 1,
  disableGenerators: false,
  disableComets: false,
  disableUpgrades: false,
};

/** Active-run modifiers from the challenge currently being attempted. */
export function challengeModifiers(activeChallenge: string | null): ChallengeModifiers {
  if (!activeChallenge) return NEUTRAL;
  const def = CHALLENGES_BY_ID[activeChallenge];
  if (!def) return NEUTRAL;
  return {
    productionMult: def.productionMult,
    tapMult: def.tapMult,
    disableGenerators: def.disableGenerators,
    disableComets: def.disableComets,
    disableUpgrades: def.disableUpgrades,
  };
}

export function cometsDisabled(activeChallenge: string | null): boolean {
  return challengeModifiers(activeChallenge).disableComets;
}

/** Permanent multipliers from all completed challenges. */
export function challengeRewardMult(completed: Record<string, true>): {
  globalMult: number;
  tapMult: number;
} {
  let globalMult = 1;
  let tapMult = 1;
  for (const id of Object.keys(completed)) {
    const r = CHALLENGES_BY_ID[id]?.reward;
    if (!r) continue;
    if (r.globalMult) globalMult *= r.globalMult;
    if (r.tapMult) tapMult *= r.tapMult;
  }
  return { globalMult, tapMult };
}

/** Whether the active challenge's goal has been met this run. */
export function challengeComplete(activeChallenge: string | null, lifetimeThisRun: number): boolean {
  if (!activeChallenge) return false;
  const def = CHALLENGES_BY_ID[activeChallenge];
  return !!def && lifetimeThisRun >= def.goal;
}
