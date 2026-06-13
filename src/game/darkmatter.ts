/** The Dark Matter shop: permanent upgrades bought with prestige currency. */

export type DMKind =
  | 'global'
  | 'tap'
  | 'comet'
  | 'expedition'
  | 'beltStart'
  | 'mineralStart'
  | 'offlineCap'
  | 'dmGain';

export interface DarkMatterUpgradeDef {
  id: string;
  name: string;
  emoji: string;
  kind: DMKind;
  /** Short text describing one level's contribution. */
  perLevel: string;
  maxLevel: number;
  /** Cost to buy the level after `level` is `baseCost * (level + 1)`. */
  baseCost: number;
  params: Record<string, number>;
}

const HOUR_MS = 3600_000;

export const DM_UPGRADES: DarkMatterUpgradeDef[] = [
  {
    id: 'stellar_density',
    name: 'Stellar Density',
    emoji: '⭐',
    kind: 'global',
    perLevel: '+40% all production',
    maxLevel: 20,
    baseCost: 1,
    params: { pct: 0.4 },
  },
  {
    id: 'kinetic_amplifier',
    name: 'Kinetic Amplifier',
    emoji: '🔨',
    kind: 'tap',
    perLevel: '+75% tap power',
    maxLevel: 15,
    baseCost: 1,
    params: { pct: 0.75 },
  },
  {
    id: 'cosmic_magnet',
    name: 'Cosmic Magnet',
    emoji: '🧲',
    kind: 'comet',
    perLevel: '+20% comet windfall, comets 5% sooner',
    maxLevel: 10,
    baseCost: 2,
    params: { rewardPct: 0.2, spawnPct: 0.05 },
  },
  {
    id: 'warp_logistics',
    name: 'Warp Logistics',
    emoji: '🛸',
    kind: 'expedition',
    perLevel: 'Expeditions 8% faster & cheaper, +12% loot',
    maxLevel: 10,
    baseCost: 2,
    params: { speedPct: 0.08, fuelPct: 0.08, lootPct: 0.12 },
  },
  {
    id: 'belt_resonance',
    name: 'Belt Resonance',
    emoji: '💫',
    kind: 'beltStart',
    perLevel: 'Start each run 1 asteroid deeper',
    maxLevel: 10,
    baseCost: 3,
    params: { n: 1 },
  },
  {
    id: 'quantum_reserves',
    name: 'Quantum Reserves',
    emoji: '🏦',
    kind: 'mineralStart',
    perLevel: 'Start each run with a bigger mineral stockpile',
    maxLevel: 5,
    baseCost: 3,
    params: { base: 1000 },
  },
  {
    id: 'temporal_vault',
    name: 'Temporal Vault',
    emoji: '⏳',
    kind: 'offlineCap',
    perLevel: '+2h offline earnings cap',
    maxLevel: 6,
    baseCost: 2,
    params: { ms: 2 * HOUR_MS },
  },
  {
    id: 'dark_compression',
    name: 'Dark Compression',
    emoji: '🕳️',
    kind: 'dmGain',
    perLevel: '+20% Dark Matter from each collapse',
    maxLevel: 10,
    baseCost: 4,
    params: { pct: 0.2 },
  },
];

export const DM_UPGRADES_BY_ID: Record<string, DarkMatterUpgradeDef> = Object.fromEntries(
  DM_UPGRADES.map((u) => [u.id, u]),
);

/** Dark Matter cost to buy the next level from the given current level. */
export function darkMatterUpgradeCost(def: DarkMatterUpgradeDef, level: number): number {
  return def.baseCost * (level + 1);
}

/** Starting mineral stockpile granted by Quantum Reserves at a given level. */
export function mineralStockpile(base: number, level: number): number {
  return level <= 0 ? 0 : base * 10 ** (level - 1);
}

export interface DarkMatterPowers {
  globalMult: number;
  tapMult: number;
  cometRewardMult: number;
  cometSpawnMult: number;
  expeditionSpeedMult: number;
  expeditionFuelMult: number;
  expeditionLootMult: number;
  startAsteroidIndex: number;
  startMinerals: number;
  offlineCapBonusMs: number;
  dmGainMult: number;
}

export function darkMatterPowers(levels: Record<string, number>): DarkMatterPowers {
  const powers: DarkMatterPowers = {
    globalMult: 1,
    tapMult: 1,
    cometRewardMult: 1,
    cometSpawnMult: 1,
    expeditionSpeedMult: 1,
    expeditionFuelMult: 1,
    expeditionLootMult: 1,
    startAsteroidIndex: 0,
    startMinerals: 0,
    offlineCapBonusMs: 0,
    dmGainMult: 1,
  };
  for (const def of DM_UPGRADES) {
    const level = levels[def.id] ?? 0;
    if (level <= 0) continue;
    const p = def.params;
    switch (def.kind) {
      case 'global':
        powers.globalMult *= 1 + p.pct * level;
        break;
      case 'tap':
        powers.tapMult *= 1 + p.pct * level;
        break;
      case 'comet':
        powers.cometRewardMult *= 1 + p.rewardPct * level;
        powers.cometSpawnMult = Math.max(0.2, powers.cometSpawnMult * (1 - p.spawnPct) ** level);
        break;
      case 'expedition':
        powers.expeditionSpeedMult *= (1 - p.speedPct) ** level;
        powers.expeditionFuelMult *= (1 - p.fuelPct) ** level;
        powers.expeditionLootMult *= 1 + p.lootPct * level;
        break;
      case 'beltStart':
        powers.startAsteroidIndex += p.n * level;
        break;
      case 'mineralStart':
        powers.startMinerals += mineralStockpile(p.base, level);
        break;
      case 'offlineCap':
        powers.offlineCapBonusMs += p.ms * level;
        break;
      case 'dmGain':
        powers.dmGainMult *= 1 + p.pct * level;
        break;
    }
  }
  return powers;
}

/** Human-readable summary of an upgrade's total effect at the given level. */
export function dmTotalEffect(def: DarkMatterUpgradeDef, level: number): string {
  const p = def.params;
  switch (def.kind) {
    case 'global':
      return `+${Math.round(p.pct * level * 100)}% production`;
    case 'tap':
      return `+${Math.round(p.pct * level * 100)}% tap power`;
    case 'comet':
      return `+${Math.round(p.rewardPct * level * 100)}% windfall`;
    case 'expedition':
      return `+${Math.round(p.lootPct * level * 100)}% loot`;
    case 'beltStart':
      return `start +${p.n * level} deeper`;
    case 'mineralStart':
      return `start with ${formatStockpile(mineralStockpile(p.base, level))}`;
    case 'offlineCap':
      return `+${(p.ms * level) / HOUR_MS}h offline cap`;
    case 'dmGain':
      return `+${Math.round(p.pct * level * 100)}% DM gain`;
  }
}

function formatStockpile(n: number): string {
  if (n >= 1e6) return `${n / 1e6}M`;
  if (n >= 1e3) return `${n / 1e3}K`;
  return String(n);
}
