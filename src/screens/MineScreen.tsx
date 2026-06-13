import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Asteroid } from '../components/Asteroid';
import { Comet } from '../components/Comet';
import { CometReward } from '../game/events';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber } from '../utils/format';

export function MineScreen() {
  const tapValue = useGameStore((s) => s.cachedTapValue);
  const totalTaps = useGameStore((s) => s.totalTaps);
  const collectComet = useGameStore((s) => s.collectComet);
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  const handleComet = (reward: CometReward) => {
    collectComet(reward, Date.now());
    setBanner(
      reward.kind === 'frenzy'
        ? `☄️ FRENZY! ×${reward.mult} production for ${reward.durationMs / 1000}s`
        : `☄️ Windfall! +💎 ${formatNumber(reward.amount)}`,
    );
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 4000);
  };

  return (
    <View style={styles.screen}>
      <Comet onCollect={handleComet} />
      {banner && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      )}
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
  banner: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    backgroundColor: colors.panelLight,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    zIndex: 30,
  },
  bannerText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '800',
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
