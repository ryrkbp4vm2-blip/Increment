import { GeneratorDef, GeneratorId, UpgradeDef } from './types';

export const TICK_MS = 100;
/** Single-tick deltas longer than this flow through the offline-earnings path. */
export const MAX_TICK_DELTA_MS = 2_000;
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const OFFLINE_EFFICIENCY = 1.0;
/** Resumes shorter than this skip the welcome-back modal. */
export const OFFLINE_MIN_MS = 5_000;

export const PRESTIGE_DIVISOR = 1e12;
export const DARK_MATTER_BONUS = 0.02;

/** A generator row is revealed once lifetime earnings reach this fraction of its base cost. */
export const REVEAL_FRACTION = 0.5;

export const GENERATORS: GeneratorDef[] = [
  {
    id: 'drone',
    name: 'Mining Drone',
    description: 'A scrappy autonomous drone chipping away at the rock.',
    baseCost: 15,
    baseProd: 0.1,
    growth: 1.15,
    emoji: '🛸',
  },
  {
    id: 'excavator',
    name: 'Rock Excavator',
    description: 'Heavy treads, heavier appetite for regolith.',
    baseCost: 100,
    baseProd: 1,
    growth: 1.15,
    emoji: '🚜',
  },
  {
    id: 'refinery',
    name: 'Ore Refinery',
    description: 'Smelts raw ore into pure, sellable minerals.',
    baseCost: 1_100,
    baseProd: 8,
    growth: 1.15,
    emoji: '🏭',
  },
  {
    id: 'hauler',
    name: 'Cargo Hauler Fleet',
    description: 'Freighters running nonstop supply routes.',
    baseCost: 12_000,
    baseProd: 47,
    growth: 1.15,
    emoji: '🚀',
  },
  {
    id: 'station',
    name: 'Orbital Station',
    description: 'A permanent foothold in the asteroid belt.',
    baseCost: 130_000,
    baseProd: 260,
    growth: 1.15,
    emoji: '🛰️',
  },
  {
    id: 'harvester',
    name: 'Belt Harvester',
    description: 'Strip-mines entire asteroid clusters at once.',
    baseCost: 1.4e6,
    baseProd: 1_400,
    growth: 1.15,
    emoji: '🌌',
  },
  {
    id: 'cracker',
    name: 'Planet Cracker',
    description: 'Why mine an asteroid when you can split a moon?',
    baseCost: 20e6,
    baseProd: 7_800,
    growth: 1.15,
    emoji: '🪐',
  },
  {
    id: 'dyson',
    name: 'Dyson Swarm',
    description: 'Harnesses a star to power galaxy-scale extraction.',
    baseCost: 3.3e8,
    baseProd: 44_000,
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
    cost: 100,
    unlock: { kind: 'taps', n: 25 },
    effect: { kind: 'tapMult', x: 2 },
  },
  {
    id: 'tap2',
    name: 'Plasma Cutter',
    description: 'Tap power x2',
    cost: 2_500,
    unlock: { kind: 'taps', n: 100 },
    effect: { kind: 'tapMult', x: 2 },
  },
  {
    id: 'tap3',
    name: 'Laser Array',
    description: 'Tap power x2',
    cost: 50_000,
    unlock: { kind: 'taps', n: 250 },
    effect: { kind: 'tapMult', x: 2 },
  },
  {
    id: 'tap4',
    name: 'Quantum Pick',
    description: 'Taps also yield +1% of your minerals/sec',
    cost: 5e6,
    unlock: { kind: 'taps', n: 500 },
    effect: { kind: 'tapCpsPercent', pct: 0.01 },
  },
  {
    id: 'tap5',
    name: 'Singularity Tip',
    description: 'Taps also yield +4% of your minerals/sec',
    cost: 1e9,
    unlock: { kind: 'taps', n: 1000 },
    effect: { kind: 'tapCpsPercent', pct: 0.04 },
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
];

export const UPGRADES: UpgradeDef[] = [...tapUpgrades, ...generatorUpgrades, ...globalUpgrades];

export const UPGRADES_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);
