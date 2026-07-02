import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { playSound } from '../audio/sound';
import {
  AUTO_FORGE_RESONANCE,
  AUTO_UPGRADE_RESONANCE,
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
import { crystalPowers, resonancePowerMult } from '../game/transcend';
import { RESONANCE_BONUS } from '../game/crystalGame';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber, formatRate } from '../utils/format';
import { Icon, IconName } from '../components/art/Icon';
import { InlineUpgrade } from '../components/InlineUpgrade';

type BuyQty = 1 | 10 | 'max';
const QTY_OPTIONS: BuyQty[] = [1, 10, 'max'];

export function CrystalForgeScreen() {
  // Shared remembered buy-quantity, persisted in the store (see ShopScreen).
  const qty = useGameStore((s) => s.buyQty) as BuyQty;
  const setQty = useGameStore((s) => s.setBuyQty);
  const crystalUpgrades = useGameStore((s) => s.crystalUpgrades);
  const crystalRunUpgrades = useGameStore((s) => s.crystalRunUpgrades);
  const resonance = useGameStore((s) => s.resonance);
  const autoForge = useGameStore((s) => s.autoForge);
  const toggleAutoForge = useGameStore((s) => s.toggleAutoForge);
  const autoCrystalUpgrade = useGameStore((s) => s.autoCrystalUpgrade);
  const toggleAutoCrystalUpgrade = useGameStore((s) => s.toggleAutoCrystalUpgrade);
  const buyCrystalGenerator = useGameStore((s) => s.buyCrystalGenerator);
  const buyCrystalRunUpgrade = useGameStore((s) => s.buyCrystalRunUpgrade);

  const autoForgeUnlocked = resonance >= AUTO_FORGE_RESONANCE;
  const autoUpgradeUnlocked = resonance >= AUTO_UPGRADE_RESONANCE;

  const runPowers = crystalRunPowers(crystalRunUpgrades);
  // Effective global multiplier shared by every generator line (matrix × resonance × run).
  const baseGlobalMult =
    crystalPowers(crystalUpgrades).globalMult *
    resonanceMult(resonance, RESONANCE_BONUS * resonancePowerMult(crystalUpgrades)) *
    runPowers.globalMult;

  // Upgrades that are unlocked and not yet owned, cheapest first. Selected as a
  // joined-id string so the ticking crystal balance and lifetime totals only
  // re-render this screen when the *set* of available upgrades changes —
  // affordability lives in the per-row components below.
  const availableUpgradeIds = useGameStore((s) =>
    CRYSTAL_GEN_UPGRADES.filter(
      (u) =>
        !s.crystalRunUpgrades[u.id] &&
        crystalUpgradeUnlockMet(u, {
          crystalGenerators: s.crystalGenerators,
          lifetimeCrystals: s.lifetimeCrystals,
        }),
    )
      .map((u) => u.id)
      .join(','),
  );
  const availableUpgrades = CRYSTAL_GEN_UPGRADES.filter((u) =>
    availableUpgradeIds.split(',').includes(u.id),
  ).sort((a, b) => a.cost - b.cost);

  // Per-generator boosts render inline beneath the generator they boost; tap
  // and global upgrades stay in their own section below the list.
  const upgradesByGen: Record<string, CrystalGenUpgradeDef[]> = {};
  const otherUpgrades = availableUpgrades.filter((u) => {
    if (u.effect.kind === 'genMult') {
      (upgradesByGen[u.effect.genId] ??= []).push(u);
      return false;
    }
    return true;
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {autoUpgradeUnlocked ? (
        <View style={styles.autoRow}>
          <View style={styles.autoLabel}>
            <Icon name="gem_outline" size={18} color={colors.darkMatter} accent={colors.darkMatter} />
            <Text style={styles.autoText}>Auto-Buy Forge Upgrades</Text>
          </View>
          <Switch
            value={autoCrystalUpgrade}
            onValueChange={toggleAutoCrystalUpgrade}
            trackColor={{ true: colors.darkMatter, false: colors.disabled }}
            thumbColor={colors.text}
          />
        </View>
      ) : (
        <View style={styles.autoRowLocked}>
          <Icon name="lock" size={16} color={colors.textMuted} accent={colors.textMuted} />
          <Text style={styles.autoLockedText}>
            Auto-Buy Forge Upgrades auto-purchases Forge upgrades — unlocks at Resonance{' '}
            {AUTO_UPGRADE_RESONANCE}
          </Text>
        </View>
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

      {autoForgeUnlocked ? (
        <View style={styles.autoRow}>
          <View style={styles.autoLabel}>
            <Icon name="gem_outline" size={18} color={colors.darkMatter} accent={colors.darkMatter} />
            <Text style={styles.autoText}>Auto-Forge</Text>
          </View>
          <Switch
            value={autoForge}
            onValueChange={toggleAutoForge}
            trackColor={{ true: colors.darkMatter, false: colors.disabled }}
            thumbColor={colors.text}
          />
        </View>
      ) : (
        <View style={styles.autoRowLocked}>
          <Icon name="lock" size={16} color={colors.textMuted} accent={colors.textMuted} />
          <Text style={styles.autoLockedText}>
            Auto-Forge auto-buys generators — unlocks at Resonance {AUTO_FORGE_RESONANCE}
          </Text>
        </View>
      )}

      {CRYSTAL_GENS.map((def) => (
        <React.Fragment key={def.id}>
          <CrystalGenRow
            def={def}
            qty={qty}
            genMult={runPowers.genMult[def.id] ?? 1}
            globalMult={baseGlobalMult}
            onBuy={() => {
              buyCrystalGenerator(def.id, qty);
              playSound('buy');
            }}
          />
          {(upgradesByGen[def.id] ?? []).map((u) => (
            <CrystalInlineUpgrade
              key={u.id}
              def={u}
              onBuy={() => {
                buyCrystalRunUpgrade(u.id);
                playSound('buy');
              }}
            />
          ))}
        </React.Fragment>
      ))}

      {otherUpgrades.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Forge Upgrades</Text>
          <Text style={styles.hint}>One-time boosts for this run. Reset on each Cascade.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.upgradeRow}>
            {otherUpgrades.map((def) => (
              <CrystalUpgradeCard
                key={def.id}
                def={def}
                onBuy={() => {
                  buyCrystalRunUpgrade(def.id);
                  playSound('buy');
                }}
              />
            ))}
          </ScrollView>
        </>
      )}

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

// The per-row components below subscribe to their own crystals-derived
// primitives (booleans/numbers), so the balance ticking at 10 Hz re-renders
// only the rows whose affordability actually changed — not the whole screen.

function CrystalUpgradeCard({ def, onBuy }: { def: CrystalGenUpgradeDef; onBuy: () => void }) {
  const affordable = useGameStore((s) => s.crystals >= def.cost);
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

function CrystalInlineUpgrade({ def, onBuy }: { def: CrystalGenUpgradeDef; onBuy: () => void }) {
  const affordable = useGameStore((s) => s.crystals >= def.cost);
  return (
    <InlineUpgrade
      name={def.name}
      description={def.description}
      accent={colors.darkMatter}
      affordable={affordable}
      cost={
        <Text style={[styles.inlineCost, !affordable && styles.inlineCostDisabled]}>
          {formatNumber(def.cost)} ✦
        </Text>
      }
      onBuy={onBuy}
    />
  );
}

function CrystalGenRow({
  def,
  qty,
  genMult,
  globalMult,
  onBuy,
}: {
  def: CrystalGenDef;
  qty: BuyQty;
  genMult: number;
  globalMult: number;
  onBuy: () => void;
}) {
  const owned = useGameStore((s) => s.crystalGenerators[def.id] ?? 0);
  const count = useGameStore((s) =>
    qty === 'max' ? crystalGenMaxAffordable(def, s.crystalGenerators[def.id] ?? 0, s.crystals) : qty,
  );
  const cost =
    qty === 'max'
      ? count > 0
        ? crystalGenBulkCost(def, owned, count)
        : crystalGenCostOfNext(def, owned)
      : crystalGenBulkCost(def, owned, qty);
  const affordable = useGameStore((s) =>
    qty === 'max'
      ? crystalGenMaxAffordable(def, s.crystalGenerators[def.id] ?? 0, s.crystals) > 0
      : s.crystals >= crystalGenBulkCost(def, s.crystalGenerators[def.id] ?? 0, qty),
  );
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
  inlineCost: { color: colors.darkMatter, fontSize: 12, fontWeight: '700' },
  inlineCostDisabled: { color: colors.disabled },
});
