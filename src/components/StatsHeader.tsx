import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../audio/sound';
import { dailyAvailable } from '../game/daily';
import { frenzyFactor } from '../game/events';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber, formatRate } from '../utils/format';
import { CometArt } from './art/CometArt';
import { Icon } from './art/Icon';

interface Props {
  onOpenSettings: () => void;
}

export function StatsHeader({ onOpenSettings }: Props) {
  const minerals = useGameStore((s) => s.minerals);
  const cps = useGameStore((s) => s.cachedCps);
  const darkMatter = useGameStore((s) => s.darkMatter);
  const frenzyUntil = useGameStore((s) => s.frenzyUntil);
  const frenzyMult = useGameStore((s) => s.frenzyMult);
  const lastDailyAt = useGameStore((s) => s.lastDailyAt);
  const claimDaily = useGameStore((s) => s.claimDaily);
  const [dailyMsg, setDailyMsg] = useState<string | null>(null);

  // The header re-renders every tick (minerals changes), so reading the
  // clock during render keeps the frenzy countdown fresh.
  const now = Date.now();
  const frenzy = frenzyFactor({ frenzyUntil, frenzyMult }, now);
  const frenzySecondsLeft = Math.ceil((frenzyUntil - now) / 1000);
  const dailyReady = dailyAvailable(lastDailyAt, now);

  const onClaimDaily = () => {
    const result = claimDaily(Date.now());
    if (!result) return;
    playSound('prestige');
    setDailyMsg(`+${formatNumber(result.reward)} · day ${result.streak} streak`);
    setTimeout(() => setDailyMsg(null), 3500);
  };

  return (
    <View style={styles.header}>
      <Pressable style={styles.settingsButton} onPress={onOpenSettings} hitSlop={12}>
        <Icon name="settings" size={20} color={colors.textMuted} accent={colors.textMuted} />
      </Pressable>
      <View style={styles.center}>
        <View style={styles.mineralRow}>
          <Icon name="mineral" size={26} />
          <Text style={styles.minerals}>{formatNumber(minerals)}</Text>
        </View>
        <View style={styles.rateRow}>
          <Text style={[styles.rate, frenzy > 1 && styles.rateFrenzy]}>{formatRate(cps * frenzy)}</Text>
          {frenzy > 1 && (
            <View style={styles.frenzyTag}>
              <CometArt size={16} />
              <Text style={styles.frenzyText}>
                ×{frenzyMult} · {frenzySecondsLeft}s
              </Text>
            </View>
          )}
        </View>
        {dailyMsg ? (
          <Text style={styles.dailyMsg}>{dailyMsg}</Text>
        ) : dailyReady ? (
          <Pressable style={styles.dailyPill} onPress={onClaimDaily}>
            <Icon name="gift" size={15} color={colors.gold} accent={colors.gold} />
            <Text style={styles.dailyText}>Daily bonus — claim</Text>
          </Pressable>
        ) : null}
      </View>
      {darkMatter > 0 && (
        <View style={styles.dmBadge}>
          <View style={styles.dmRow}>
            <Icon name="darkmatter" size={15} />
            <Text style={styles.dmText}>{formatNumber(darkMatter)}</Text>
          </View>
          <Text style={styles.dmBonus}>to spend</Text>
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
  settingsButton: {
    position: 'absolute',
    left: spacing.lg,
    top: spacing.md + 4,
    zIndex: 5,
  },
  center: {
    alignItems: 'center',
  },
  mineralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  minerals: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  rate: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rateFrenzy: {
    color: colors.gold,
  },
  frenzyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  frenzyText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  dailyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    backgroundColor: '#FACC1522',
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
  },
  dailyText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  dailyMsg: { color: colors.gold, fontSize: 12, fontWeight: '700', marginTop: 6 },
  dmBadge: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.md,
    alignItems: 'flex-end',
  },
  dmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
