import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Asteroid } from '../components/Asteroid';
import { Comet } from '../components/Comet';
import { CosmicEvent } from '../components/CosmicEvent';
import { CometArt } from '../components/art/CometArt';
import { Icon } from '../components/art/Icon';
import { asteroidHp, asteroidName, asteroidRichness, isBoss } from '../game/asteroids';
import { CometReward } from '../game/events';
import { decayHeat, heatMultiplier } from '../game/heat';
import { sectorName, sectorTrait } from '../game/zones';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber } from '../utils/format';

type Banner = { kind: 'shatter' | 'comet'; text: string };

export function MineScreen() {
  const tapValue = useGameStore((s) => s.cachedTapValue);
  const totalTaps = useGameStore((s) => s.totalTaps);
  const asteroidIndex = useGameStore((s) => s.asteroidIndex);
  const asteroidDamage = useGameStore((s) => s.asteroidDamage);
  const sector = useGameStore((s) => s.sector);
  const tapHeat = useGameStore((s) => s.tapHeat);
  const lastTapAt = useGameStore((s) => s.lastTapAt);
  // Local clock so the heat bar drains smoothly between taps. Seeded with the
  // real time — starting at 0 made the first render compute a hugely negative
  // decay interval and flash a full heat bar on every remount.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 120);
    return () => clearInterval(id);
  }, []);
  const heat = decayHeat(tapHeat, clock - lastTapAt);
  const collectComet = useGameStore((s) => s.collectComet);
  const [banner, setBanner] = useState<Banner | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIndex = useRef(asteroidIndex);

  const showBanner = (b: Banner) => {
    setBanner(b);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 4000);
  };

  useEffect(() => {
    if (asteroidIndex > prevIndex.current) {
      showBanner({
        kind: 'shatter',
        text: `Asteroid shattered! ${asteroidName(asteroidIndex)} is ×${asteroidRichness(
          asteroidIndex,
        ).toFixed(2)} richer`,
      });
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
    showBanner({
      kind: 'comet',
      text:
        reward.kind === 'frenzy'
          ? `FRENZY! ×${reward.mult} production for ${Math.round(reward.durationMs / 1000)}s`
          : `Windfall! +${formatNumber(reward.amount)} minerals`,
    });
  };

  const hp = asteroidHp(asteroidIndex, sector);
  const integrity = Math.max(0, 1 - asteroidDamage / hp);
  const boss = isBoss(asteroidIndex);
  const trait = sectorTrait(sector);

  return (
    <View style={styles.screen}>
      <Comet onCollect={handleComet} />
      <CosmicEvent />
      {banner && (
        <View style={styles.banner}>
          {banner.kind === 'comet' ? <CometArt size={20} /> : <Icon name="burst" size={18} />}
          <Text style={styles.bannerText}>{banner.text}</Text>
        </View>
      )}
      <View style={styles.asteroidInfo}>
        {boss && (
          <View style={styles.bossTag}>
            <Text style={styles.bossTagText}>BOSS</Text>
          </View>
        )}
        <Text style={styles.sectorLabel}>
          {sectorName(sector)}
          <Text style={styles.sectorTrait}>  ·  {trait.trait}</Text>
        </Text>
        {sector > 0 && <Text style={styles.sectorBlurb}>{trait.blurb}</Text>}
        <Text style={[styles.asteroidName, boss && styles.bossName]}>{asteroidName(asteroidIndex)}</Text>
        <Text style={styles.richness}>
          Belt richness ×{asteroidRichness(asteroidIndex).toFixed(2)}
        </Text>
        <View style={styles.integrityTrack}>
          <View
            style={[
              styles.integrityFill,
              boss && styles.integrityFillBoss,
              { width: `${integrity * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.integrityLabel}>
          Integrity {formatNumber(Math.max(0, hp - asteroidDamage))} / {formatNumber(hp)}
        </Text>
      </View>
      <View style={styles.spacer} />
      <Asteroid />
      <View style={styles.stats}>
        {heat > 0.02 && (
          <View style={styles.heatWrap}>
            <View style={styles.heatTrack}>
              <View
                style={[
                  styles.heatFill,
                  { width: `${Math.min(heat, 1) * 100}%`, backgroundColor: heat > 0.66 ? colors.danger : colors.gold },
                ]}
              />
            </View>
            <Text style={styles.heatLabel}>DRILL HEAT ×{heatMultiplier(heat).toFixed(1)}</Text>
          </View>
        )}
        <View style={styles.tapRow}>
          <Icon name="mine" size={15} color={colors.text} accent={colors.text} />
          <Text style={styles.tapValue}>{formatNumber(tapValue)} per tap</Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: '92%',
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
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  tapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heatWrap: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    width: 200,
  },
  heatTrack: {
    height: 7,
    width: '100%',
    borderRadius: 4,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  heatFill: {
    height: '100%',
  },
  heatLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
    letterSpacing: 1,
  },
  asteroidInfo: {
    alignItems: 'center',
    marginTop: spacing.xl + spacing.lg,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  sectorLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectorTrait: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  sectorBlurb: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
    maxWidth: 280,
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
  integrityFillBoss: {
    backgroundColor: colors.danger,
  },
  bossTag: {
    backgroundColor: '#F8717122',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: 4,
  },
  bossTagText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  bossName: {
    color: colors.danger,
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
