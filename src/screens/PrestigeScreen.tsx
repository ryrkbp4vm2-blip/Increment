import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BigButton } from '../components/BigButton';
import { PRESTIGE_BASE } from '../game/balance';
import {
  DM_UPGRADES,
  DarkMatterUpgradeDef,
  darkMatterUpgradeCost,
  dmTotalEffect,
} from '../game/darkmatter';
import { effectivePowers } from '../game/powers';
import { darkMatterGain, nextDarkMatterAt, pendingDarkMatter } from '../game/prestige';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber } from '../utils/format';

export function PrestigeScreen() {
  const lifetimeThisRun = useGameStore((s) => s.lifetimeThisRun);
  const darkMatter = useGameStore((s) => s.darkMatter);
  const totalDarkMatter = useGameStore((s) => s.totalDarkMatter);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const dmUpgrades = useGameStore((s) => s.dmUpgrades);
  const artifacts = useGameStore((s) => s.artifacts);
  const doPrestige = useGameStore((s) => s.doPrestige);
  const buyDarkMatterUpgrade = useGameStore((s) => s.buyDarkMatterUpgrade);
  const [confirming, setConfirming] = useState(false);

  const powers = effectivePowers(artifacts, dmUpgrades);
  const pending = pendingDarkMatter(lifetimeThisRun);
  const gain = darkMatterGain(lifetimeThisRun, powers.dmGainMult);
  const nextAt = nextDarkMatterAt(lifetimeThisRun);
  const progress = Math.min(lifetimeThisRun / PRESTIGE_BASE, 1);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🌌 Supernova Collapse</Text>
      <Text style={styles.body}>
        Collapse your empire into Dark Matter — spend it below on permanent upgrades that
        persist through every future collapse. You keep artifacts and the shop; everything else
        in the run resets.
      </Text>

      <View style={styles.statsCard}>
        <StatRow label="Dark Matter to spend" value={`🌑 ${formatNumber(darkMatter)}`} />
        <StatRow label="Earned all-time" value={`🌑 ${formatNumber(totalDarkMatter)}`} />
        <StatRow label="Collapses so far" value={formatNumber(prestigeCount)} />
        <StatRow label="Mined this run" value={`💎 ${formatNumber(lifetimeThisRun)}`} />
        <StatRow
          label={pending > 0 ? 'Next Dark Matter at' : 'First Dark Matter at'}
          value={`💎 ${formatNumber(pending > 0 ? nextAt : PRESTIGE_BASE)}`}
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
            Collapse for +{formatNumber(gain)} Dark Matter? This resets your minerals,
            generators and upgrades.
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
              ? `Collapse for +${formatNumber(gain)} Dark Matter`
              : 'Not enough minerals mined yet'
          }
          color={colors.darkMatter}
          disabled={pending < 1}
          onPress={() => setConfirming(true)}
        />
      )}

      <Text style={styles.shopTitle}>🌑 Dark Matter Shop</Text>
      <Text style={styles.shopHint}>Permanent upgrades. Effects stack and survive collapses.</Text>
      {DM_UPGRADES.map((def) => (
        <DarkMatterRow
          key={def.id}
          def={def}
          level={dmUpgrades[def.id] ?? 0}
          balance={darkMatter}
          onBuy={() => buyDarkMatterUpgrade(def.id)}
        />
      ))}
    </ScrollView>
  );
}

function DarkMatterRow({
  def,
  level,
  balance,
  onBuy,
}: {
  def: DarkMatterUpgradeDef;
  level: number;
  balance: number;
  onBuy: () => void;
}) {
  const maxed = level >= def.maxLevel;
  const cost = darkMatterUpgradeCost(def, level);
  const affordable = !maxed && balance >= cost;

  return (
    <View style={styles.dmRow}>
      <Text style={styles.dmEmoji}>{def.emoji}</Text>
      <View style={styles.dmInfo}>
        <Text style={styles.dmName}>
          {def.name} <Text style={styles.dmLevel}>Lv {level}/{def.maxLevel}</Text>
        </Text>
        <Text style={styles.dmDesc}>{def.perLevel}</Text>
        {level > 0 && <Text style={styles.dmCurrent}>Now: {dmTotalEffect(def, level)}</Text>}
      </View>
      <Pressable
        onPress={onBuy}
        disabled={!affordable}
        style={[styles.dmBuy, maxed && styles.dmMaxed, !affordable && !maxed && styles.dmBuyDisabled]}
      >
        {maxed ? (
          <Text style={styles.dmMaxedText}>MAX</Text>
        ) : (
          <Text style={[styles.dmBuyText, !affordable && styles.dmBuyTextDisabled]}>
            🌑 {formatNumber(cost)}
          </Text>
        )}
      </Pressable>
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
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
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
    fontSize: 13,
    lineHeight: 19,
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
  shopTitle: {
    color: colors.darkMatter,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.xl,
  },
  shopHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  dmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dmEmoji: {
    fontSize: 26,
    marginRight: spacing.md,
  },
  dmInfo: {
    flex: 1,
  },
  dmName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  dmLevel: {
    color: colors.darkMatter,
    fontWeight: '700',
  },
  dmDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  dmCurrent: {
    color: colors.accent,
    fontSize: 11,
    marginTop: 2,
  },
  dmBuy: {
    backgroundColor: '#C084FC22',
    borderWidth: 1,
    borderColor: colors.darkMatter,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 76,
  },
  dmBuyDisabled: {
    borderColor: colors.disabled,
    backgroundColor: 'transparent',
  },
  dmMaxed: {
    borderColor: colors.gold,
    backgroundColor: 'transparent',
  },
  dmBuyText: {
    color: colors.darkMatter,
    fontSize: 13,
    fontWeight: '700',
  },
  dmBuyTextDisabled: {
    color: colors.disabled,
  },
  dmMaxedText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '800',
  },
});
