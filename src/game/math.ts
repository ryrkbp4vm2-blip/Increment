import { achievementBonus } from './achievements';
import { singularityMult } from './ascension';
import { asteroidRichness } from './asteroids';
import { GENERATORS, MILESTONE_EVERY, UPGRADES_BY_ID } from './balance';
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
    singularityMult(state.totalSingularityCores, state.singularityPerks);
  for (const id of Object.keys(state.upgrades)) {
    const effect = UPGRADES_BY_ID[id]?.effect;
    if (effect?.kind === 'globalMult') mult *= effect.x;
  }
  return mult;
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
  let cpsPercent = 0;
  for (const id of Object.keys(state.upgrades)) {
    const effect = UPGRADES_BY_ID[id]?.effect;
    if (effect?.kind === 'tapMult') tapMult *= effect.x;
    if (effect?.kind === 'tapCpsPercent') cpsPercent += effect.pct;
  }
  return tapMult * globalMultiplier(state) + currentCps * cpsPercent;
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
