import { ARTIFACTS } from './artifacts';

/** Subset of powers that affect expeditions (satisfied by EffectivePowers). */
export interface ExpeditionPowers {
  expeditionFuelMult: number;
  expeditionLootMult: number;
  expeditionSpeedMult: number;
}

export interface ExpeditionDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  durationMs: number;
  /** Fuel cost: this many seconds of current production, with a floor. */
  fuelSeconds: number;
  fuelMin: number;
  /** Loot: this many seconds of launch-time production, with a floor. */
  lootSeconds: number;
  lootMin: number;
  artifactChance: number;
}

export const EXPEDITIONS: ExpeditionDef[] = [
  {
    id: 'scout',
    name: 'Near-Belt Sweep',
    emoji: '🛰️',
    description: 'A quick sweep of nearby debris fields.',
    durationMs: 5 * 60_000,
    fuelSeconds: 120,
    fuelMin: 25,
    lootSeconds: 480,
    lootMin: 150,
    artifactChance: 0.08,
  },
  {
    id: 'survey',
    name: 'Deep Field Survey',
    emoji: '🔭',
    description: 'Chart unexplored sectors of the belt.',
    durationMs: 30 * 60_000,
    fuelSeconds: 480,
    fuelMin: 200,
    lootSeconds: 3_000,
    lootMin: 1_500,
    artifactChance: 0.25,
  },
  {
    id: 'salvage',
    name: 'Ghost Ship Salvage',
    emoji: '🚢',
    description: 'Board a derelict alien freighter. Riches await.',
    durationMs: 2 * 3600_000,
    fuelSeconds: 1_200,
    fuelMin: 1_000,
    lootSeconds: 12_600,
    lootMin: 8_000,
    artifactChance: 0.6,
  },
];

export const EXPEDITIONS_BY_ID: Record<string, ExpeditionDef> = Object.fromEntries(
  EXPEDITIONS.map((e) => [e.id, e]),
);

export interface ActiveExpedition {
  defId: string;
  startedAt: number;
  endsAt: number;
  /** Loot locked in at launch (artifact bonuses already applied). */
  loot: number;
}

export function expeditionFuel(def: ExpeditionDef, cps: number, powers: ExpeditionPowers): number {
  return Math.ceil(Math.max(def.fuelMin, cps * def.fuelSeconds) * powers.expeditionFuelMult);
}

export function expeditionLoot(def: ExpeditionDef, cps: number, powers: ExpeditionPowers): number {
  return Math.ceil(Math.max(def.lootMin, cps * def.lootSeconds) * powers.expeditionLootMult);
}

export function expeditionDuration(def: ExpeditionDef, powers: ExpeditionPowers): number {
  return Math.round(def.durationMs * powers.expeditionSpeedMult);
}

export interface ExpeditionResult {
  loot: number;
  artifactId: string | null;
}

/**
 * Resolve a finished expedition. On a successful artifact roll, a random
 * not-yet-owned artifact is recovered; if the collection is complete, the
 * crew strips extra salvage instead (+50% loot).
 */
export function rollExpeditionResult(
  expedition: ActiveExpedition,
  owned: Record<string, true>,
  random: () => number = Math.random,
): ExpeditionResult {
  const def = EXPEDITIONS_BY_ID[expedition.defId];
  let loot = expedition.loot;
  let artifactId: string | null = null;
  if (def && random() < def.artifactChance) {
    const missing = ARTIFACTS.filter((a) => !owned[a.id]);
    if (missing.length > 0) {
      artifactId = missing[Math.floor(random() * missing.length) % missing.length].id;
    } else {
      loot = Math.ceil(loot * 1.5);
    }
  }
  return { loot, artifactId };
}
