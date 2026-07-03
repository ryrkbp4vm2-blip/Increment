/**
 * Crystal-mode statistics — the labelled factor breakdown for the Stats modal,
 * mirroring math.ts's globalFactors for the crystal production stack. The
 * factors listed here multiply out to exactly what withCaches feeds into
 * cachedCrystalCps, plus the formation depth bonus the live tick applies.
 */
import { achievementBonus } from './achievements';
import { eonCrystalMult, eonMult } from './convergence';
import {
  crystalChallengeModifiers,
  crystalChallengeRewardMult,
} from './crystalChallenges';
import { RESONANCE_BONUS, crystalRunPowers, formationDepthBonus, resonanceMult } from './crystalGame';
import { relicPowers } from './relics';
import { crystalPowers, resonancePowerMult } from './transcend';
import { PersistedState } from './types';

type CrystalFactorState = Pick<
  PersistedState,
  | 'crystalUpgrades'
  | 'resonance'
  | 'crystalRunUpgrades'
  | 'totalEons'
  | 'eonUpgrades'
  | 'achievements'
  | 'crystalChallengesCompleted'
  | 'activeCrystalChallenge'
  | 'crystalFormationIndex'
  | 'crystalRelics'
>;

/** Labelled crystal-multiplier factors for the statistics screen. */
export function crystalGlobalFactors(state: CrystalFactorState): { label: string; value: number }[] {
  return [
    { label: 'Crystal Matrix', value: crystalPowers(state.crystalUpgrades).globalMult },
    {
      label: 'Resonance',
      value: resonanceMult(
        state.resonance,
        RESONANCE_BONUS * resonancePowerMult(state.crystalUpgrades),
      ),
    },
    { label: 'Forge upgrades (this run)', value: crystalRunPowers(state.crystalRunUpgrades).globalMult },
    { label: 'Eons', value: eonMult(state.totalEons) },
    { label: 'Convergence tree', value: eonCrystalMult(state.eonUpgrades) },
    { label: 'Achievements', value: achievementBonus(state.achievements) },
    { label: 'Formation depth', value: formationDepthBonus(state.crystalFormationIndex) },
    { label: 'Harmonic Relics', value: relicPowers(state.crystalRelics).globalMult },
    {
      label: 'Challenge rewards',
      value: crystalChallengeRewardMult(state.crystalChallengesCompleted).globalMult,
    },
    {
      label: 'Active challenge',
      value: crystalChallengeModifiers(state.activeCrystalChallenge).productionMult,
    },
  ];
}
