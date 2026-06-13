import { GeneratorDef, GeneratorId, UpgradeDef } from './types';

export const TICK_MS = 100;
/** Single-tick deltas longer than this flow through the offline-earnings path. */
export const MAX_TICK_DELTA_MS = 2_000;
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const OFFLINE_EFFICIENCY = 1.0;
/** Resumes shorter than this skip the welcome-back modal. */
export const OFFLINE_MIN_MS = 5_000;

/** First Dark Matter is earned once a run's lifetime earnings reach this. */
export const PRESTIGE_BASE = 1e9;

/** A generator row is revealed once lifetime earnings reach this fraction of its base cost. */
export const REVEAL_FRACTION = 0.5;

/** Owning multiples of this count doubles a generator's output (x2, x4, ...). */
export const MILESTONE_EVERY = 25;

/** Golden comet event timing/rewards. */
export const COMET_FIRST_SPAWN_MS: [number, number] = [12_000, 25_000];
export const COMET_SPAWN_MS: [number, number] = [55_000, 110_000];
export const COMET_VISIBLE_MS = 9_000;
export const COMET_FRENZY_MULT = 7;
export const COMET_FRENZY_DURATION_MS = 30_000;
/** Windfall grants this many seconds of production, with a floor for new players. */
export const COMET_WINDFALL_SECONDS = 180;
export const COMET_WINDFALL_MIN = 25;

export const GENERATORS: GeneratorDef[] = [
  {
    id: 'drone',
    name: 'Mining Drone',
    description: 'A scrappy autonomous drone chipping away at the rock.',
    baseCost: 10,
    baseProd: 0.5,
    growth: 1.15,
    emoji: '🛸',
  },
  {
    id: 'excavator',
    name: 'Rock Excavator',
    description: 'Heavy treads, heavier appetite for regolith.',
    baseCost: 80,
    baseProd: 3,
    growth: 1.15,
    emoji: '🚜',
  },
  {
    id: 'refinery',
    name: 'Ore Refinery',
    description: 'Smelts raw ore into pure, sellable minerals.',
    baseCost: 750,
    baseProd: 15,
    growth: 1.15,
    emoji: '🏭',
  },
  {
    id: 'hauler',
    name: 'Cargo Hauler Fleet',
    description: 'Freighters running nonstop supply routes.',
    baseCost: 8_000,
    baseProd: 75,
    growth: 1.15,
    emoji: '🚀',
  },
  {
    id: 'station',
    name: 'Orbital Station',
    description: 'A permanent foothold in the asteroid belt.',
    baseCost: 90_000,
    baseProd: 400,
    growth: 1.15,
    emoji: '🛰️',
  },
  {
    id: 'harvester',
    name: 'Belt Harvester',
    description: 'Strip-mines entire asteroid clusters at once.',
    baseCost: 1e6,
    baseProd: 2_200,
    growth: 1.15,
    emoji: '🌌',
  },
  {
    id: 'cracker',
    name: 'Planet Cracker',
    description: 'Why mine an asteroid when you can split a moon?',
    baseCost: 15e6,
    baseProd: 12_000,
    growth: 1.15,
    emoji: '🪐',
  },
  {
    id: 'dyson',
    name: 'Dyson Swarm',
    description: 'Harnesses a star to power galaxy-scale extraction.',
    baseCost: 2.5e8,
    baseProd: 65_000,
    growth: 1.15,
    emoji: '☀️',
  },
];

export const GENERATORS_BY_ID: Record<GeneratorId, GeneratorDef> = Object.fromEntries(
  GENERATORS.map((g) => [g.id, g]),
) as Record<GeneratorId, GeneratorDef>;

const tapUpgrades: UpgradeDef[] = [
  {
    id: 'tap1',
    name: 'Reinforced Drill',
    description: 'Tap power x2',
    cost: 50,
    unlock: { kind: 'taps', n: 10 },
    effect: { kind: 'tapMult', x: 2 },
  },
  {
    id: 'tap2',
    name: 'Plasma Cutter',
    description: 'Tap power x2',
    cost: 1_000,
    unlock: { kind: 'taps', n: 75 },
    effect: { kind: 'tapMult', x: 2 },
  },
  {
    id: 'tap3',
    name: 'Laser Array',
    description: 'Tap power x2',
    cost: 25_000,
    unlock: { kind: 'taps', n: 200 },
    effect: { kind: 'tapMult', x: 2 },
  },
  {
    id: 'tap4',
    name: 'Quantum Pick',
    description: 'Taps also yield +2% of your minerals/sec',
    cost: 150_000,
    unlock: { kind: 'taps', n: 300 },
    effect: { kind: 'tapCpsPercent', pct: 0.02 },
  },
  {
    id: 'tap5',
    name: 'Singularity Tip',
    description: 'Taps also yield +5% of your minerals/sec',
    cost: 5e8,
    unlock: { kind: 'taps', n: 600 },
    effect: { kind: 'tapCpsPercent', pct: 0.05 },
  },
];

const GEN_UPGRADE_NAMES: Record<GeneratorId, [string, string]> = {
  drone: ['Drone Swarm AI', 'Self-Replicating Drones'],
  excavator: ['Diamond Treads', 'Fusion Excavators'],
  refinery: ['Refinery Catalysts', 'Zero-G Smelting'],
  hauler: ['Ion Engines', 'Wormhole Shipping Lanes'],
  station: ['Station Expansion', 'Artificial Gravity Mines'],
  harvester: ['Magnetic Scoops', 'Antimatter Harvesters'],
  cracker: ['Tectonic Charges', 'Core Extraction Rigs'],
  dyson: ['Mirror Alignment', 'Stellar Lifting'],
};

const generatorUpgrades: UpgradeDef[] = GENERATORS.flatMap((g) => {
  const [name1, name2] = GEN_UPGRADE_NAMES[g.id];
  return [
    {
      id: `${g.id}_x2_a`,
      name: name1,
      description: `${g.name} output x2`,
      cost: 10 * g.baseCost,
      unlock: { kind: 'genCount', genId: g.id, n: 10 },
      effect: { kind: 'genMult', genId: g.id, x: 2 },
    },
    {
      id: `${g.id}_x2_b`,
      name: name2,
      description: `${g.name} output x2`,
      cost: 100 * g.baseCost,
      unlock: { kind: 'genCount', genId: g.id, n: 25 },
      effect: { kind: 'genMult', genId: g.id, x: 2 },
    },
  ] satisfies UpgradeDef[];
});

const globalUpgrades: UpgradeDef[] = [
  {
    id: 'global1',
    name: 'Mineral Market',
    description: 'All production x1.5',
    cost: 1e7,
    unlock: { kind: 'lifetime', amount: 5e6 },
    effect: { kind: 'globalMult', x: 1.5 },
  },
  {
    id: 'global2',
    name: 'Galactic Logistics',
    description: 'All production x2',
    cost: 1e10,
    unlock: { kind: 'lifetime', amount: 5e9 },
    effect: { kind: 'globalMult', x: 2 },
  },
  {
    id: 'global3',
    name: 'Quantum Markets',
    description: 'All production x3',
    cost: 1e13,
    unlock: { kind: 'lifetime', amount: 1e12 },
    effect: { kind: 'globalMult', x: 3 },
  },
  {
    id: 'global4',
    name: 'Galactic Monopoly',
    description: 'All production x4',
    cost: 1e16,
    unlock: { kind: 'lifetime', amount: 1e15 },
    effect: { kind: 'globalMult', x: 4 },
  },
];

export const UPGRADES: UpgradeDef[] = [...tapUpgrades, ...generatorUpgrades, ...globalUpgrades];

export const UPGRADES_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);
