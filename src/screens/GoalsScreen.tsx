import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/art/Icon';
import {
  ACHIEVEMENTS,
  AchievementDef,
  achievementBonus,
  computeMetrics,
  isMet,
  metricValue,
} from '../game/achievements';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber } from '../utils/format';

export function GoalsScreen() {
  // Re-render as the relevant counters change.
  const lifetimeAllTime = useGameStore((s) => s.lifetimeAllTime);
  const totalTaps = useGameStore((s) => s.totalTaps);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const ascensionCount = useGameStore((s) => s.ascensionCount);
  const totalDarkMatter = useGameStore((s) => s.totalDarkMatter);
  const asteroidsShattered = useGameStore((s) => s.asteroidsShattered);
  const cometsCaught = useGameStore((s) => s.cometsCaught);
  const expeditionsCompleted = useGameStore((s) => s.expeditionsCompleted);
  const artifacts = useGameStore((s) => s.artifacts);
  const generators = useGameStore((s) => s.generators);
  const completed = useGameStore((s) => s.achievements);
  const resonance = useGameStore((s) => s.resonance);
  const totalCrystals = useGameStore((s) => s.totalCrystals);
  const crystalFormationsShattered = useGameStore((s) => s.crystalFormationsShattered);
  const convergenceCount = useGameStore((s) => s.convergenceCount);
  const totalEons = useGameStore((s) => s.totalEons);

  const metrics = computeMetrics({
    lifetimeAllTime,
    totalTaps,
    prestigeCount,
    ascensionCount,
    totalDarkMatter,
    asteroidsShattered,
    cometsCaught,
    expeditionsCompleted,
    artifacts,
    generators,
    resonance,
    totalCrystals,
    crystalFormationsShattered,
    convergenceCount,
    totalEons,
  });

  const doneCount = Object.keys(completed).length;
  const bonusPct = Math.round((achievementBonus(completed) - 1) * 100);

  // Unlocked first, then in-progress (closest to completion first).
  const sorted = [...ACHIEVEMENTS].sort((a, b) => {
    const da = completed[a.id] ? 1 : 0;
    const db = completed[b.id] ? 1 : 0;
    if (da !== db) return db - da;
    if (da === 0) {
      return metricValue(b, metrics) / b.threshold - metricValue(a, metrics) / a.threshold;
    }
    return 0;
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Icon name="goals" size={22} />
        <Text style={styles.title}>Goals</Text>
      </View>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {doneCount}/{ACHIEVEMENTS.length} unlocked
        </Text>
        <Text style={styles.summaryBonus}>+{bonusPct}% production</Text>
      </View>
      <Text style={styles.hint}>Each goal grants a permanent production bonus.</Text>

      {sorted.map((def) => (
        <GoalRow key={def.id} def={def} done={!!completed[def.id]} metrics={metrics} />
      ))}
    </ScrollView>
  );
}

function GoalRow({
  def,
  done,
  metrics,
}: {
  def: AchievementDef;
  done: boolean;
  metrics: ReturnType<typeof computeMetrics>;
}) {
  const current = metricValue(def, metrics);
  const progress = Math.min(current / def.threshold, 1);
  const met = isMet(def, metrics);

  return (
    <View style={[styles.row, done && styles.rowDone]}>
      <View style={[styles.badge, done && styles.badgeDone]}>
        <Icon name={done ? 'check' : 'lock'} size={18} color={colors.textMuted} accent={colors.gold} />
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, done && styles.nameDone]}>{def.name}</Text>
          <Text style={styles.bonus}>+{Math.round(def.bonusPct * 100)}%</Text>
        </View>
        <Text style={styles.desc}>{def.description}</Text>
        {!done && (
          <>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {formatNumber(Math.min(current, def.threshold))} / {formatNumber(def.threshold)}
              {met ? ' — claiming…' : ''}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  summaryText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  summaryBonus: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowDone: { borderColor: colors.gold },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.panelLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  badgeDone: { backgroundColor: '#FACC1522' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  nameDone: { color: colors.gold },
  bonus: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  desc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.background,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  fill: { height: '100%', backgroundColor: colors.accent },
  progressText: { color: colors.textMuted, fontSize: 11, marginTop: 3, fontVariant: ['tabular-nums'] },
});
