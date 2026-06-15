import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { initSound } from './src/audio/sound';
import { OFFLINE_MIN_MS } from './src/game/balance';
import { offlineEfficiency } from './src/game/ascension';
import { effectivePowers } from './src/game/powers';
import { cps } from './src/game/math';
import { computeOfflineEarnings } from './src/game/offline';
import { OfflineReport } from './src/hooks/useAppLifecycle';
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
    (async () => {
      const save = await loadSave();
      if (cancelled) return;
      if (save) {
        const now = Date.now();
        useGameStore.getState().hydrate(save.state, now);
        const elapsedMs = now - save.savedAt;
        if (elapsedMs > OFFLINE_MIN_MS) {
          if (save.state.transcendCount > 0) {
            // Crystal mode: offline earnings are crystal CPS × elapsed (8h cap).
            const store = useGameStore.getState();
            const crystalEarned = Math.min(
              store.cachedCrystalCps * (elapsedMs / 1000),
              store.cachedCrystalCps * 8 * 3600,
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
