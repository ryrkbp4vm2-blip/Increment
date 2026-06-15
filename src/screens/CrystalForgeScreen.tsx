import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../audio/sound';
import {
  CRYSTAL_GENS,
  CRYSTAL_GEN_UPGRADES,
  CrystalGenDef,
  CrystalGenUpgradeDef,
  crystalGenBulkCost,
  crystalGenCostOfNext,
  crystalGenMaxAffordable,
  crystalGenProduction,
  crystalRunPowers,
  crystalUpgradeUnlockMet,
  resonanceMult,
} from '../game/crystalGame';
import { crystalPowers } from '../game/transcend';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber, formatRate } from '../utils/format';
import { Icon, IconName } from '../components/art/Icon';

type BuyQty = 1 | 10 | 'max';
const QTY_OPTIONS: BuyQty[] = [1, 10, 'max'];

export function CrystalForgeScreen() {
  const [qty, setQty] = useState<BuyQty>(1);
  const crystals = useGameStore((s) => s.crystals);
  const crystalGenerators = useGameStore((s) => s.crystalGenerators);
  const crystalUpgrades = useGameStore((s) => s.crystalUpgrades);
  const crystalRunUpgrades = useGameStore((s) => s.crystalRunUpgrades);
  const lifetimeCrystals = useGameStore((s) => s.lifetimeCrystals);
  const resonance = useGameStore((s) => s.resonance);
  const buyCrystalGenerator = useGameStore((s) => s.buyCrystalGenerator);
  const buyCrystalRunUpgrade = useGameStore((s) => s.buyCrystalRunUpgrade);

  const runPowers = crystalRunPowers(crystalRunUpgrades);
  // Effective global multiplier shared by every generator line (matrix × resonance × run).
  const baseGlobalMult =
    crystalPowers(crystalUpgrades).globalMult * resonanceMult(resonance) * runPowers.globalMult;

  // Upgrades that are unlocked and not yet owned.
  const availableUpgrades = CRYSTAL_GEN_UPGRADES.filter(
    (u) =>
      !crystalRunUpgrades[u.id] &&
      crystalUpgradeUnlockMet(u, { crystalGenerators, lifetimeCrystals }),
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {availableUpgrades.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Forge Upgrades</Text>
          <Text style={styles.hint}>One-time boosts for this run. Reset on each Cascade.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.upgradeRow}>
            {availableUpgrades.map((def) => (
              <CrystalUpgradeCard
                key={def.id}
                def={def}
                affordable={crystals >= def.cost}
                onBuy={() => {
                  buyCrystalRunUpgrade(def.id);
                  playSound('buy');
                }}
              />
            ))}
          </ScrollView>
        </>
      )}

      <View style={styles.generatorHeader}>
        <Text style={styles.sectionTitle}>Crystal Generators</Text>
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
      <Text style={styles.hint}>Buy generators to auto-produce Crystals per second.</Text>

      {CRYSTAL_GENS.map((def) => (
        <CrystalGenRow
          key={def.id}
          def={def}
          owned={crystalGenerators[def.id] ?? 0}
          qty={qty}
          crystals={crystals}
          genMult={runPowers.genMult[def.id] ?? 1}
          globalMult={baseGlobalMult}
          onBuy={() => {
            buyCrystalGenerator(def.id, qty);
            playSound('buy');
          }}
        />
      ))}

      <View style={styles.divider} />
      <View style={styles.matrixNote}>
        <Icon name="gem_outline" size={20} color={colors.darkMatter} accent={colors.darkMatter} />
        <Text style={styles.matrixNoteText}>
          The permanent Crystal Matrix is now bought with Attunement (◈) on the Prestige tab —
          earn it by triggering a Resonance Cascade.
        </Text>
      </View>
    </ScrollView>
  );
}

function CrystalUpgradeCard({
  def,
  affordable,
  onBuy,
}: {
  def: CrystalGenUpgradeDef;
  affordable: boolean;
  onBuy: () => void;
}) {
  return (
    <Pressable
      onPress={onBuy}
      disabled={!affordable}
      style={[styles.upgradeCard, !affordable && styles.upgradeCardDisabled]}
    >
      <Text style={styles.upgradeName}>{def.name}</Text>
      <Text style={styles.upgradeDesc}>{def.description}</Text>
      <Text style={[styles.upgradeCost, !affordable && styles.upgradeCostDisabled]}>
        {formatNumber(def.cost)} ✦
      </Text>
    </Pressable>
  );
}

function CrystalGenRow({
  def,
  owned,
  qty,
  crystals,
  genMult,
  globalMult,
  onBuy,
}: {
  def: CrystalGenDef;
  owned: number;
  qty: BuyQty;
  crystals: number;
  genMult: number;
  globalMult: number;
  onBuy: () => void;
}) {
  const count = qty === 'max' ? crystalGenMaxAffordable(def, owned, crystals) : qty;
  const cost =
    qty === 'max'
      ? count > 0
        ? crystalGenBulkCost(def, owned, count)
        : crystalGenCostOfNext(def, owned)
      : crystalGenBulkCost(def, owned, qty);
  const affordable = qty === 'max' ? count > 0 : crystals >= cost;
  const production = crystalGenProduction(def, owned, globalMult, genMult);

  return (
    <View style={styles.genRow}>
      <View style={styles.genIconBox}>
        <Icon name={def.icon as IconName} size={28} color={colors.darkMatter} accent={colors.darkMatter} />
      </View>
      <View style={styles.genInfo}>
        <Text style={styles.genName}>
          {def.name} <Text style={styles.genOwned}>×{owned}</Text>
        </Text>
        <Text style={styles.genDesc}>
          {owned > 0 ? formatRate(production) + ' ✦/s' : def.description}
        </Text>
      </View>
      <Pressable
        onPress={onBuy}
        disabled={!affordable}
        style={[styles.buyButton, !affordable && styles.buyButtonDisabled]}
      >
        <Text style={[styles.buyLabel, !affordable && styles.buyLabelDisabled]}>
          Buy {qty === 'max' ? (count > 0 ? `×${count}` : 'Max') : `×${qty}`}
        </Text>
        <Text style={[styles.buyCost, !affordable && styles.buyLabelDisabled]}>
          {formatNumber(cost)} ✦
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  sectionTitle: {
    color: colors.darkMatter,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.md,
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
  qtyButtonActive: { backgroundColor: '#C084FC22' },
  qtyLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  qtyLabelActive: { color: colors.darkMatter },
  upgradeRow: { marginBottom: spacing.lg },
  upgradeCard: {
    width: 150,
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.darkMatter,
    padding: spacing.md,
    marginRight: spacing.sm,
  },
  upgradeCardDisabled: { borderColor: colors.disabled, opacity: 0.6 },
  upgradeName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  upgradeDesc: { color: colors.textMuted, fontSize: 11, marginTop: 3, minHeight: 28 },
  upgradeCost: { color: colors.darkMatter, fontSize: 13, fontWeight: '800', marginTop: spacing.sm },
  upgradeCostDisabled: { color: colors.disabled },
  genRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  genIconBox: { width: 38, alignItems: 'center', marginRight: spacing.sm },
  genInfo: { flex: 1 },
  genName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  genOwned: { color: colors.textMuted, fontWeight: '600' },
  genDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  buyButton: {
    backgroundColor: '#C084FC22',
    borderWidth: 1,
    borderColor: colors.darkMatter,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 90,
  },
  buyButtonDisabled: { borderColor: colors.disabled, backgroundColor: 'transparent' },
  buyLabel: { color: colors.darkMatter, fontSize: 13, fontWeight: '700' },
  buyCost: { color: colors.darkMatter, fontSize: 12 },
  buyLabelDisabled: { color: colors.disabled },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  matrixNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  matrixNoteText: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 17 },
});
