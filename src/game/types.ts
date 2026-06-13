export type GeneratorId =
  | 'drone'
  | 'excavator'
  | 'refinery'
  | 'hauler'
  | 'station'
  | 'harvester'
  | 'cracker'
  | 'dyson';

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
  darkMatter: number;
  prestigeCount: number;
  startedAt: number;
  /** Golden-comet frenzy buff: production multiplier active until this time. */
  frenzyUntil: number;
  frenzyMult: number;
}

export interface GameState extends PersistedState {
  lastTickAt: number;
  cachedCps: number;
  cachedTapValue: number;
}

export interface SaveFile {
  version: number;
  savedAt: number;
  state: PersistedState;
}
