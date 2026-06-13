import { GeneratorId } from './types';

export type ArtifactEffect =
  | { kind: 'globalMult'; x: number }
  | { kind: 'tapMult'; x: number }
  | { kind: 'genMult'; genId: GeneratorId; x: number }
  | { kind: 'cometMult'; x: number }
  | { kind: 'frenzyExtraMs'; ms: number }
  | { kind: 'offlineCapBonusMs'; ms: number }
  | { kind: 'expeditionLootMult'; x: number }
  | { kind: 'expeditionSpeedMult'; x: number }
  | { kind: 'expeditionFuelMult'; x: number }
  | { kind: 'dmBonusMult'; x: number };

export interface ArtifactDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  effect: ArtifactEffect;
}

export const ARTIFACTS: ArtifactDef[] = [
  {
    id: 'pulsar_shard',
    name: 'Pulsar Shard',
    emoji: '✨',
    description: 'All production ×1.10',
    effect: { kind: 'globalMult', x: 1.1 },
  },
  {
    id: 'graviton_lens',
    name: 'Graviton Lens',
    emoji: '🔍',
    description: 'All production ×1.15',
    effect: { kind: 'globalMult', x: 1.15 },
  },
  {
    id: 'alien_drill',
    name: 'Alien Drill Bit',
    emoji: '🔱',
    description: 'Tap power ×3',
    effect: { kind: 'tapMult', x: 3 },
  },
  {
    id: 'von_neumann_seed',
    name: 'Von Neumann Seed',
    emoji: '🌱',
    description: 'Mining Drones ×3',
    effect: { kind: 'genMult', genId: 'drone', x: 3 },
  },
  {
    id: 'nanite_swarm',
    name: 'Nanite Swarm',
    emoji: '🦠',
    description: 'Ore Refineries ×3',
    effect: { kind: 'genMult', genId: 'refinery', x: 3 },
  },
  {
    id: 'singing_crystal',
    name: 'Singing Crystal',
    emoji: '🎵',
    description: 'Comet windfalls ×1.5',
    effect: { kind: 'cometMult', x: 1.5 },
  },
  {
    id: 'quantum_anchor',
    name: 'Quantum Anchor',
    emoji: '⚓',
    description: 'Comet frenzies last +15s',
    effect: { kind: 'frenzyExtraMs', ms: 15_000 },
  },
  {
    id: 'cryo_core',
    name: 'Cryo Core',
    emoji: '❄️',
    description: 'Offline earnings cap +4h',
    effect: { kind: 'offlineCapBonusMs', ms: 4 * 3600_000 },
  },
  {
    id: 'star_chart',
    name: 'Star Chart Fragment',
    emoji: '🗺️',
    description: 'Expedition loot ×1.5',
    effect: { kind: 'expeditionLootMult', x: 1.5 },
  },
  {
    id: 'ancient_beacon',
    name: 'Ancient Beacon',
    emoji: '📡',
    description: 'Expeditions 20% faster',
    effect: { kind: 'expeditionSpeedMult', x: 0.8 },
  },
  {
    id: 'ghost_hull',
    name: 'Ghost Hull Plating',
    emoji: '👻',
    description: 'Expedition fuel costs halved',
    effect: { kind: 'expeditionFuelMult', x: 0.5 },
  },
  {
    id: 'dm_locket',
    name: 'Dark Matter Locket',
    emoji: '🖤',
    description: '+25% Dark Matter from each collapse',
    effect: { kind: 'dmBonusMult', x: 1.25 },
  },
];

export const ARTIFACTS_BY_ID: Record<string, ArtifactDef> = Object.fromEntries(
  ARTIFACTS.map((a) => [a.id, a]),
);

/** Aggregated passive bonuses from an owned-artifact set. */
export interface ArtifactPowers {
  globalMult: number;
  tapMult: number;
  genMult: Partial<Record<GeneratorId, number>>;
  cometMult: number;
  frenzyExtraMs: number;
  offlineCapBonusMs: number;
  expeditionLootMult: number;
  expeditionSpeedMult: number;
  expeditionFuelMult: number;
  dmBonusMult: number;
}

export function artifactPowers(owned: Record<string, true>): ArtifactPowers {
  const powers: ArtifactPowers = {
    globalMult: 1,
    tapMult: 1,
    genMult: {},
    cometMult: 1,
    frenzyExtraMs: 0,
    offlineCapBonusMs: 0,
    expeditionLootMult: 1,
    expeditionSpeedMult: 1,
    expeditionFuelMult: 1,
    dmBonusMult: 1,
  };
  for (const id of Object.keys(owned)) {
    const effect = ARTIFACTS_BY_ID[id]?.effect;
    if (!effect) continue;
    switch (effect.kind) {
      case 'globalMult':
        powers.globalMult *= effect.x;
        break;
      case 'tapMult':
        powers.tapMult *= effect.x;
        break;
      case 'genMult':
        powers.genMult[effect.genId] = (powers.genMult[effect.genId] ?? 1) * effect.x;
        break;
      case 'cometMult':
        powers.cometMult *= effect.x;
        break;
      case 'frenzyExtraMs':
        powers.frenzyExtraMs += effect.ms;
        break;
      case 'offlineCapBonusMs':
        powers.offlineCapBonusMs += effect.ms;
        break;
      case 'expeditionLootMult':
        powers.expeditionLootMult *= effect.x;
        break;
      case 'expeditionSpeedMult':
        powers.expeditionSpeedMult *= effect.x;
        break;
      case 'expeditionFuelMult':
        powers.expeditionFuelMult *= effect.x;
        break;
      case 'dmBonusMult':
        powers.dmBonusMult *= effect.x;
        break;
    }
  }
  return powers;
}
