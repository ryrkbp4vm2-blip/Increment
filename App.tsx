import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { initSound } from './src/audio/sound';
import { initHaptics } from './src/haptics';
import { OFFLINE_CAP_MS, OFFLINE_MIN_MS } from './src/game/balance';
import { offlineEfficiency } from './src/game/ascension';
import { effectivePowers } from './src/game/powers';
import { cps } from './src/game/math';
import { computeCrystalOfflineEarnings, computeOfflineEarnings } from './src/game/offline';
import { OfflineReport } from './src/hooks/useAppLifecycle';
import { cancelScheduledNotifications } from './src/notifications/notifications';
import { GameRoot } from './src/screens/GameRoot';
import { useGameStore } from './src/store/gameStore';
import { loadSave } from './src/store/persistence';
import { colors } from './src/theme';

export default function App() {
  const [ready, setReady] = useState(false);
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    void initSound();
    void initHaptics();
    // Cold start: clear any reminders scheduled by the previous session (the
    // AppState listener only covers background→foreground, not launch).
    void cancelScheduledNotifications();
    (async () => {
      const save = await loadSave();
      if (cancelled) return;
      if (save) {
        const now = Date.now();
        useGameStore.getState().hydrate(save.state, now);
        const elapsedMs = now - save.savedAt;
        if (elapsedMs > OFFLINE_MIN_MS) {
          if (save.state.transcendCount > 0) {
            const store = useGameStore.getState();
            const crystalEarned = computeCrystalOfflineEarnings(
              elapsedMs,
              store.cachedCrystalCps,
              store.crystalFormationIndex,
            );
            store.applyOffline(crystalEarned, now);
            if (crystalEarned > 0) {
              setOfflineReport({
                earned: crystalEarned,
                elapsedMs,
                crystal: true,
                creditedMs: Math.min(elapsedMs, OFFLINE_CAP_MS),
              });
            }
          } else {
            const capBonus = effectivePowers(save.state.artifacts, save.state.dmUpgrades, save.state.research)
              .offlineCapBonusMs;
            const efficiency = offlineEfficiency(save.state.singularityPerks);
            const earned = computeOfflineEarnings(elapsedMs, cps(save.state), capBonus, efficiency);
            useGameStore.getState().applyOffline(earned, now);
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
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      {ready && <GameRoot initialOfflineReport={offlineReport} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
