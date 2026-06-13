import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BigButton } from '../components/BigButton';
import { ARTIFACTS, ARTIFACTS_BY_ID, artifactPowers } from '../game/artifacts';
import {
  EXPEDITIONS,
  EXPEDITIONS_BY_ID,
  ExpeditionDef,
  expeditionDuration,
  expeditionFuel,
  expeditionLoot,
} from '../game/expeditions';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatDuration, formatNumber } from '../utils/format';

export function FleetScreen() {
  const expedition = useGameStore((s) => s.expedition);
  const artifacts = useGameStore((s) => s.artifacts);
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

  const powers = artifactPowers(artifacts);
  const activeDef = expedition ? EXPEDITIONS_BY_ID[expedition.defId] : null;
  const done = expedition !== null && now >= expedition.endsAt;
  const ownedCount = Object.keys(artifacts).length;

  const handleClaim = () => {
    const result = claimExpedition(Date.now());
    if (!result) return;
    const artifact = result.artifactId ? ARTIFACTS_BY_ID[result.artifactId] : null;
    setResultBanner(
      artifact
        ? `${artifact.emoji} Recovered ${artifact.name}! ${artifact.description} (+💎 ${formatNumber(result.loot)})`
        : `Expedition returned with 💎 ${formatNumber(result.loot)}`,
    );
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setResultBanner(null), 6000);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🚀 Fleet Command</Text>

      {resultBanner && (
        <View style={styles.resultBanner}>
          <Text style={styles.resultText}>{resultBanner}</Text>
        </View>
      )}

      {expedition && activeDef ? (
        <View style={styles.activeCard}>
          <Text style={styles.cardName}>
            {activeDef.emoji} {activeDef.name}
          </Text>
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
              <Text style={styles.countdown}>
                Returns in {formatDuration(expedition.endsAt - now)} · carrying ~💎{' '}
                {formatNumber(expedition.loot)}
              </Text>
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
            onLaunch={() => launchExpedition(def.id, Date.now())}
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
        {ARTIFACTS.map((a) => {
          const owned = artifacts[a.id];
          return (
            <View key={a.id} style={[styles.artifactCell, owned && styles.artifactOwned]}>
              <Text style={styles.artifactEmoji}>{owned ? a.emoji : '❓'}</Text>
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
      <Text style={styles.cardName}>
        {def.emoji} {def.name}
      </Text>
      <Text style={styles.cardDesc}>{def.description}</Text>
      <Text style={styles.cardStats}>
        ⏱ {formatDuration(durationMs)} · loot ~💎 {formatNumber(loot)} · artifact odds{' '}
        {Math.round(def.artifactChance * 100)}%
      </Text>
      <Pressable
        onPress={onLaunch}
        disabled={!affordable}
        style={[styles.launchButton, !affordable && styles.launchDisabled]}
      >
        <Text style={[styles.launchLabel, !affordable && styles.launchLabelDisabled]}>
          Launch · 💎 {formatNumber(fuel)} fuel
        </Text>
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
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.md,
    textAlign: 'center',
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
  countdown: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
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
