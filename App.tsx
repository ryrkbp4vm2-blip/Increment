import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { OFFLINE_MIN_MS } from './src/game/balance';
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
    (async () => {
      const save = await loadSave();
      if (cancelled) return;
      if (save) {
        const now = Date.now();
        useGameStore.getState().hydrate(save.state, now);
        const elapsedMs = now - save.savedAt;
        if (elapsedMs > OFFLINE_MIN_MS) {
          const capBonus = effectivePowers(save.state.artifacts, save.state.dmUpgrades)
            .offlineCapBonusMs;
          const earned = computeOfflineEarnings(elapsedMs, cps(save.state), capBonus);
          useGameStore.getState().applyOffline(earned, now);
          if (earned > 0) setOfflineReport({ earned, elapsedMs });
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
