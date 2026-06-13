import { artifactPowers } from './artifacts';
import { darkMatterPowers } from './darkmatter';
import { GeneratorId } from './types';

/** All passive bonuses in effect, combining artifacts and the Dark Matter shop. */
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
}

export function effectivePowers(
  artifacts: Record<string, true>,
  dmUpgrades: Record<string, number>,
): EffectivePowers {
  const a = artifactPowers(artifacts);
  const d = darkMatterPowers(dmUpgrades);
  return {
    globalMult: a.globalMult * d.globalMult,
    tapMult: a.tapMult * d.tapMult,
    genMult: a.genMult,
    cometRewardMult: a.cometMult * d.cometRewardMult,
    cometSpawnMult: d.cometSpawnMult,
    frenzyExtraMs: a.frenzyExtraMs,
    offlineCapBonusMs: a.offlineCapBonusMs + d.offlineCapBonusMs,
    expeditionLootMult: a.expeditionLootMult * d.expeditionLootMult,
    expeditionSpeedMult: a.expeditionSpeedMult * d.expeditionSpeedMult,
    expeditionFuelMult: a.expeditionFuelMult * d.expeditionFuelMult,
    // The artifact's "Dark Matter Locket" boosts DM gain, same as Dark Compression.
    dmGainMult: a.dmBonusMult * d.dmGainMult,
    startAsteroidIndex: d.startAsteroidIndex,
    startMinerals: d.startMinerals,
  };
}
