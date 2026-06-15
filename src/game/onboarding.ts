/**
 * Onboarding guidance — pure, derived-from-state hints so a new player always
 * knows the single most useful next action, and discovers each system (Empire,
 * Lab, Fleet, Prestige, Ascension, Sector Warp) exactly as it becomes relevant.
 *
 * Everything here is computed from the live state, so there is nothing to
 * persist and nothing to mark "seen": an objective vanishes the moment the
 * player acts on it.
 */
import { GENERATORS, GENERATORS_BY_ID, PRESTIGE_BASE } from './balance';
import { pendingDarkMatter } from './prestige';
import { ASCEND_BASE, pendingSingularityCores } from './ascension';
import { canWarp } from './zones';
import { canTranscend, transcendUnlocked } from './transcend';

/** Tab ids, mirrored from the TabBar so this module stays React-free. */
export type GuideTab = 'mine' | 'shop' | 'fleet' | 'lab' | 'goals' | 'prestige';

export interface Objective {
  id: string;
  text: string;
  /** Which tab the player should open to act on this objective. */
  tab: GuideTab;
}

type ObjectiveState = {
  totalTaps: number;
  minerals: number;
  generators: Record<string, number>;
  asteroidsShattered: number;
  researchPoints: number;
  research: Record<string, true>;
  expeditionsCompleted: number;
  lifetimeThisRun: number;
  prestigeCount: number;
  dmSinceAscension: number;
  ascensionCount: number;
  ascensionsSinceWarp: number;
  ascensionsSinceTranscend: number;
};

function generatorsOwned(generators: Record<string, number>): number {
  let n = 0;
  for (const g of GENERATORS) n += generators[g.id] ?? 0;
  return n;
}

/**
 * The single highest-priority next step for the player, or null once they're
 * established enough to steer themselves. Ordered from the very first tap up
 * through the deepest unlocked layer.
 */
export function nextObjective(state: ObjectiveState): Objective | null {
  const droneCost = GENERATORS_BY_ID.drone.baseCost;

  // 1. The very first thing: tap the rock.
  if (state.totalTaps < 5) {
    return { id: 'tap', text: 'Tap the asteroid to mine your first minerals.', tab: 'mine' };
  }

  // 2. Automate: buy the first generator.
  if (generatorsOwned(state.generators) === 0) {
    return state.minerals >= droneCost
      ? {
          id: 'buy_drone',
          text: 'Open the Empire tab and buy a Mining Drone to automate mining.',
          tab: 'shop',
        }
      : {
          id: 'save_drone',
          text: `Keep tapping — a Mining Drone costs ${droneCost} minerals.`,
          tab: 'mine',
        };
  }

  // 3. Break the belt open.
  if (state.asteroidsShattered === 0) {
    return {
      id: 'shatter',
      text: 'Mine through the asteroid to shatter it — deeper rocks are far richer.',
      tab: 'mine',
    };
  }

  // 4. Introduce the Lab once shattering has minted Research Points.
  if (state.researchPoints > 0 && Object.keys(state.research).length === 0) {
    return {
      id: 'research',
      text: 'You earned Research Points! Spend them in the Lab for permanent upgrades.',
      tab: 'lab',
    };
  }

  // 5. Introduce the Fleet once the player has some momentum.
  if (state.asteroidsShattered >= 3 && state.expeditionsCompleted === 0) {
    return {
      id: 'fleet',
      text: 'Send a Fleet expedition to hunt for powerful Artifacts.',
      tab: 'fleet',
    };
  }

  // 6. The first prestige: collapse for Dark Matter.
  if (state.prestigeCount === 0) {
    if (pendingDarkMatter(state.lifetimeThisRun) >= 1) {
      return {
        id: 'collapse_ready',
        text: 'You can Collapse for permanent Dark Matter! Open the Prestige tab.',
        tab: 'prestige',
      };
    }
    if (state.lifetimeThisRun >= PRESTIGE_BASE * 0.25) {
      return {
        id: 'collapse_soon',
        text: 'Keep growing — collapsing into Dark Matter unlocks soon in the Prestige tab.',
        tab: 'prestige',
      };
    }
  }

  // 7. The first ascension.
  if (state.ascensionCount === 0 && pendingSingularityCores(state.dmSinceAscension) >= 1) {
    return {
      id: 'ascend_ready',
      text: 'Ascension is ready — claim Singularity Cores in the Prestige tab.',
      tab: 'prestige',
    };
  }

  // 9. Transcendence — the deepest layer, once unlocked at the 5th ascension.
  if (transcendUnlocked(state.ascensionCount) && canTranscend(state.ascensionsSinceTranscend)) {
    return {
      id: 'transcend_ready',
      text: 'You can Transcend — reset everything for Crystals and the permanent Crystal Matrix. See the Prestige tab.',
      tab: 'prestige',
    };
  }

  // 8. The first (or next) sector warp.
  if (canWarp(state.ascensionsSinceWarp)) {
    return {
      id: 'warp_ready',
      text: 'You can Warp to a new sector — each one plays differently. See the Prestige tab.',
      tab: 'prestige',
    };
  }

  return null;
}

/**
 * Whether the Prestige tab should show an attention marker — true whenever a
 * collapse, ascension or warp is available to claim. Self-clears once acted on.
 */
export function prestigeAttention(state: {
  lifetimeThisRun: number;
  dmSinceAscension: number;
  ascensionsSinceWarp: number;
  ascensionsSinceTranscend: number;
}): boolean {
  return (
    pendingDarkMatter(state.lifetimeThisRun) >= 1 ||
    pendingSingularityCores(state.dmSinceAscension) >= 1 ||
    canWarp(state.ascensionsSinceWarp) ||
    canTranscend(state.ascensionsSinceTranscend)
  );
}
