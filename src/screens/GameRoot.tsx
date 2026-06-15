import React, { useEffect, useRef, useState } from 'react';
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
import { canResonate } from '../game/crystalGame';
import { canConverge } from '../game/convergence';
import { useGameStore } from '../store/gameStore';
import { colors } from '../theme';
import { CrystalForgeScreen } from './CrystalForgeScreen';
import { CrystalMineScreen } from './CrystalMineScreen';
import { FleetScreen } from './FleetScreen';
import { GoalsScreen } from './GoalsScreen';
import { MineScreen } from './MineScreen';
import { PrestigeScreen } from './PrestigeScreen';
import { ResearchScreen } from './ResearchScreen';
import { ShopScreen } from './ShopScreen';

const MINERAL_TABS: Tab[] = ['mine', 'shop', 'fleet', 'lab', 'goals', 'prestige'];
const CRYSTAL_TABS: Tab[] = ['crystal_mine', 'crystal_forge', 'goals', 'prestige'];

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

  const transcendCount = useGameStore((s) => s.transcendCount);
  const isCrystalMode = transcendCount > 0;
  const prevTranscendCount = useRef(transcendCount);

  const prestigeDot = useGameStore((s) =>
    s.transcendCount > 0
      ? canResonate(s.lifetimeCrystals, s.resonance) || canConverge(s.resonance)
      : prestigeAttention({
          lifetimeThisRun: s.lifetimeThisRun,
          dmSinceAscension: s.dmSinceAscension,
          ascensionsSinceWarp: s.ascensionsSinceWarp,
          ascensionsSinceTranscend: s.ascensionsSinceTranscend,
        }),
  );

  // Switch to crystal mine tab the moment the player transcends.
  useEffect(() => {
    if (transcendCount > 0 && prevTranscendCount.current === 0) {
      setTab('crystal_mine');
    }
    prevTranscendCount.current = transcendCount;
  }, [transcendCount]);

  // Correct tab on initial mount when loading a crystal-mode save.
  useEffect(() => {
    if (isCrystalMode && MINERAL_TABS.slice(0, 4).includes(tab as never)) {
      setTab('crystal_mine');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialOfflineReport) showOfflineReport(initialOfflineReport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTabs = isCrystalMode ? CRYSTAL_TABS : MINERAL_TABS;

  return (
    <View style={styles.root}>
      <StatsHeader onOpenSettings={() => setSettingsOpen(true)} />
      {(tab === 'mine' || tab === 'crystal_mine') && <ObjectiveCard onGo={setTab} />}
      <View style={styles.content}>
        {tab === 'mine' && <MineScreen />}
        {tab === 'shop' && <ShopScreen />}
        {tab === 'fleet' && <FleetScreen />}
        {tab === 'lab' && <ResearchScreen />}
        {tab === 'crystal_mine' && <CrystalMineScreen />}
        {tab === 'crystal_forge' && <CrystalForgeScreen />}
        {tab === 'goals' && <GoalsScreen />}
        {tab === 'prestige' && <PrestigeScreen />}
      </View>
      <TabBar
        active={tab}
        onChange={setTab}
        tabs={activeTabs}
        attention={{ prestige: prestigeDot }}
      />
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
