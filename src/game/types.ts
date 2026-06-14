export type GeneratorId =
  | 'drone'
  | 'excavator'
  | 'refinery'
  | 'hauler'
  | 'station'
  | 'harvester'
  | 'cracker'
  | 'dyson'
  | 'forge'
  | 'core';

export interface GeneratorDef {
  id: GeneratorId;
  name: string;
  description: string;
  baseCost: number;
  baseProd: number;
  growth: number;
  emoji: string;
}

export type UnlockCondition =
  | { kind: 'genCount'; genId: GeneratorId; n: number }
  | { kind: 'lifetime'; amount: number }
  | { kind: 'taps'; n: number };

export type UpgradeEffect =
  | { kind: 'tapMult'; x: number }
  | { kind: 'genMult'; genId: GeneratorId; x: number }
  | { kind: 'globalMult'; x: number }
  | { kind: 'tapCpsPercent'; pct: number };

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlock: UnlockCondition;
  effect: UpgradeEffect;
}

export type BuyQty = 1 | 10 | 'max';

/** Fields that persist across app launches (everything except caches). */
export interface PersistedState {
  minerals: number;
  lifetimeThisRun: number;
  lifetimeAllTime: number;
  totalTaps: number;
  generators: Record<GeneratorId, number>;
  upgrades: Record<string, true>;
  /** Spendable Dark Matter balance. */
  darkMatter: number;
  /** Lifetime Dark Matter ever earned (for stats). */
  totalDarkMatter: number;
  /** Purchased Dark Matter shop levels (id -> level). Survives prestige. */
  dmUpgrades: Record<string, number>;
  prestigeCount: number;
  startedAt: number;
  /** Golden-comet frenzy buff: production multiplier active until this time. */
  frenzyUntil: number;
  frenzyMult: number;
  /** Belt progression: which asteroid we're on and damage dealt to it. */
  asteroidIndex: number;
  asteroidDamage: number;
  /** Permanent artifact collection (survives prestige). */
  artifacts: Record<string, true>;
  /** Currently running fleet expedition, if any. */
  expedition: {
    defId: string;
    startedAt: number;
    endsAt: number;
    loot: number;
  } | null;
  /** Completed achievement ids (permanent, survive prestige). */
  achievements: Record<string, true>;
  /** All-time counters that feed achievements (survive prestige). */
  asteroidsShattered: number;
  cometsCaught: number;
  expeditionsCompleted: number;
  /** Research currency and unlocked tech-tree nodes (survive prestige). */
  researchPoints: number;
  totalResearch: number;
  research: Record<string, true>;
  /** Ascension layer: permanent cores, count, and DM banked toward the next. */
  singularityCores: number;
  totalSingularityCores: number;
  ascensionCount: number;
  dmSinceAscension: number;
  /** One-time Singularity perks bought with cores (survive everything). */
  singularityPerks: Record<string, true>;
  /** Prestige challenge currently being attempted, if any. */
  activeChallenge: string | null;
  /** Completed challenge ids (permanent rewards, survive everything). */
  challengesCompleted: Record<string, true>;
  /** Daily bonus: last claim time (ms epoch) and consecutive-day streak. */
  lastDailyAt: number;
  dailyStreak: number;
}

export interface GameState extends PersistedState {
  lastTickAt: number;
  cachedCps: number;
  cachedTapValue: number;
  /** Transient queue of just-unlocked achievement ids for toasts. */
  newAchievements: string[];
  /** Transient Drill Heat combo (0..1) and when it last changed. Not saved. */
  tapHeat: number;
  lastTapAt: number;
}

export interface SaveFile {
  version: number;
  savedAt: number;
  state: PersistedState;
}
