import { GeneratorId } from './types';

export type ResearchBranch = 'extraction' | 'logistics' | 'cosmic' | 'singularity';

export type ResearchEffect =
  | { kind: 'globalMult'; x: number }
  | { kind: 'tapMult'; x: number }
  | { kind: 'genMult'; genId: GeneratorId; x: number }
  | { kind: 'cometRewardMult'; x: number }
  | { kind: 'expeditionLootMult'; x: number }
  | { kind: 'rpGainMult'; x: number };

export interface ResearchNodeDef {
  id: string;
  name: string;
  description: string;
  branch: ResearchBranch;
  cost: number;
  requires: string[];
  effect: ResearchEffect;
}

export const RESEARCH_BRANCHES: { id: ResearchBranch; name: string }[] = [
  { id: 'extraction', name: 'Extraction' },
  { id: 'logistics', name: 'Logistics' },
  { id: 'cosmic', name: 'Cosmic' },
  { id: 'singularity', name: 'Singularity' },
];

export const RESEARCH_NODES: ResearchNodeDef[] = [
  // Extraction — raw production
  { id: 'ex1', name: 'Deep Core Drilling', description: 'All production ×1.25', branch: 'extraction', cost: 3, requires: [], effect: { kind: 'globalMult', x: 1.25 } },
  { id: 'ex2', name: 'Pressure Refinement', description: 'Ore Refineries ×2', branch: 'extraction', cost: 8, requires: ['ex1'], effect: { kind: 'genMult', genId: 'refinery', x: 2 } },
  { id: 'ex3', name: 'Automated Foremen', description: 'All production ×1.5', branch: 'extraction', cost: 20, requires: ['ex2'], effect: { kind: 'globalMult', x: 1.5 } },
  { id: 'ex4', name: 'Fusion Furnaces', description: 'All production ×2', branch: 'extraction', cost: 60, requires: ['ex3'], effect: { kind: 'globalMult', x: 2 } },

  // Logistics — taps & expeditions
  { id: 'lo1', name: 'Ergonomic Drills', description: 'Tap power ×3', branch: 'logistics', cost: 3, requires: [], effect: { kind: 'tapMult', x: 3 } },
  { id: 'lo2', name: 'Hauler Networks', description: 'Cargo Haulers ×2', branch: 'logistics', cost: 10, requires: ['lo1'], effect: { kind: 'genMult', genId: 'hauler', x: 2 } },
  { id: 'lo3', name: 'Wormhole Routes', description: 'Expedition loot ×2', branch: 'logistics', cost: 25, requires: ['lo2'], effect: { kind: 'expeditionLootMult', x: 2 } },
  { id: 'lo4', name: 'Logistics AI', description: 'All production ×2', branch: 'logistics', cost: 70, requires: ['lo3'], effect: { kind: 'globalMult', x: 2 } },

  // Cosmic — comets, belt & research
  { id: 'co1', name: 'Comet Tracking', description: 'Comet rewards ×2', branch: 'cosmic', cost: 4, requires: [], effect: { kind: 'cometRewardMult', x: 2 } },
  { id: 'co2', name: 'Belt Cartography', description: 'Research Points ×1.5', branch: 'cosmic', cost: 12, requires: ['co1'], effect: { kind: 'rpGainMult', x: 1.5 } },
  { id: 'co3', name: 'Resonance Mapping', description: 'All production ×1.5', branch: 'cosmic', cost: 30, requires: ['co2'], effect: { kind: 'globalMult', x: 1.5 } },
  { id: 'co4', name: 'Gravitational Lensing', description: 'Comet rewards ×2', branch: 'cosmic', cost: 80, requires: ['co3'], effect: { kind: 'cometRewardMult', x: 2 } },

  // Singularity — capstones requiring cross-branch progress
  { id: 'si1', name: 'Quantum Computing', description: 'Research Points ×2', branch: 'singularity', cost: 50, requires: ['ex3', 'lo3'], effect: { kind: 'rpGainMult', x: 2 } },
  { id: 'si2', name: 'Singularity Reactor', description: 'All production ×3', branch: 'singularity', cost: 150, requires: ['si1', 'co3'], effect: { kind: 'globalMult', x: 3 } },
  { id: 'si3', name: 'Cosmic Ascendancy', description: 'All production ×5 and tap power ×5', branch: 'singularity', cost: 400, requires: ['si2', 'ex4', 'lo4', 'co4'], effect: { kind: 'globalMult', x: 5 } },

  // Tier II — deeper nodes for the long game
  { id: 'ex5', name: 'Antimatter Excavation', description: 'All production ×3', branch: 'extraction', cost: 200, requires: ['ex4'], effect: { kind: 'globalMult', x: 3 } },
  { id: 'ex6', name: 'Crustbuster Rigs', description: 'Planet Crackers ×3', branch: 'extraction', cost: 500, requires: ['ex5'], effect: { kind: 'genMult', genId: 'cracker', x: 3 } },
  { id: 'lo5', name: 'Dyson Logistics', description: 'Dyson Swarms ×3', branch: 'logistics', cost: 220, requires: ['lo4'], effect: { kind: 'genMult', genId: 'dyson', x: 3 } },
  { id: 'lo6', name: 'Instant Couriers', description: 'Expedition loot ×3', branch: 'logistics', cost: 550, requires: ['lo5'], effect: { kind: 'expeditionLootMult', x: 3 } },
  { id: 'co5', name: 'Dark Comets', description: 'Comet rewards ×3', branch: 'cosmic', cost: 240, requires: ['co4'], effect: { kind: 'cometRewardMult', x: 3 } },
  { id: 'co6', name: 'Stellar Cartography', description: 'Research Points ×2', branch: 'cosmic', cost: 600, requires: ['co5'], effect: { kind: 'rpGainMult', x: 2 } },
  { id: 'si4', name: 'Omega Directive', description: 'All production ×10', branch: 'singularity', cost: 2000, requires: ['si3', 'ex6', 'lo6', 'co6'], effect: { kind: 'globalMult', x: 10 } },
];

export const RESEARCH_BY_ID: Record<string, ResearchNodeDef> = Object.fromEntries(
  RESEARCH_NODES.map((n) => [n.id, n]),
);

/** A node can be bought once all of its prerequisites are owned. */
export function isResearchUnlocked(node: ResearchNodeDef, owned: Record<string, true>): boolean {
  return node.requires.every((r) => owned[r]);
}

export interface ResearchPowers {
  globalMult: number;
  tapMult: number;
  genMult: Partial<Record<GeneratorId, number>>;
  cometRewardMult: number;
  expeditionLootMult: number;
  rpGainMult: number;
}

export function researchPowers(owned: Record<string, true>): ResearchPowers {
  const p: ResearchPowers = {
    globalMult: 1,
    tapMult: 1,
    genMult: {},
    cometRewardMult: 1,
    expeditionLootMult: 1,
    rpGainMult: 1,
  };
  for (const id of Object.keys(owned)) {
    const effect = RESEARCH_BY_ID[id]?.effect;
    if (!effect) continue;
    switch (effect.kind) {
      case 'globalMult':
        p.globalMult *= effect.x;
        break;
      case 'tapMult':
        p.tapMult *= effect.x;
        break;
      case 'genMult':
        p.genMult[effect.genId] = (p.genMult[effect.genId] ?? 1) * effect.x;
        break;
      case 'cometRewardMult':
        p.cometRewardMult *= effect.x;
        break;
      case 'expeditionLootMult':
        p.expeditionLootMult *= effect.x;
        break;
      case 'rpGainMult':
        p.rpGainMult *= effect.x;
        break;
    }
  }
  // The si3 capstone also grants its tap bonus.
  if (owned.si3) p.tapMult *= 5;
  return p;
}
