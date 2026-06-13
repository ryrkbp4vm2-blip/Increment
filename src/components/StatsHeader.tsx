import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { frenzyFactor } from '../game/events';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber, formatRate } from '../utils/format';

export function StatsHeader() {
  const minerals = useGameStore((s) => s.minerals);
  const cps = useGameStore((s) => s.cachedCps);
  const darkMatter = useGameStore((s) => s.darkMatter);
  const frenzyUntil = useGameStore((s) => s.frenzyUntil);
  const frenzyMult = useGameStore((s) => s.frenzyMult);

  // The header re-renders every tick (minerals changes), so reading the
  // clock during render keeps the frenzy countdown fresh.
  const now = Date.now();
  const frenzy = frenzyFactor({ frenzyUntil, frenzyMult }, now);
  const frenzySecondsLeft = Math.ceil((frenzyUntil - now) / 1000);

  return (
    <View style={styles.header}>
      <View style={styles.center}>
        <Text style={styles.minerals}>💎 {formatNumber(minerals)}</Text>
        <Text style={[styles.rate, frenzy > 1 && styles.rateFrenzy]}>
          {formatRate(cps * frenzy)}
          {frenzy > 1 ? `  ☄️×${frenzyMult} ${frenzySecondsLeft}s` : ''}
        </Text>
      </View>
      {darkMatter > 0 && (
        <View style={styles.dmBadge}>
          <Text style={styles.dmText}>🌑 {formatNumber(darkMatter)}</Text>
          <Text style={styles.dmBonus}>+{formatNumber(darkMatter * 2)}%</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  center: {
    alignItems: 'center',
  },
  minerals: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  rate: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  rateFrenzy: {
    color: colors.gold,
  },
  dmBadge: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.md,
    alignItems: 'flex-end',
  },
  dmText: {
    color: colors.darkMatter,
    fontSize: 14,
    fontWeight: '700',
  },
  dmBonus: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
