import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { offlineEfficiency } from '../game/ascension';
import { effectivePowers } from '../game/powers';
import { OFFLINE_CAP_MS, OFFLINE_MIN_MS } from '../game/balance';
import { planNotifications } from '../game/notificationPlan';
import { computeCrystalOfflineEarnings, computeOfflineEarnings } from '../game/offline';
import {
  cancelScheduledNotifications,
  scheduleNotifications,
} from '../notifications/notifications';
import { useGameStore } from '../store/gameStore';
import { writeSave } from '../store/persistence';

export interface OfflineReport {
  earned: number;
  elapsedMs: number;
  crystal?: boolean;
  /** How much of the away time was actually paid (elapsed clamped to the cap). */
  creditedMs?: number;
  /** Offline efficiency multiplier (>1 with the Offline Overdrive perk). */
  efficiency?: number;
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
        // The player is back — pending reminders would just be noise now.
        void cancelScheduledNotifications();
        const elapsedMs = Date.now() - state.lastTickAt;
        if (elapsedMs > OFFLINE_MIN_MS) {
          if (state.transcendCount > 0) {
            const earned = computeCrystalOfflineEarnings(
              elapsedMs,
              state.cachedCrystalCps,
              state.crystalFormationIndex,
            );
            state.applyOffline(earned, Date.now());
            if (earned > 0) {
              setOfflineReport({
                earned,
                elapsedMs,
                crystal: true,
                creditedMs: Math.min(elapsedMs, OFFLINE_CAP_MS),
              });
            }
          } else {
            const capBonus = effectivePowers(state.artifacts, state.dmUpgrades, state.research)
              .offlineCapBonusMs;
            const efficiency = offlineEfficiency(state.singularityPerks);
            const earned = computeOfflineEarnings(elapsedMs, state.cachedCps, capBonus, efficiency);
            state.applyOffline(earned, Date.now());
            if (earned > 0) {
              setOfflineReport({
                earned,
                elapsedMs,
                creditedMs: Math.min(elapsedMs, OFFLINE_CAP_MS + capBonus),
                efficiency,
              });
            }
          }
        }
      } else {
        void writeSave(state);
        if (state.notificationsEnabled) {
          void scheduleNotifications(planNotifications(state, Date.now()));
        }
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
