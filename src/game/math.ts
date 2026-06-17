import { achievementBonus } from './achievements';
import { singularityMult } from './ascension';
import { corePowers } from './ascension';
import { asteroidRichness } from './asteroids';
import { challengeModifiers, challengeRewardMult } from './challenges';
import { sectorMult, sectorTrait } from './zones';
import { crystalMult, crystalPowers } from './transcend';
import { BASE_TAP_CPS_PCT, GENERATORS, MILESTONE_EVERY, UPGRADES_BY_ID } from './balance';
import { effectivePowers } from './powers';
import { GameState, GeneratorDef, GeneratorId, PersistedState, UnlockCondition } from './types';

export function costOfNext(def: GeneratorDef, owned: number): number {
  return Math.ceil(def.baseCost * def.growth ** owned);
}

/** Total cost of buying `count` units starting from `owned` (geometric sum). */
export function bulkCost(def: GeneratorDef, owned: number, count: number): number {
  if (count <= 0) return 0;
  const g = def.growth;
  return Math.ceil((def.baseCost * g ** owned * (g ** count - 1)) / (g - 1));
}

/** Largest `count` such that bulkCost(def, owned, count) <= funds. */
export function maxAffordable(def: GeneratorDef, owned: number, funds: number): number {
  const g = def.growth;
  const first = def.baseCost * g ** owned;
  if (funds < Math.ceil(first)) return 0;
  let count = Math.floor(Math.log((funds * (g - 1)) / first + 1) / Math.log(g));
  // ceil() in bulkCost and float fuzz can push the estimate off by one in
  // either direction; settle it exactly.
  while (count > 0 && bulkCost(def, owned, count) > funds) count--;
  while (bulkCost(def, owned, count + 1) <= funds) count++;
  return count;
}

type MultState = Pick<
  PersistedState,
  | 'upgrades'
  | 'artifacts'
  | 'asteroidIndex'
  | 'dmUpgrades'
  | 'achievements'
  | 'research'
  | 'totalSingularityCores'
  | 'singularityPerks'
  | 'coreUpgrades'
  | 'activeChallenge'
  | 'challengesCompleted'
  | 'sector'
  | 'totalCrystals'
  | 'crystalUpgrades'
>;

export function generatorMultiplier(genId: GeneratorId, state: MultState): number {
  let mult = effectivePowers(state.artifacts, state.dmUpgrades, state.research).genMult[genId] ?? 1;
  for (const id of Object.keys(state.upgrades)) {
    const effect = UPGRADES_BY_ID[id]?.effect;
    if (effect?.kind === 'genMult' && effect.genId === genId) mult *= effect.x;
  }
  return mult;
}

export function globalMultiplier(state: MultState): number {
  const powers = effectivePowers(state.artifacts, state.dmUpgrades, state.research);
  let mult =
    powers.globalMult *
    asteroidRichness(state.asteroidIndex) *
    achievementBonus(state.achievements) *
    singularityMult(state.totalSingularityCores, state.singularityPerks) *
    corePowers(state.coreUpgrades).globalMult *
    sectorMult(state.sector) *
    sectorTrait(state.sector).productionMult *
    crystalMult(state.totalCrystals) *
    crystalPowers(state.crystalUpgrades).globalMult *
    challengeRewardMult(state.challengesCompleted).globalMult *
    challengeModifiers(state.activeChallenge).productionMult;
  for (const id of Object.keys(state.upgrades)) {
    const effect = UPGRADES_BY_ID[id]?.effect;
    if (effect?.kind === 'globalMult') mult *= effect.x;
  }
  return mult;
}

/**
 * The portion of the global multiplier that carries across a run reset — every
 * permanent bonus (artifacts, Dark Matter shop, research, achievements, cores,
 * sector, crystals, completed challenges) but NOT per-run factors (belt
 * richness, mineral upgrades) or the active challenge's own constraint. Used to
 * scale challenge goals so a constrained run stays meaningful no matter how
 * powerful the player has become.
 */
export function permanentPowerMultiplier(state: MultState): number {
  const powers = effectivePowers(state.artifacts, state.dmUpgrades, state.research);
  return (
    powers.globalMult *
    achievementBonus(state.achievements) *
    singularityMult(state.totalSingularityCores, state.singularityPerks) *
    corePowers(state.coreUpgrades).globalMult *
    sectorMult(state.sector) *
    sectorTrait(state.sector).productionMult *
    crystalMult(state.totalCrystals) *
    crystalPowers(state.crystalUpgrades).globalMult *
    challengeRewardMult(state.challengesCompleted).globalMult
  );
}

/** Labelled global-multiplier factors for the statistics screen. */
export function globalFactors(state: MultState): { label: string; value: number }[] {
  const powers = effectivePowers(state.artifacts, state.dmUpgrades, state.research);
  let upgradeMult = 1;
  for (const id of Object.keys(state.upgrades)) {
    const effect = UPGRADES_BY_ID[id]?.effect;
    if (effect?.kind === 'globalMult') upgradeMult *= effect.x;
  }
  return [
    { label: 'Belt richness', value: asteroidRichness(state.asteroidIndex) },
    { label: 'Achievements', value: achievementBonus(state.achievements) },
    { label: 'Singularity Cores', value: singularityMult(state.totalSingularityCores, state.singularityPerks) },
    { label: 'Sector', value: sectorMult(state.sector) },
    { label: 'Sector trait', value: sectorTrait(state.sector).productionMult },
    { label: 'Crystals', value: crystalMult(state.totalCrystals) },
    { label: 'Crystal Matrix', value: crystalPowers(state.crystalUpgrades).globalMult },
    { label: 'Singularity upgrades', value: corePowers(state.coreUpgrades).globalMult },
    { label: 'Artifacts · shop · research', value: powers.globalMult },
    { label: 'Mineral upgrades', value: upgradeMult },
  ];
}

/** Every MILESTONE_EVERY owned doubles that generator's output. */
export function milestoneMultiplier(owned: number): number {
  return 2 ** Math.floor(owned / MILESTONE_EVERY);
}

export function generatorProduction(
  def: GeneratorDef,
  owned: number,
  state: MultState,
): number {
  return (
    def.baseProd *
    owned *
    milestoneMultiplier(owned) *
    generatorMultiplier(def.id, state) *
    globalMultiplier(state)
  );
}

export function cps(state: MultState & Pick<PersistedState, 'generators'>): number {
  let total = 0;
  for (const def of GENERATORS) {
    total += generatorProduction(def, state.generators[def.id] ?? 0, state);
  }
  return total;
}

export function tapValue(
  state: MultState & Pick<PersistedState, 'generators'>,
  currentCps: number = cps(state),
): number {
  let tapMult = effectivePowers(state.artifacts, state.dmUpgrades, state.research).tapMult;
  tapMult *= corePowers(state.coreUpgrades).tapMult;
  tapMult *= challengeRewardMult(state.challengesCompleted).tapMult;
  tapMult *= sectorTrait(state.sector).tapMult;
  tapMult *= crystalPowers(state.crystalUpgrades).tapMult;
  // Baseline: every tap is worth a slice of current production, so active
  // tapping beats pure idle at every stage. Tap upgrades stack on top.
  let cpsPercent = BASE_TAP_CPS_PCT;
  for (const id of Object.keys(state.upgrades)) {
    const effect = UPGRADES_BY_ID[id]?.effect;
    if (effect?.kind === 'tapMult') tapMult *= effect.x;
    if (effect?.kind === 'tapCpsPercent') cpsPercent += effect.pct;
  }
  // The active-challenge tap modifier throttles the whole tap (Famine ×0.2,
  // Idle Doctrine ×0).
  const chTap = challengeModifiers(state.activeChallenge).tapMult;
  return (tapMult * globalMultiplier(state) + currentCps * cpsPercent) * chTap;
}

export function isUnlockMet(cond: UnlockCondition, state: GameState): boolean {
  switch (cond.kind) {
    case 'genCount':
      return (state.generators[cond.genId] ?? 0) >= cond.n;
    case 'lifetime':
      return state.lifetimeThisRun >= cond.amount;
    case 'taps':
      return state.totalTaps >= cond.n;
  }
}
