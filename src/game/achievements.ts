import { GeneratorId, PersistedState } from './types';

export type MetricKey =
  | 'lifetime'
  | 'taps'
  | 'prestige'
  | 'ascension'
  | 'totalDM'
  | 'shattered'
  | 'comets'
  | 'expeditions'
  | 'artifacts'
  | 'genTotal'
  | 'gen';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** Permanent global production bonus granted on completion (e.g. 0.02 = +2%). */
  bonusPct: number;
  metric: MetricKey;
  threshold: number;
  genId?: GeneratorId;
}

export interface AchievementMetrics {
  lifetime: number;
  taps: number;
  prestige: number;
  ascension: number;
  totalDM: number;
  shattered: number;
  comets: number;
  expeditions: number;
  artifacts: number;
  genTotal: number;
  gen: Record<GeneratorId, number>;
}

const BIG = 0.05;
const STD = 0.02;

export const ACHIEVEMENTS: AchievementDef[] = [
  // Minerals (all-time)
  { id: 'm_1k', name: 'First Riches', description: 'Earn 1K minerals all-time', bonusPct: STD, metric: 'lifetime', threshold: 1e3 },
  { id: 'm_1m', name: 'Mineral Magnate', description: 'Earn 1M minerals all-time', bonusPct: STD, metric: 'lifetime', threshold: 1e6 },
  { id: 'm_1b', name: 'Billionaire Belt', description: 'Earn 1B minerals all-time', bonusPct: STD, metric: 'lifetime', threshold: 1e9 },
  { id: 'm_1t', name: 'Trillion Tycoon', description: 'Earn 1T minerals all-time', bonusPct: BIG, metric: 'lifetime', threshold: 1e12 },
  { id: 'm_1aa', name: 'Cosmic Capitalist', description: 'Earn 1aa minerals all-time', bonusPct: BIG, metric: 'lifetime', threshold: 1e15 },
  // Taps
  { id: 't_100', name: 'Getting Started', description: 'Tap 100 times', bonusPct: STD, metric: 'taps', threshold: 100 },
  { id: 't_1k', name: 'Tap Happy', description: 'Tap 1,000 times', bonusPct: STD, metric: 'taps', threshold: 1000 },
  { id: 't_10k', name: 'Drill Sergeant', description: 'Tap 10,000 times', bonusPct: BIG, metric: 'taps', threshold: 10000 },
  // Generators
  { id: 'g_drone25', name: 'Drone Swarm', description: 'Own 25 Mining Drones', bonusPct: STD, metric: 'gen', threshold: 25, genId: 'drone' },
  { id: 'g_drone100', name: 'Hive Mind', description: 'Own 100 Mining Drones', bonusPct: BIG, metric: 'gen', threshold: 100, genId: 'drone' },
  { id: 'g_station10', name: 'Orbital Power', description: 'Own 10 Orbital Stations', bonusPct: STD, metric: 'gen', threshold: 10, genId: 'station' },
  { id: 'g_dyson1', name: 'Star Harvester', description: 'Build a Dyson Swarm', bonusPct: BIG, metric: 'gen', threshold: 1, genId: 'dyson' },
  { id: 'g_total100', name: 'Industrialist', description: 'Own 100 generators total', bonusPct: STD, metric: 'genTotal', threshold: 100 },
  { id: 'g_total500', name: 'Megacorp', description: 'Own 500 generators total', bonusPct: BIG, metric: 'genTotal', threshold: 500 },
  // Prestige
  { id: 'p_1', name: 'Reborn', description: 'Collapse for the first time', bonusPct: STD, metric: 'prestige', threshold: 1 },
  { id: 'p_5', name: 'Serial Collapser', description: 'Collapse 5 times', bonusPct: STD, metric: 'prestige', threshold: 5 },
  { id: 'p_25', name: 'Phoenix', description: 'Collapse 25 times', bonusPct: BIG, metric: 'prestige', threshold: 25 },
  // Dark Matter
  { id: 'dm_10', name: 'Dark Adept', description: 'Earn 10 Dark Matter all-time', bonusPct: STD, metric: 'totalDM', threshold: 10 },
  { id: 'dm_100', name: 'Void Master', description: 'Earn 100 Dark Matter all-time', bonusPct: BIG, metric: 'totalDM', threshold: 100 },
  // Asteroids
  { id: 's_5', name: 'Rockbreaker', description: 'Shatter 5 asteroids', bonusPct: STD, metric: 'shattered', threshold: 5 },
  { id: 's_25', name: 'Belt Crusher', description: 'Shatter 25 asteroids', bonusPct: STD, metric: 'shattered', threshold: 25 },
  { id: 's_100', name: 'Planet Smasher', description: 'Shatter 100 asteroids', bonusPct: BIG, metric: 'shattered', threshold: 100 },
  // Comets
  { id: 'c_1', name: 'Stargazer', description: 'Catch a golden comet', bonusPct: STD, metric: 'comets', threshold: 1 },
  { id: 'c_25', name: 'Comet Chaser', description: 'Catch 25 comets', bonusPct: STD, metric: 'comets', threshold: 25 },
  { id: 'c_100', name: 'Tail Catcher', description: 'Catch 100 comets', bonusPct: BIG, metric: 'comets', threshold: 100 },
  // Expeditions
  { id: 'e_1', name: 'Explorer', description: 'Complete an expedition', bonusPct: STD, metric: 'expeditions', threshold: 1 },
  { id: 'e_10', name: 'Fleet Admiral', description: 'Complete 10 expeditions', bonusPct: STD, metric: 'expeditions', threshold: 10 },
  // Artifacts
  { id: 'a_1', name: 'Collector', description: 'Recover an artifact', bonusPct: STD, metric: 'artifacts', threshold: 1 },
  { id: 'a_6', name: 'Curator', description: 'Recover 6 artifacts', bonusPct: STD, metric: 'artifacts', threshold: 6 },
  { id: 'a_12', name: 'Master Curator', description: 'Recover 12 artifacts', bonusPct: STD, metric: 'artifacts', threshold: 12 },
  { id: 'a_18', name: 'Completionist', description: 'Recover all 18 artifacts', bonusPct: BIG, metric: 'artifacts', threshold: 18 },

  // Deep milestones
  { id: 'm_1qa', name: 'Galactic Mogul', description: 'Earn 1qa minerals all-time', bonusPct: BIG, metric: 'lifetime', threshold: 1e18 },
  { id: 'm_1qi', name: 'Universal Magnate', description: 'Earn 1Qi minerals all-time', bonusPct: BIG, metric: 'lifetime', threshold: 1e21 },
  { id: 't_50k', name: 'Jackhammer', description: 'Tap 50,000 times', bonusPct: BIG, metric: 'taps', threshold: 50000 },
  { id: 'g_cracker1', name: 'Moonbreaker', description: 'Build a Planet Cracker', bonusPct: STD, metric: 'gen', threshold: 1, genId: 'cracker' },
  { id: 'g_total1000', name: 'Galactic Empire', description: 'Own 1,000 generators total', bonusPct: BIG, metric: 'genTotal', threshold: 1000 },
  { id: 'p_50', name: 'Eternal Return', description: 'Collapse 50 times', bonusPct: BIG, metric: 'prestige', threshold: 50 },
  { id: 'asc_1', name: 'Transcendent', description: 'Ascend for the first time', bonusPct: BIG, metric: 'ascension', threshold: 1 },
  { id: 'asc_5', name: 'Beyond Infinity', description: 'Ascend 5 times', bonusPct: BIG, metric: 'ascension', threshold: 5 },
  { id: 's_500', name: 'World Ender', description: 'Shatter 500 asteroids', bonusPct: BIG, metric: 'shattered', threshold: 500 },
  { id: 'dm_1000', name: 'Singularity Touched', description: 'Earn 1,000 Dark Matter all-time', bonusPct: BIG, metric: 'totalDM', threshold: 1000 },
];

export const ACHIEVEMENTS_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

export function computeMetrics(
  s: Pick<
    PersistedState,
    | 'lifetimeAllTime'
    | 'totalTaps'
    | 'prestigeCount'
    | 'ascensionCount'
    | 'totalDarkMatter'
    | 'asteroidsShattered'
    | 'cometsCaught'
    | 'expeditionsCompleted'
    | 'artifacts'
    | 'generators'
  >,
): AchievementMetrics {
  const gen = s.generators;
  const genTotal = Object.values(gen).reduce((a, b) => a + b, 0);
  return {
    lifetime: s.lifetimeAllTime,
    taps: s.totalTaps,
    prestige: s.prestigeCount,
    ascension: s.ascensionCount,
    totalDM: s.totalDarkMatter,
    shattered: s.asteroidsShattered,
    comets: s.cometsCaught,
    expeditions: s.expeditionsCompleted,
    artifacts: Object.keys(s.artifacts).length,
    genTotal,
    gen,
  };
}

export function metricValue(def: AchievementDef, m: AchievementMetrics): number {
  if (def.metric === 'gen') return m.gen[def.genId!] ?? 0;
  return m[def.metric];
}

export function isMet(def: AchievementDef, m: AchievementMetrics): boolean {
  return metricValue(def, m) >= def.threshold;
}

/** Ids that are met but not yet in the completed set. */
export function newlyCompleted(
  completed: Record<string, true>,
  m: AchievementMetrics,
): string[] {
  const out: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (!completed[def.id] && isMet(def, m)) out.push(def.id);
  }
  return out;
}

/** Permanent production multiplier from all completed achievements. */
export function achievementBonus(completed: Record<string, true>): number {
  let bonus = 0;
  for (const id of Object.keys(completed)) {
    bonus += ACHIEVEMENTS_BY_ID[id]?.bonusPct ?? 0;
  }
  return 1 + bonus;
}
