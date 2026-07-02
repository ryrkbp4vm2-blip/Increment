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
  /** Leveled Singularity Upgrades bought with cores (survive everything). */
  coreUpgrades: Record<string, number>;
  /** Prestige challenge currently being attempted, if any. */
  activeChallenge: string | null;
  /** Run goal snapshot for the active challenge (scaled by permanent power at entry). */
  activeChallengeGoal: number;
  /** Completed challenge ids (permanent rewards, survive everything). */
  challengesCompleted: Record<string, true>;
  /** Daily bonus: last claim time (ms epoch) and consecutive-day streak. */
  lastDailyAt: number;
  dailyStreak: number;
  /** Sector (zone) layer: current sector and ascensions done since last warp. */
  sector: number;
  ascensionsSinceWarp: number;
  /** Transcendence layer: Crystals (spendable + lifetime), count, gate progress. */
  crystals: number;
  totalCrystals: number;
  transcendCount: number;
  ascensionsSinceTranscend: number;
  /** Leveled Crystal Matrix upgrades bought with Crystals (survive everything). */
  crystalUpgrades: Record<string, number>;
  /** Crystal Game: auto-generators bought with Crystals (reset each Resonance). */
  crystalGenerators: Record<string, number>;
  /** Crystal Game: which formation we're cracking (resets each Resonance). */
  crystalFormationIndex: number;
  /** Crystal Game: damage dealt to the current formation (resets each Resonance). */
  crystalFormationDamage: number;
  /** Resonance Cascade: permanent levels (permanent crystal-production multiplier). */
  resonance: number;
  /** Crystals earned in the current crystal run (resets each Resonance). */
  lifetimeCrystals: number;
  /** Crystal Game: run-scoped Forge upgrades bought with Crystals (reset each Resonance). */
  crystalRunUpgrades: Record<string, true>;
  /** Running total of crystal formations shattered across all runs (never resets). */
  crystalFormationsShattered: number;
  /** Whether Resonance Cascade fires automatically when the gate is met. */
  autoResonate: boolean;
  /** Whether crystal generators are auto-bought each tick (unlocked at a Resonance gate). */
  autoForge: boolean;
  /** Whether mineral shop upgrades are auto-bought (unlocked after 2 ascensions). */
  autoUpgrade: boolean;
  /** Whether crystal Forge upgrades are auto-bought (unlocked at Resonance 2). */
  autoCrystalUpgrade: boolean;
  /** Attunement: the permanent Crystal-Matrix currency, earned only by Cascading. */
  attunement: number;
  /** Attunement earned all-time (for stats; never spent down). */
  totalAttunement: number;
  /** Attunement earned since the last Convergence (the Convergence gate; resets on Converge). */
  attunementSinceConverge: number;
  /** Eons (∞): the Convergence meta-currency, above the Crystal Matrix. */
  eons: number;
  /** Eons earned all-time (drives the permanent eonMult; never spent down). */
  totalEons: number;
  /** Number of Convergences performed. */
  convergenceCount: number;
  /** Leveled Convergence-tree upgrades bought with Eons (survive every Convergence). */
  eonUpgrades: Record<string, number>;
  /** Remembered buy-quantity preference for generator shops (×1 / ×10 / Max). */
  buyQty: BuyQty;
  /** Whether local reminder notifications are scheduled when backgrounding. */
  notificationsEnabled: boolean;
}

export interface GameState extends PersistedState {
  lastTickAt: number;
  cachedCps: number;
  cachedTapValue: number;
  /** Crystal game production caches (derived from crystalGenerators + matrix). */
  cachedCrystalCps: number;
  cachedCrystalTapValue: number;
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
