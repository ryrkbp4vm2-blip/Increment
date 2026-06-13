import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { effectivePowers } from '../game/powers';
import { OFFLINE_MIN_MS } from '../game/balance';
import { computeOfflineEarnings } from '../game/offline';
import { useGameStore } from '../store/gameStore';
import { writeSave } from '../store/persistence';

export interface OfflineReport {
  earned: number;
  elapsedMs: number;
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
          const capBonus = effectivePowers(state.artifacts, state.dmUpgrades).offlineCapBonusMs;
          const earned = computeOfflineEarnings(elapsedMs, state.cachedCps, capBonus);
          state.applyOffline(earned, Date.now());
          if (earned > 0) setOfflineReport({ earned, elapsedMs });
        }
      } else {
        void writeSave(state);
      }
      setActive(nowActive);
    });
    return () => subscription.remove();
  }, []);

  return {
    active,
    offlineReport,
    dismissOfflineReport: () => setOfflineReport(null),
    showOfflineReport: (report: OfflineReport) => setOfflineReport(report),
  };
}
