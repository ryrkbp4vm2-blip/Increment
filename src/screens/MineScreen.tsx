import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Asteroid } from '../components/Asteroid';
import { Comet } from '../components/Comet';
import { asteroidHp, asteroidName, asteroidRichness } from '../game/asteroids';
import { CometReward } from '../game/events';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber } from '../utils/format';

export function MineScreen() {
  const tapValue = useGameStore((s) => s.cachedTapValue);
  const totalTaps = useGameStore((s) => s.totalTaps);
  const asteroidIndex = useGameStore((s) => s.asteroidIndex);
  const asteroidDamage = useGameStore((s) => s.asteroidDamage);
  const collectComet = useGameStore((s) => s.collectComet);
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIndex = useRef(asteroidIndex);

  const showBanner = (text: string) => {
    setBanner(text);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 4000);
  };

  useEffect(() => {
    if (asteroidIndex > prevIndex.current) {
      showBanner(
        `💥 Asteroid shattered! ${asteroidName(asteroidIndex)} is ×${asteroidRichness(
          asteroidIndex,
        ).toFixed(2)} richer`,
      );
    }
    prevIndex.current = asteroidIndex;
  }, [asteroidIndex]);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  const handleComet = (reward: CometReward) => {
    collectComet(reward, Date.now());
    showBanner(
      reward.kind === 'frenzy'
        ? `☄️ FRENZY! ×${reward.mult} production for ${Math.round(reward.durationMs / 1000)}s`
        : `☄️ Windfall! +💎 ${formatNumber(reward.amount)}`,
    );
  };

  const hp = asteroidHp(asteroidIndex);
  const integrity = Math.max(0, 1 - asteroidDamage / hp);

  return (
    <View style={styles.screen}>
      <Comet onCollect={handleComet} />
      {banner && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      )}
      <View style={styles.asteroidInfo}>
        <Text style={styles.asteroidName}>{asteroidName(asteroidIndex)}</Text>
        <Text style={styles.richness}>
          Belt richness ×{asteroidRichness(asteroidIndex).toFixed(2)}
        </Text>
        <View style={styles.integrityTrack}>
          <View style={[styles.integrityFill, { width: `${integrity * 100}%` }]} />
        </View>
        <Text style={styles.integrityLabel}>
          Integrity {formatNumber(Math.max(0, hp - asteroidDamage))} / {formatNumber(hp)}
        </Text>
      </View>
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
  asteroidInfo: {
    alignItems: 'center',
    marginTop: spacing.xl + spacing.lg,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  asteroidName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  richness: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  integrityTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    width: '80%',
    marginTop: spacing.sm,
  },
  integrityFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  integrityLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
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
