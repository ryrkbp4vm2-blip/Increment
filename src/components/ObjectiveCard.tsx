import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { nextCrystalObjective, nextObjective } from '../game/onboarding';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { Icon } from './art/Icon';
import type { Tab } from './TabBar';

interface Props {
  /** Switch to the tab the current objective lives on. */
  onGo: (tab: Tab) => void;
}

/**
 * A compact "what next?" strip shown on the Mine screen. It surfaces the single
 * most useful next action derived from live state, so the six-tab game stays
 * legible to a new player and each system is discovered as it unlocks.
 */
export function ObjectiveCard({ onGo }: Props) {
  // Select stable values individually — a selector must not build a fresh object
  // each call (that breaks useSyncExternalStore), so the objective is derived
  // in render from these primitives and stable store references.
  const transcendCount = useGameStore((s) => s.transcendCount);
  const totalTaps = useGameStore((s) => s.totalTaps);
  const minerals = useGameStore((s) => s.minerals);
  const generators = useGameStore((s) => s.generators);
  const asteroidsShattered = useGameStore((s) => s.asteroidsShattered);
  const researchPoints = useGameStore((s) => s.researchPoints);
  const research = useGameStore((s) => s.research);
  const expeditionsCompleted = useGameStore((s) => s.expeditionsCompleted);
  const lifetimeThisRun = useGameStore((s) => s.lifetimeThisRun);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const dmSinceAscension = useGameStore((s) => s.dmSinceAscension);
  const ascensionCount = useGameStore((s) => s.ascensionCount);
  const ascensionsSinceWarp = useGameStore((s) => s.ascensionsSinceWarp);
  const ascensionsSinceTranscend = useGameStore((s) => s.ascensionsSinceTranscend);
  // Crystal-mode state (only meaningful once transcended).
  const crystals = useGameStore((s) => s.crystals);
  const crystalGenerators = useGameStore((s) => s.crystalGenerators);
  const crystalRunUpgrades = useGameStore((s) => s.crystalRunUpgrades);
  const lifetimeCrystals = useGameStore((s) => s.lifetimeCrystals);
  const resonance = useGameStore((s) => s.resonance);
  const attunement = useGameStore((s) => s.attunement);
  const crystalUpgrades = useGameStore((s) => s.crystalUpgrades);

  const isCrystalMode = transcendCount > 0;
  const objective = isCrystalMode
    ? nextCrystalObjective({
        crystals,
        crystalGenerators,
        crystalRunUpgrades,
        lifetimeCrystals,
        resonance,
        attunement,
        crystalUpgrades,
      })
    : nextObjective({
        totalTaps,
        minerals,
        generators,
        asteroidsShattered,
        researchPoints,
        research,
        expeditionsCompleted,
        lifetimeThisRun,
        prestigeCount,
        dmSinceAscension,
        ascensionCount,
        ascensionsSinceWarp,
        ascensionsSinceTranscend,
      });

  if (!objective) return null;

  // Objectives whose tab is the screen we're already on have nowhere to send.
  const homeTab = isCrystalMode ? 'crystal_mine' : 'mine';
  const showGo = objective.tab !== homeTab;

  return (
    <View style={styles.card}>
      <Icon name="goals" size={16} color={colors.accent} accent={colors.accent} />
      <Text style={styles.text}>{objective.text}</Text>
      {showGo && (
        <Pressable style={styles.go} onPress={() => onGo(objective.tab)} hitSlop={8}>
          <Text style={styles.goText}>Go</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  text: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  go: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  goText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '800',
  },
});
