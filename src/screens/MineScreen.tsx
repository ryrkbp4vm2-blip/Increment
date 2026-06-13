import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Asteroid } from '../components/Asteroid';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber } from '../utils/format';

export function MineScreen() {
  const tapValue = useGameStore((s) => s.cachedTapValue);
  const totalTaps = useGameStore((s) => s.totalTaps);

  return (
    <View style={styles.screen}>
      <View style={styles.spacer} />
      <Asteroid />
      <View style={styles.stats}>
        <Text style={styles.tapValue}>⛏️ {formatNumber(tapValue)} per tap</Text>
        <Text style={styles.taps}>{formatNumber(totalTaps)} taps all time</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  stats: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  tapValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  taps: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
