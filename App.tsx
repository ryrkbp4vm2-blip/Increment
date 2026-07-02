import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { initSound } from './src/audio/sound';
import { OFFLINE_MIN_MS } from './src/game/balance';
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
            if (crystalEarned > 0) setOfflineReport({ earned: crystalEarned, elapsedMs, crystal: true });
          } else {
            const capBonus = effectivePowers(save.state.artifacts, save.state.dmUpgrades, save.state.research)
              .offlineCapBonusMs;
            const earned = computeOfflineEarnings(
              elapsedMs,
              cps(save.state),
              capBonus,
              offlineEfficiency(save.state.singularityPerks),
            );
            useGameStore.getState().applyOffline(earned, now);
            if (earned > 0) setOfflineReport({ earned, elapsedMs });
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
