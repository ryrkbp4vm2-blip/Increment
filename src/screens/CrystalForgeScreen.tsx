import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../audio/sound';
import {
  CRYSTAL_GENS,
  CrystalGenDef,
  crystalGenBulkCost,
  crystalGenCostOfNext,
  crystalGenMaxAffordable,
} from '../game/crystalGame';
import { CRYSTAL_UPGRADES, crystalUpgradeCost, crystalTotalEffect } from '../game/transcend';
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
  const buyCrystalGenerator = useGameStore((s) => s.buyCrystalGenerator);
  const buyCrystalUpgrade = useGameStore((s) => s.buyCrystalUpgrade);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
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
          onBuy={() => {
            buyCrystalGenerator(def.id, qty);
            playSound('buy');
          }}
        />
      ))}

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Crystal Matrix</Text>
      <Text style={styles.hint}>Permanent upgrades that survive every Transcend.</Text>

      {CRYSTAL_UPGRADES.map((def) => {
        const level = crystalUpgrades[def.id] ?? 0;
        const maxed = level >= def.maxLevel;
        const cost = crystalUpgradeCost(def, level);
        const affordable = !maxed && crystals >= cost;
        return (
          <View key={def.id} style={styles.matrixRow}>
            <View style={styles.matrixIconBox}>
              <Icon
                name={def.icon as IconName}
                size={26}
                color={colors.darkMatter}
                accent={colors.darkMatter}
              />
            </View>
            <View style={styles.matrixInfo}>
              <Text style={styles.matrixName}>
                {def.name}{' '}
                <Text style={styles.matrixLevel}>
                  Lv {level}/{def.maxLevel}
                </Text>
              </Text>
              <Text style={styles.matrixDesc}>{def.perLevel}</Text>
              {level > 0 && (
                <Text style={styles.matrixCurrent}>Now: {crystalTotalEffect(def, level)}</Text>
              )}
            </View>
            <Pressable
              onPress={() => {
                buyCrystalUpgrade(def.id);
                playSound('buy');
              }}
              disabled={!affordable}
              style={[
                styles.matrixBuy,
                maxed && styles.matrixMaxed,
                !affordable && !maxed && styles.matrixBuyDisabled,
              ]}
            >
              {maxed ? (
                <Text style={styles.matrixMaxedText}>MAX</Text>
              ) : (
                <Text
                  style={[styles.matrixBuyText, !affordable && styles.matrixBuyTextDisabled]}
                >
                  {cost} ✦
                </Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

function CrystalGenRow({
  def,
  owned,
  qty,
  crystals,
  onBuy,
}: {
  def: CrystalGenDef;
  owned: number;
  qty: BuyQty;
  crystals: number;
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
  const production = owned * def.baseProd;

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
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  matrixIconBox: { width: 34, alignItems: 'center', marginRight: spacing.sm },
  matrixInfo: { flex: 1 },
  matrixName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  matrixLevel: { color: colors.darkMatter, fontWeight: '700' },
  matrixDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  matrixCurrent: { color: colors.accent, fontSize: 11, marginTop: 2 },
  matrixBuy: {
    backgroundColor: '#C084FC22',
    borderWidth: 1,
    borderColor: colors.darkMatter,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 70,
  },
  matrixBuyDisabled: { borderColor: colors.disabled, backgroundColor: 'transparent' },
  matrixMaxed: { borderColor: colors.gold, backgroundColor: 'transparent' },
  matrixBuyText: { color: colors.darkMatter, fontSize: 13, fontWeight: '700' },
  matrixBuyTextDisabled: { color: colors.disabled },
  matrixMaxedText: { color: colors.gold, fontSize: 13, fontWeight: '800' },
});
