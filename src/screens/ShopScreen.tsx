import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { GeneratorRow } from '../components/GeneratorRow';
import { UpgradeCard } from '../components/UpgradeCard';
import { Icon } from '../components/art/Icon';
import { AUTO_UPGRADE_ASCENSIONS } from '../game/ascension';
import { GENERATORS, REVEAL_FRACTION, UPGRADES } from '../game/balance';
import { isUnlockMet } from '../game/math';
import { BuyQty } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';

const QTY_OPTIONS: BuyQty[] = [1, 10, 'max'];

export function ShopScreen() {
  // The buy-quantity choice is remembered in the store, so it survives tab
  // switches, app restarts and every reset.
  const qty = useGameStore((s) => s.buyQty);
  const setQty = useGameStore((s) => s.setBuyQty);
  const ascensionCount = useGameStore((s) => s.ascensionCount);
  const autoUpgrade = useGameStore((s) => s.autoUpgrade);
  const toggleAutoUpgrade = useGameStore((s) => s.toggleAutoUpgrade);
  const autoUpgradeUnlocked = ascensionCount >= AUTO_UPGRADE_ASCENSIONS;

  // Reveal generators once lifetime earnings approach their cost; never re-hide.
  const revealedCount = useGameStore((s) => {
    let count = 0;
    for (const def of GENERATORS) {
      if (
        (s.generators[def.id] ?? 0) > 0 ||
        s.lifetimeThisRun >= def.baseCost * REVEAL_FRACTION
      ) {
        count++;
      } else {
        break;
      }
    }
    return Math.max(count, 1);
  });

  const visibleUpgradeIds = useGameStore((s) =>
    UPGRADES.filter((u) => !s.upgrades[u.id] && isUnlockMet(u.unlock, s))
      .map((u) => u.id)
      .join(','),
  );
  const visibleUpgrades = UPGRADES.filter((u) => visibleUpgradeIds.split(',').includes(u.id)).sort(
    (a, b) => a.cost - b.cost,
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {autoUpgradeUnlocked ? (
        <View style={styles.autoRow}>
          <View style={styles.autoLabel}>
            <Icon name="prestige" size={18} color={colors.accent} accent={colors.accent} />
            <Text style={styles.autoText}>Auto-Buy Upgrades</Text>
          </View>
          <Switch
            value={autoUpgrade}
            onValueChange={toggleAutoUpgrade}
            trackColor={{ true: colors.accent, false: colors.disabled }}
            thumbColor={colors.text}
          />
        </View>
      ) : ascensionCount >= 1 ? (
        <View style={styles.autoRowLocked}>
          <Icon name="lock" size={16} color={colors.textMuted} accent={colors.textMuted} />
          <Text style={styles.autoLockedText}>
            Auto-Buy Upgrades auto-purchases shop upgrades — unlocks after{' '}
            {AUTO_UPGRADE_ASCENSIONS} ascensions
          </Text>
        </View>
      ) : null}

      <View style={styles.generatorHeader}>
        <Text style={styles.sectionTitle}>Generators</Text>
        <View style={styles.qtyToggle}>
          {QTY_OPTIONS.map((option) => (
            <Pressable
              key={String(option)}
              onPress={() => setQty(option)}
              style={[styles.qtyButton, qty === option && styles.qtyButtonActive]}
            >
              <Text style={[styles.qtyLabel, qty === option && styles.qtyLabelActive]}>
                {option === 'max' ? 'Max' : `×${option}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {GENERATORS.slice(0, revealedCount).map((def) => (
        <GeneratorRow key={def.id} def={def} qty={qty} />
      ))}
      {revealedCount < GENERATORS.length && (
        <Text style={styles.hidden}>Keep mining to discover more technology…</Text>
      )}

      {visibleUpgrades.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Upgrades</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.upgradeRow}>
            {visibleUpgrades.map((u) => (
              <UpgradeCard key={u.id} def={u} />
            ))}
          </ScrollView>
        </>
      )}
    </ScrollView>
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
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  upgradeRow: {
    marginBottom: spacing.lg,
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  autoLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  autoText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  autoRowLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  autoLockedText: { flex: 1, color: colors.textMuted, fontSize: 12 },
  generatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyToggle: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  qtyButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: 9,
  },
  qtyButtonActive: {
    backgroundColor: colors.accentDim,
  },
  qtyLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  qtyLabelActive: {
    color: colors.accent,
  },
  hidden: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
});
