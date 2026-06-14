import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AchievementToast } from '../components/AchievementToast';
import { ObjectiveCard } from '../components/ObjectiveCard';
import { SettingsModal } from '../components/SettingsModal';
import { StatsModal } from '../components/StatsModal';
import { StatsHeader } from '../components/StatsHeader';
import { Tab, TabBar } from '../components/TabBar';
import { WelcomeBackModal } from '../components/WelcomeBackModal';
import { OfflineReport, useAppLifecycle } from '../hooks/useAppLifecycle';
import { useGameLoop } from '../hooks/useGameLoop';
import { prestigeAttention } from '../game/onboarding';
import { useGameStore } from '../store/gameStore';
import { colors } from '../theme';
import { FleetScreen } from './FleetScreen';
import { GoalsScreen } from './GoalsScreen';
import { MineScreen } from './MineScreen';
import { PrestigeScreen } from './PrestigeScreen';
import { ResearchScreen } from './ResearchScreen';
import { ShopScreen } from './ShopScreen';

interface Props {
  /** Offline earnings applied during cold-start hydration, if any. */
  initialOfflineReport: OfflineReport | null;
}

export function GameRoot({ initialOfflineReport }: Props) {
  const [tab, setTab] = useState<Tab>('mine');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const { active, offlineReport, dismissOfflineReport, showOfflineReport } = useAppLifecycle();
  useGameLoop(active);
  const prestigeDot = useGameStore((s) =>
    prestigeAttention({
      lifetimeThisRun: s.lifetimeThisRun,
      dmSinceAscension: s.dmSinceAscension,
      ascensionsSinceWarp: s.ascensionsSinceWarp,
    }),
  );

  useEffect(() => {
    if (initialOfflineReport) showOfflineReport(initialOfflineReport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <StatsHeader onOpenSettings={() => setSettingsOpen(true)} />
      {tab === 'mine' && <ObjectiveCard onGo={setTab} />}
      <View style={styles.content}>
        {tab === 'mine' && <MineScreen />}
        {tab === 'shop' && <ShopScreen />}
        {tab === 'fleet' && <FleetScreen />}
        {tab === 'lab' && <ResearchScreen />}
        {tab === 'goals' && <GoalsScreen />}
        {tab === 'prestige' && <PrestigeScreen />}
      </View>
      <TabBar active={tab} onChange={setTab} attention={{ prestige: prestigeDot }} />
      <AchievementToast />
      <WelcomeBackModal report={offlineReport} onDismiss={dismissOfflineReport} />
      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenStats={() => setStatsOpen(true)}
      />
      <StatsModal visible={statsOpen} onClose={() => setStatsOpen(false)} />
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
