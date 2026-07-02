import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { offlineEfficiency } from '../game/ascension';
import { effectivePowers } from '../game/powers';
import { OFFLINE_MIN_MS } from '../game/balance';
import { computeCrystalOfflineEarnings, computeOfflineEarnings } from '../game/offline';
import { useGameStore } from '../store/gameStore';
import { writeSave } from '../store/persistence';

export interface OfflineReport {
  earned: number;
  elapsedMs: number;
  crystal?: boolean;
}

/**
 * Saves immediately when the app goes to background and applies offline
 * earnings when it returns. Returns whether the loop should run and the
 * latest offline report for the welcome-back modal.
 */
export function useAppLifecycle() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const nowActive = next === 'active';
      const state = useGameStore.getState();
      if (nowActive) {
        const elapsedMs = Date.now() - state.lastTickAt;
        if (elapsedMs > OFFLINE_MIN_MS) {
          if (state.transcendCount > 0) {
            const earned = computeCrystalOfflineEarnings(
              elapsedMs,
              state.cachedCrystalCps,
              state.crystalFormationIndex,
            );
            state.applyOffline(earned, Date.now());
            if (earned > 0) setOfflineReport({ earned, elapsedMs, crystal: true });
          } else {
            const capBonus = effectivePowers(state.artifacts, state.dmUpgrades, state.research)
              .offlineCapBonusMs;
            const earned = computeOfflineEarnings(
              elapsedMs,
              state.cachedCps,
              capBonus,
              offlineEfficiency(state.singularityPerks),
            );
            state.applyOffline(earned, Date.now());
            if (earned > 0) setOfflineReport({ earned, elapsedMs });
          }
        }
      } else {
        void writeSave(state);
      }
      setActive(nowActive);
    });
    // Prestige-layer transitions and challenge completions are the moments a
    // player must never lose to a crash — save them immediately instead of
    // waiting out the loop's 10s throttle.
    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (
        state.prestigeCount !== prev.prestigeCount ||
        state.ascensionCount !== prev.ascensionCount ||
        state.sector !== prev.sector ||
        state.transcendCount !== prev.transcendCount ||
        state.resonance !== prev.resonance ||
        state.convergenceCount !== prev.convergenceCount ||
        state.challengesCompleted !== prev.challengesCompleted
      ) {
        void writeSave(state);
      }
    });
    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, []);

  return {
    active,
    offlineReport,
    dismissOfflineReport: () => setOfflineReport(null),
    showOfflineReport: (report: OfflineReport) => setOfflineReport(report),
  };
}
