import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BigButton } from '../components/BigButton';
import { Amount } from '../components/art/Amount';
import { Icon, IconName } from '../components/art/Icon';
import { ARTIFACTS, ARTIFACTS_BY_ID } from '../game/artifacts';
import {
  EXPEDITIONS,
  EXPEDITIONS_BY_ID,
  ExpeditionDef,
  expeditionDuration,
  expeditionFuel,
  expeditionLoot,
} from '../game/expeditions';
import { effectivePowers } from '../game/powers';
import { playSound } from '../audio/sound';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatDuration, formatNumber } from '../utils/format';

/** A distinct accent colour per artifact, by collection order. */
const ARTIFACT_COLORS = [
  '#5EEAD4', '#FACC15', '#F87171', '#C084FC', '#60A5FA', '#34D399',
  '#FB923C', '#F472B6', '#A3E635', '#22D3EE', '#E879F9', '#FBBF24',
  '#2DD4BF', '#FCA5A5', '#A78BFA', '#38BDF8', '#4ADE80', '#FDBA74',
];

export function FleetScreen() {
  const expedition = useGameStore((s) => s.expedition);
  const artifacts = useGameStore((s) => s.artifacts);
  const dmUpgrades = useGameStore((s) => s.dmUpgrades);
  const research = useGameStore((s) => s.research);
  const minerals = useGameStore((s) => s.minerals);
  const cachedCps = useGameStore((s) => s.cachedCps);
  const launchExpedition = useGameStore((s) => s.launchExpedition);
  const claimExpedition = useGameStore((s) => s.claimExpedition);
  const [resultBanner, setResultBanner] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local clock so the countdown updates while idle.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => {
      clearInterval(interval);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  const powers = effectivePowers(artifacts, dmUpgrades, research);
  const activeDef = expedition ? EXPEDITIONS_BY_ID[expedition.defId] : null;
  const done = expedition !== null && now >= expedition.endsAt;
  const ownedCount = Object.keys(artifacts).length;

  const handleClaim = () => {
    const result = claimExpedition(Date.now());
    if (!result) return;
    playSound('buy');
    const artifact = result.artifactId ? ARTIFACTS_BY_ID[result.artifactId] : null;
    setResultBanner(
      artifact
        ? `Recovered ${artifact.name}! ${artifact.description} (+${formatNumber(result.loot)} minerals)`
        : `Expedition returned with ${formatNumber(result.loot)} minerals`,
    );
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setResultBanner(null), 6000);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Icon name="fleet" size={22} />
        <Text style={styles.title}>Fleet Command</Text>
      </View>

      {resultBanner && (
        <View style={styles.resultBanner}>
          <Text style={styles.resultText}>{resultBanner}</Text>
        </View>
      )}

      {expedition && activeDef ? (
        <View style={styles.activeCard}>
          <View style={styles.cardNameRow}>
            <Icon name={activeDef.id as IconName} size={22} />
            <Text style={styles.cardName}>{activeDef.name}</Text>
          </View>
          {done ? (
            <BigButton label="Claim rewards" color={colors.gold} onPress={handleClaim} />
          ) : (
            <>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        ((now - expedition.startedAt) /
                          (expedition.endsAt - expedition.startedAt)) *
                          100,
                        100,
                      )}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.countdownRow}>
                <Text style={styles.countdown}>
                  Returns in {formatDuration(expedition.endsAt - now)} · carrying
                </Text>
                <Amount kind="mineral" value={expedition.loot} size={13} textStyle={styles.countdown} prefix="~" />
              </View>
            </>
          )}
        </View>
      ) : (
        EXPEDITIONS.map((def) => (
          <ExpeditionCard
            key={def.id}
            def={def}
            fuel={expeditionFuel(def, cachedCps, powers)}
            loot={expeditionLoot(def, cachedCps, powers)}
            durationMs={expeditionDuration(def, powers)}
            affordable={minerals >= expeditionFuel(def, cachedCps, powers)}
            onLaunch={() => {
              launchExpedition(def.id, Date.now());
              playSound('buy');
            }}
          />
        ))
      )}

      <Text style={styles.sectionTitle}>
        Artifacts ({ownedCount}/{ARTIFACTS.length})
      </Text>
      <Text style={styles.sectionHint}>
        Permanent relics recovered by expeditions. They survive prestige.
      </Text>
      <View style={styles.artifactGrid}>
        {ARTIFACTS.map((a, i) => {
          const owned = artifacts[a.id];
          return (
            <View key={a.id} style={[styles.artifactCell, owned && styles.artifactOwned]}>
              {owned ? (
                <Icon name="artifact" size={26} color={ARTIFACT_COLORS[i % ARTIFACT_COLORS.length]} />
              ) : (
                <Icon name="gem_outline" size={26} color={colors.textMuted} />
              )}
              <Text style={[styles.artifactName, !owned && styles.artifactUnknown]}>
                {owned ? a.name : 'Undiscovered'}
              </Text>
              {owned && <Text style={styles.artifactDesc}>{a.description}</Text>}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function ExpeditionCard({
  def,
  fuel,
  loot,
  durationMs,
  affordable,
  onLaunch,
}: {
  def: ExpeditionDef;
  fuel: number;
  loot: number;
  durationMs: number;
  affordable: boolean;
  onLaunch: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardNameRow}>
        <Icon name={def.id as IconName} size={22} />
        <Text style={styles.cardName}>{def.name}</Text>
      </View>
      <Text style={styles.cardDesc}>{def.description}</Text>
      <Text style={styles.cardStats}>
        {formatDuration(durationMs)} · loot ~{formatNumber(loot)} · artifacts{' '}
        {Math.round(def.artifactChance * 100)}%
      </Text>
      <Pressable
        onPress={onLaunch}
        disabled={!affordable}
        style={[styles.launchButton, !affordable && styles.launchDisabled]}
      >
        <Text style={[styles.launchLabel, !affordable && styles.launchLabelDisabled]}>Launch · </Text>
        <Amount
          kind="mineral"
          value={fuel}
          size={13}
          textStyle={[styles.launchLabel, !affordable && styles.launchLabelDisabled]}
        />
        <Text style={[styles.launchLabel, !affordable && styles.launchLabelDisabled]}> fuel</Text>
      </Pressable>
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
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  resultBanner: {
    backgroundColor: colors.panelLight,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resultText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  activeCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  cardDesc: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  cardStats: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  launchButton: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  launchDisabled: {
    borderColor: colors.disabled,
    backgroundColor: 'transparent',
  },
  launchLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  launchLabelDisabled: {
    color: colors.disabled,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.sm,
  },
  countdown: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.lg,
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  artifactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  artifactCell: {
    width: '31%',
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
    minHeight: 92,
  },
  artifactOwned: {
    borderColor: colors.gold,
  },
  artifactEmoji: {
    fontSize: 24,
  },
  artifactName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  artifactUnknown: {
    color: colors.textMuted,
  },
  artifactDesc: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
});
