import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  crystalFormationBonus,
  crystalFormationHp,
  crystalFormationName,
} from '../game/crystalGame';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber, formatRate } from '../utils/format';

export function CrystalMineScreen() {
  const crystals = useGameStore((s) => s.crystals);
  const crystalTap = useGameStore((s) => s.crystalTap);
  const formationIndex = useGameStore((s) => s.crystalFormationIndex);
  const formationDamage = useGameStore((s) => s.crystalFormationDamage);
  const cachedCrystalCps = useGameStore((s) => s.cachedCrystalCps);
  const cachedCrystalTapValue = useGameStore((s) => s.cachedCrystalTapValue);

  const hp = crystalFormationHp(formationIndex);
  const integrity = Math.max(0, 1 - formationDamage / hp);
  const bonus = crystalFormationBonus(formationIndex);

  const scale = useRef(new Animated.Value(1)).current;
  const [lastShatter, setLastShatter] = useState(-1);

  // Detect shatter (formation index increased).
  useEffect(() => {
    if (formationIndex > lastShatter && lastShatter >= 0) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    }
    setLastShatter(formationIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationIndex]);

  const handleTap = () => {
    crystalTap();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.formationInfo}>
        <Text style={styles.formationName}>{crystalFormationName(formationIndex)}</Text>
        <Text style={styles.formationSub}>Shatter for +{formatNumber(bonus)} ✦ bonus</Text>
        <View style={styles.hpTrack}>
          <View style={[styles.hpFill, { width: `${integrity * 100}%` }]} />
        </View>
        <Text style={styles.hpLabel}>
          {formatNumber(Math.max(0, hp - formationDamage))} / {formatNumber(hp)}
        </Text>
      </View>

      <View style={styles.gemWrap}>
        <Pressable onPress={handleTap}>
          <Animated.View style={[styles.gem, { transform: [{ scale }] }]}>
            <View style={styles.gemInner}>
              <Text style={styles.gemGlyph}>✦</Text>
            </View>
          </Animated.View>
        </Pressable>
      </View>

      <View style={styles.stats}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>✦ per tap</Text>
          <Text style={styles.statValue}>{formatNumber(cachedCrystalTapValue)}</Text>
        </View>
        {cachedCrystalCps > 0 && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>✦ per second</Text>
            <Text style={styles.statValue}>{formatRate(cachedCrystalCps)}</Text>
          </View>
        )}
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Crystals</Text>
          <Text style={[styles.statValue, styles.crystalBalance]}>{formatNumber(crystals)} ✦</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  formationInfo: {
    alignItems: 'center',
    marginTop: spacing.xl + spacing.lg,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  formationName: {
    color: colors.darkMatter,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  formationSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  hpTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    width: '80%',
    marginTop: spacing.sm,
  },
  hpFill: {
    height: '100%',
    backgroundColor: colors.darkMatter,
  },
  hpLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  gemWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gem: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#C084FC22',
    borderWidth: 3,
    borderColor: colors.darkMatter,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.darkMatter,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  gemInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#C084FC18',
    borderWidth: 1,
    borderColor: '#C084FC66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gemGlyph: {
    fontSize: 52,
    color: colors.darkMatter,
  },
  stats: {
    width: '100%',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  statValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  crystalBalance: {
    color: colors.darkMatter,
  },
});
