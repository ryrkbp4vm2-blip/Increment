import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BigButton } from '../components/BigButton';
import { DARK_MATTER_BONUS, PRESTIGE_DIVISOR } from '../game/balance';
import { darkMatterMultiplier, nextDarkMatterAt, pendingDarkMatter } from '../game/prestige';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber } from '../utils/format';

export function PrestigeScreen() {
  const lifetimeThisRun = useGameStore((s) => s.lifetimeThisRun);
  const darkMatter = useGameStore((s) => s.darkMatter);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const doPrestige = useGameStore((s) => s.doPrestige);
  const [confirming, setConfirming] = useState(false);

  const pending = pendingDarkMatter(lifetimeThisRun);
  const nextAt = nextDarkMatterAt(lifetimeThisRun);
  const progress = Math.min(lifetimeThisRun / PRESTIGE_DIVISOR, 1);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>🌌 Supernova Collapse</Text>
      <Text style={styles.body}>
        Collapse your empire into Dark Matter. You lose all minerals, generators and upgrades —
        but each Dark Matter boosts ALL production and taps by {DARK_MATTER_BONUS * 100}%,
        forever.
      </Text>

      <View style={styles.statsCard}>
        <StatRow label="Dark Matter held" value={`🌑 ${formatNumber(darkMatter)}`} />
        <StatRow
          label="Current bonus"
          value={`×${darkMatterMultiplier(darkMatter).toFixed(2)}`}
        />
        <StatRow label="Collapses so far" value={formatNumber(prestigeCount)} />
        <StatRow label="Mined this run" value={`💎 ${formatNumber(lifetimeThisRun)}`} />
        <StatRow
          label={pending > 0 ? 'Next Dark Matter at' : 'First Dark Matter at'}
          value={`💎 ${formatNumber(pending > 0 ? nextAt : PRESTIGE_DIVISOR)}`}
        />
      </View>

      {pending < 1 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}

      {confirming ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>
            Collapse for +{formatNumber(pending)} Dark Matter (+{formatNumber(pending * 2)}%
            forever)? This resets your run.
          </Text>
          <View style={styles.confirmButtons}>
            <BigButton
              label="Collapse!"
              color={colors.darkMatter}
              onPress={() => {
                doPrestige();
                setConfirming(false);
              }}
              style={styles.confirmButton}
            />
            <BigButton
              label="Not yet"
              color={colors.panelLight}
              onPress={() => setConfirming(false)}
              style={styles.confirmButton}
            />
          </View>
        </View>
      ) : (
        <BigButton
          label={
            pending >= 1
              ? `Collapse for +${formatNumber(pending)} Dark Matter`
              : 'Not enough minerals mined yet'
          }
          sublabel={pending >= 1 ? `+${formatNumber(pending * 2)}% production forever` : undefined}
          color={colors.darkMatter}
          disabled={pending < 1}
          onPress={() => setConfirming(true)}
        />
      )}
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    color: colors.darkMatter,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statsCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  statValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.darkMatter,
  },
  confirmBox: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.darkMatter,
    padding: spacing.lg,
  },
  confirmText: {
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmButton: {
    flex: 1,
  },
});
