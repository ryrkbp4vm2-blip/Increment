import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GeneratorRow } from '../components/GeneratorRow';
import { UpgradeCard } from '../components/UpgradeCard';
import { GENERATORS, REVEAL_FRACTION, UPGRADES } from '../game/balance';
import { isUnlockMet } from '../game/math';
import { BuyQty } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';

const QTY_OPTIONS: BuyQty[] = [1, 10, 'max'];

export function ShopScreen() {
  const [qty, setQty] = useState<BuyQty>(1);

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
  const visibleUpgrades = UPGRADES.filter((u) => visibleUpgradeIds.split(',').includes(u.id));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {visibleUpgrades.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Upgrades</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.upgradeRow}>
            {visibleUpgrades.map((u) => (
              <UpgradeCard key={u.id} def={u} />
            ))}
          </ScrollView>
        </>
      )}

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
});
