import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BigButton } from '../components/BigButton';
import { Amount } from '../components/art/Amount';
import { Icon, IconName } from '../components/art/Icon';
import {
  ASCEND_BASE,
  SINGULARITY_BONUS,
  SINGULARITY_PERKS,
  nextAscensionAt,
  pendingSingularityCores,
  singularityMult,
} from '../game/ascension';
import { PRESTIGE_BASE } from '../game/balance';
import {
  DM_UPGRADES,
  DarkMatterUpgradeDef,
  darkMatterUpgradeCost,
  dmTotalEffect,
} from '../game/darkmatter';
import { effectivePowers } from '../game/powers';
import { darkMatterGain, nextDarkMatterAt, pendingDarkMatter } from '../game/prestige';
import { playSound } from '../audio/sound';
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
  const singularityCores = useGameStore((s) => s.singularityCores);
  const totalSingularityCores = useGameStore((s) => s.totalSingularityCores);
  const singularityPerks = useGameStore((s) => s.singularityPerks);
  const ascensionCount = useGameStore((s) => s.ascensionCount);
  const dmSinceAscension = useGameStore((s) => s.dmSinceAscension);
  const doAscend = useGameStore((s) => s.doAscend);
  const buySingularityPerk = useGameStore((s) => s.buySingularityPerk);
  const [confirming, setConfirming] = useState(false);
  const [confirmingAscend, setConfirmingAscend] = useState(false);

  const pendingCores = pendingSingularityCores(dmSinceAscension);
  const ascendNextAt = nextAscensionAt(dmSinceAscension);
  // Reveal the ascension layer once the player is at least halfway to it.
  const ascendRevealed = singularityCores > 0 || dmSinceAscension >= ASCEND_BASE * 0.5;

  const powers = effectivePowers(artifacts, dmUpgrades);
  const pending = pendingDarkMatter(lifetimeThisRun);
  const gain = darkMatterGain(lifetimeThisRun, powers.dmGainMult);
  const nextAt = nextDarkMatterAt(lifetimeThisRun);
  const progress = Math.min(lifetimeThisRun / PRESTIGE_BASE, 1);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Icon name="prestige" size={22} />
        <Text style={styles.title}>Supernova Collapse</Text>
      </View>
      <Text style={styles.body}>
        Collapse your empire into Dark Matter — spend it below on permanent upgrades that
        persist through every future collapse. You keep artifacts and the shop; everything else
        in the run resets.
      </Text>

      <View style={styles.statsCard}>
        <StatRow label="Dark Matter to spend" currency="dm" value={darkMatter} />
        <StatRow label="Earned all-time" currency="dm" value={totalDarkMatter} />
        <StatRow label="Collapses so far" value={formatNumber(prestigeCount)} />
        <StatRow label="Mined this run" currency="mineral" value={lifetimeThisRun} />
        <StatRow
          label={pending > 0 ? 'Next Dark Matter at' : 'First Dark Matter at'}
          currency="mineral"
          value={pending > 0 ? nextAt : PRESTIGE_BASE}
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
                playSound('prestige');
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

      {ascendRevealed && (
        <View style={styles.ascendCard}>
          <View style={styles.titleRow}>
            <Icon name="prestige" size={18} color={colors.gold} accent={colors.gold} />
            <Text style={styles.ascendTitle}>Ascension</Text>
          </View>
          <Text style={styles.ascendBody}>
            Ascend to sacrifice your Dark Matter and its shop for Singularity Cores — each grants
            +{SINGULARITY_BONUS * 100}% production forever. Artifacts, research and goals remain.
          </Text>
          <StatRow label="Cores to spend" value={`${formatNumber(singularityCores)}`} />
          <StatRow
            label="Current bonus"
            value={`×${singularityMult(totalSingularityCores, singularityPerks).toFixed(2)}`}
          />
          <StatRow label="Ascensions" value={formatNumber(ascensionCount)} />
          <StatRow
            label="Dark Matter banked"
            value={`${formatNumber(dmSinceAscension)} / ${formatNumber(ascendNextAt)}`}
          />
          {confirmingAscend ? (
            <View style={styles.confirmButtons}>
              <BigButton
                label={`Ascend +${formatNumber(pendingCores)}`}
                color={colors.gold}
                onPress={() => {
                  doAscend();
                  playSound('prestige');
                  setConfirmingAscend(false);
                }}
                style={styles.confirmButton}
              />
              <BigButton
                label="Cancel"
                color={colors.panelLight}
                onPress={() => setConfirmingAscend(false)}
                style={styles.confirmButton}
              />
            </View>
          ) : (
            <BigButton
              label={
                pendingCores >= 1
                  ? `Ascend for +${formatNumber(pendingCores)} Cores`
                  : `Need ${formatNumber(ASCEND_BASE)} Dark Matter banked`
              }
              color={colors.gold}
              disabled={pendingCores < 1}
              onPress={() => setConfirmingAscend(true)}
              style={styles.ascendButton}
            />
          )}

          <Text style={styles.perksTitle}>Singularity Perks</Text>
          <Text style={styles.perksHint}>One-time unlocks bought with Cores. Permanent — survive everything.</Text>
          {SINGULARITY_PERKS.map((perk) => {
            const owned = !!singularityPerks[perk.id];
            const affordable = !owned && singularityCores >= perk.cost;
            return (
              <View key={perk.id} style={[styles.perkRow, owned && styles.perkOwned]}>
                <View style={styles.perkIcon}>
                  <Icon name={perk.icon as IconName} size={24} color={colors.gold} accent={colors.gold} />
                </View>
                <View style={styles.perkInfo}>
                  <Text style={styles.perkName}>{perk.name}</Text>
                  <Text style={styles.perkDesc}>{perk.description}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    buySingularityPerk(perk.id);
                    playSound('buy');
                  }}
                  disabled={!affordable}
                  style={[styles.perkBuy, owned && styles.perkBuyOwned, !affordable && !owned && styles.perkBuyDisabled]}
                >
                  {owned ? (
                    <Icon name="check" size={18} accent={colors.gold} />
                  ) : (
                    <Text style={[styles.perkCost, !affordable && styles.perkCostDisabled]}>
                      {perk.cost}◆
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.shopTitleRow}>
        <Icon name="darkmatter" size={18} />
        <Text style={styles.shopTitle}>Dark Matter Shop</Text>
      </View>
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

  const onBuyWithSound = () => {
    onBuy();
    playSound('buy');
  };
  return (
    <View style={styles.dmRow}>
      <View style={styles.dmIconBox}>
        <Icon name={def.id as IconName} size={26} color={colors.darkMatter} accent={colors.gold} />
      </View>
      <View style={styles.dmInfo}>
        <Text style={styles.dmName}>
          {def.name} <Text style={styles.dmLevel}>Lv {level}/{def.maxLevel}</Text>
        </Text>
        <Text style={styles.dmDesc}>{def.perLevel}</Text>
        {level > 0 && <Text style={styles.dmCurrent}>Now: {dmTotalEffect(def, level)}</Text>}
      </View>
      <Pressable
        onPress={onBuyWithSound}
        disabled={!affordable}
        style={[styles.dmBuy, maxed && styles.dmMaxed, !affordable && !maxed && styles.dmBuyDisabled]}
      >
        {maxed ? (
          <Text style={styles.dmMaxedText}>MAX</Text>
        ) : (
          <Amount
            kind="dm"
            value={cost}
            size={13}
            textStyle={[styles.dmBuyText, !affordable && styles.dmBuyTextDisabled]}
          />
        )}
      </Pressable>
    </View>
  );
}

function StatRow({
  label,
  value,
  currency,
}: {
  label: string;
  value: number | string;
  currency?: 'mineral' | 'dm';
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      {currency && typeof value === 'number' ? (
        <Amount kind={currency} value={value} size={14} textStyle={styles.statValue} />
      ) : (
        <Text style={styles.statValue}>{value}</Text>
      )}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.darkMatter,
    fontSize: 22,
    fontWeight: '800',
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
  ascendCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  ascendTitle: { color: colors.gold, fontSize: 18, fontWeight: '800' },
  ascendBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  ascendButton: { marginTop: spacing.md },
  perksTitle: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '800',
    marginTop: spacing.lg,
  },
  perksHint: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.sm },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  perkOwned: { borderColor: colors.gold },
  perkIcon: { width: 32, alignItems: 'center', marginRight: spacing.sm },
  perkInfo: { flex: 1 },
  perkName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  perkDesc: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  perkBuy: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#FACC1522',
  },
  perkBuyOwned: { backgroundColor: 'transparent' },
  perkBuyDisabled: { borderColor: colors.disabled, backgroundColor: 'transparent' },
  perkCost: { color: colors.gold, fontSize: 13, fontWeight: '800' },
  perkCostDisabled: { color: colors.disabled },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  shopTitle: {
    color: colors.darkMatter,
    fontSize: 18,
    fontWeight: '800',
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
  dmIconBox: {
    width: 34,
    alignItems: 'center',
    marginRight: spacing.sm,
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
