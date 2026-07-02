import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  crystalFormationBonus,
  crystalFormationHp,
  crystalFormationName,
  formationDepthBonus,
} from '../game/crystalGame';
import { decayHeat, heatMultiplier } from '../game/heat';
import { CometReward } from '../game/events';
import { CrystalComet } from '../components/CrystalComet';
import { playSound } from '../audio/sound';
import { hapticShatter, hapticTap } from '../haptics';
import { useShake } from '../hooks/useShake';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber, formatRate } from '../utils/format';

type FloatId = { id: number; text: string; x: number };

export function CrystalMineScreen() {
  const crystals = useGameStore((s) => s.crystals);
  const crystalTap = useGameStore((s) => s.crystalTap);
  const collectComet = useGameStore((s) => s.collectComet);
  const formationIndex = useGameStore((s) => s.crystalFormationIndex);
  const formationDamage = useGameStore((s) => s.crystalFormationDamage);
  const cachedCrystalCps = useGameStore((s) => s.cachedCrystalCps);
  const cachedCrystalTapValue = useGameStore((s) => s.cachedCrystalTapValue);
  const tapHeat = useGameStore((s) => s.tapHeat);
  const lastTapAt = useGameStore((s) => s.lastTapAt);

  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
  }, []);

  const handleGeode = (reward: CometReward) => {
    collectComet(reward, Date.now());
    setBanner(
      reward.kind === 'frenzy'
        ? `RESONANCE SURGE! ×${reward.mult} production for ${Math.round(reward.durationMs / 1000)}s`
        : `Geode windfall! +${formatNumber(reward.amount)} ✦`,
    );
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 4000);
  };

  const hp = crystalFormationHp(formationIndex);
  const integrity = Math.max(0, 1 - formationDamage / hp);
  const bonus = crystalFormationBonus(formationIndex);

  // Local clock so the Drill Heat bar drains smoothly between taps. Seeded
  // with the real time so a remount doesn't compute a negative decay interval.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 120);
    return () => clearInterval(id);
  }, []);
  const heat = decayHeat(tapHeat, clock - lastTapAt);

  const scale = useRef(new Animated.Value(1)).current;
  const { shakeStyle, shake } = useShake();
  const [lastShatter, setLastShatter] = useState(-1);
  const [floats, setFloats] = useState<FloatId[]>([]);
  const floatSeq = useRef(0);
  // Bumps on each shatter so the burst remounts and replays.
  const [burstKey, setBurstKey] = useState(0);

  // Detect shatter (formation index increased).
  useEffect(() => {
    if (formationIndex > lastShatter && lastShatter >= 0) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
      setBurstKey((k) => k + 1);
      shake(7);
      playSound('shatter');
      hapticShatter(false);
    }
    setLastShatter(formationIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationIndex]);

  const handleTap = () => {
    const gained = crystalTap();
    hapticTap();
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    // Floating "+N" feedback, jittered horizontally so rapid taps don't stack.
    const id = floatSeq.current++;
    const x = (Math.random() - 0.5) * 80;
    setFloats((f) => [...f.slice(-6), { id, text: `+${formatNumber(gained)}`, x }]);
    setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 900);
  };

  return (
    <Animated.View style={[styles.screen, shakeStyle]}>
      <CrystalComet onCollect={handleGeode} />
      {banner && (
        <View style={styles.banner}>
          <Text style={styles.bannerGlyph}>✦</Text>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      )}
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
        {burstKey > 0 && <ShatterBurst key={burstKey} />}
        {floats.map((f) => (
          <FloatingGain key={f.id} text={f.text} x={f.x} />
        ))}
      </View>

      {heat > 0.02 && (
        <View style={styles.heatWrap}>
          <View style={styles.heatTrack}>
            <View
              style={[
                styles.heatFill,
                {
                  width: `${Math.min(heat, 1) * 100}%`,
                  backgroundColor: heat > 0.66 ? colors.gold : colors.darkMatter,
                },
              ]}
            />
          </View>
          <Text style={styles.heatLabel}>RESONANCE HEAT ×{heatMultiplier(heat).toFixed(1)}</Text>
        </View>
      )}

      <View style={styles.stats}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>✦ per tap</Text>
          <Text style={styles.statValue}>
            {formatNumber(cachedCrystalTapValue * formationDepthBonus(formationIndex))}
          </Text>
        </View>
        {cachedCrystalCps > 0 && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>✦ per second</Text>
            <Text style={styles.statValue}>
              {formatRate(cachedCrystalCps * formationDepthBonus(formationIndex))}
            </Text>
          </View>
        )}
        {formationIndex >= 5 && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Formation depth bonus</Text>
            <Text style={[styles.statValue, styles.depthBonus]}>
              +{Math.round((formationDepthBonus(formationIndex) - 1) * 100)}%
            </Text>
          </View>
        )}
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Crystals</Text>
          <Text style={[styles.statValue, styles.crystalBalance]}>{formatNumber(crystals)} ✦</Text>
        </View>
      </View>
    </Animated.View>
  );
}

/** A radial burst of shards thrown out when a formation shatters. */
const SHARD_COUNT = 10;
function ShatterBurst() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 650, useNativeDriver: true }).start();
  }, [t]);
  const opacity = t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });
  return (
    <View style={styles.burst} pointerEvents="none">
      {Array.from({ length: SHARD_COUNT }).map((_, i) => {
        const angle = (i / SHARD_COUNT) * Math.PI * 2;
        const dist = 70 + (i % 3) * 18;
        const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] });
        const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist] });
        const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
        return (
          <Animated.Text
            key={i}
            style={[styles.shard, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]}
          >
            ✦
          </Animated.Text>
        );
      })}
    </View>
  );
}

/** A "+N" that rises and fades after a tap. */
function FloatingGain({ text, x }: { text: string; x: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 900, useNativeDriver: true }).start();
  }, [t]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -70] });
  const opacity = t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
  return (
    <Animated.Text
      style={[styles.float, { opacity, transform: [{ translateX: x }, { translateY }] }]}
      pointerEvents="none"
    >
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  float: {
    position: 'absolute',
    color: colors.darkMatter,
    fontSize: 20,
    fontWeight: '800',
  },
  burst: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shard: {
    position: 'absolute',
    color: colors.darkMatter,
    fontSize: 18,
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
    borderColor: colors.darkMatter,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    zIndex: 30,
  },
  bannerGlyph: {
    color: colors.darkMatter,
    fontSize: 16,
    fontWeight: '800',
  },
  bannerText: {
    color: colors.darkMatter,
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  heatWrap: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    width: 200,
    alignSelf: 'center',
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
    color: colors.darkMatter,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
    letterSpacing: 1,
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
  depthBonus: {
    color: colors.accent,
  },
});
