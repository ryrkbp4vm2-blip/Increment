import { artifactPowers } from './artifacts';
import { darkMatterPowers } from './darkmatter';
import { researchPowers } from './research';
import { GeneratorId } from './types';

/** All passive bonuses in effect: artifacts + Dark Matter shop + research tree. */
export interface EffectivePowers {
  globalMult: number;
  tapMult: number;
  genMult: Partial<Record<GeneratorId, number>>;
  cometRewardMult: number;
  cometSpawnMult: number;
  frenzyExtraMs: number;
  offlineCapBonusMs: number;
  expeditionLootMult: number;
  expeditionSpeedMult: number;
  expeditionFuelMult: number;
  dmGainMult: number;
  startAsteroidIndex: number;
  startMinerals: number;
  rpGainMult: number;
}

function mergeGenMult(
  a: Partial<Record<GeneratorId, number>>,
  b: Partial<Record<GeneratorId, number>>,
): Partial<Record<GeneratorId, number>> {
  const out: Partial<Record<GeneratorId, number>> = { ...a };
  for (const k of Object.keys(b) as GeneratorId[]) out[k] = (out[k] ?? 1) * (b[k] ?? 1);
  return out;
}

export function effectivePowers(
  artifacts: Record<string, true>,
  dmUpgrades: Record<string, number>,
  research: Record<string, true> = {},
): EffectivePowers {
  const a = artifactPowers(artifacts);
  const d = darkMatterPowers(dmUpgrades);
  const r = researchPowers(research);
  return {
    globalMult: a.globalMult * d.globalMult * r.globalMult,
    tapMult: a.tapMult * d.tapMult * r.tapMult,
    genMult: mergeGenMult(a.genMult, r.genMult),
    cometRewardMult: a.cometMult * d.cometRewardMult * r.cometRewardMult,
    cometSpawnMult: d.cometSpawnMult,
    frenzyExtraMs: a.frenzyExtraMs,
    offlineCapBonusMs: a.offlineCapBonusMs + d.offlineCapBonusMs,
    expeditionLootMult: a.expeditionLootMult * d.expeditionLootMult * r.expeditionLootMult,
    expeditionSpeedMult: a.expeditionSpeedMult * d.expeditionSpeedMult,
    expeditionFuelMult: a.expeditionFuelMult * d.expeditionFuelMult,
    // The artifact's "Dark Matter Locket" boosts DM gain, same as Dark Compression.
    dmGainMult: a.dmBonusMult * d.dmGainMult,
    startAsteroidIndex: d.startAsteroidIndex,
    startMinerals: d.startMinerals,
    rpGainMult: r.rpGainMult,
  };
}
