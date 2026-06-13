import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatsHeader } from '../components/StatsHeader';
import { Tab, TabBar } from '../components/TabBar';
import { WelcomeBackModal } from '../components/WelcomeBackModal';
import { OfflineReport, useAppLifecycle } from '../hooks/useAppLifecycle';
import { useGameLoop } from '../hooks/useGameLoop';
import { colors } from '../theme';
import { FleetScreen } from './FleetScreen';
import { MineScreen } from './MineScreen';
import { PrestigeScreen } from './PrestigeScreen';
import { ShopScreen } from './ShopScreen';

interface Props {
  /** Offline earnings applied during cold-start hydration, if any. */
  initialOfflineReport: OfflineReport | null;
}

export function GameRoot({ initialOfflineReport }: Props) {
  const [tab, setTab] = useState<Tab>('mine');
  const { active, offlineReport, dismissOfflineReport, showOfflineReport } = useAppLifecycle();
  useGameLoop(active);

  useEffect(() => {
    if (initialOfflineReport) showOfflineReport(initialOfflineReport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <StatsHeader />
      <View style={styles.content}>
        {tab === 'mine' && <MineScreen />}
        {tab === 'shop' && <ShopScreen />}
        {tab === 'fleet' && <FleetScreen />}
        {tab === 'prestige' && <PrestigeScreen />}
      </View>
      <TabBar active={tab} onChange={setTab} />
      <WelcomeBackModal report={offlineReport} onDismiss={dismissOfflineReport} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
