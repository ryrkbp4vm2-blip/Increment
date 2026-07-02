import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../audio/sound';
import {
  CRYSTAL_CHALLENGES,
  CRYSTAL_CHALLENGES_BY_ID,
  crystalChallengeComplete,
  nextCrystalChallengeUnlockAt,
  permanentCrystalPowerMultiplier,
  scaledCrystalChallengeGoal,
  unlockedCrystalChallenges,
} from '../game/crystalChallenges';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber } from '../utils/format';
import { BigButton } from './BigButton';
import { Icon } from './art/Icon';

/**
 * Crystal Challenges — constrained Cascade runs with permanent crystal
 * rewards, shown on the crystal-mode Prestige screen. Mirrors the mineral
 * ChallengesSection, gated by Resonance instead of ascensions.
 */
export function CrystalChallengesSection() {
  const active = useGameStore((s) => s.activeCrystalChallenge);
  const activeGoal = useGameStore((s) => s.activeCrystalChallengeGoal);
  const completed = useGameStore((s) => s.crystalChallengesCompleted);
  const resonance = useGameStore((s) => s.resonance);
  const permanentPower = useGameStore((s) => permanentCrystalPowerMultiplier(s));
  // Derived boolean; the ticking lifetime lives in the progress leaf below.
  const canClaim = useGameStore((s) =>
    crystalChallengeComplete(s.activeCrystalChallenge, s.lifetimeCrystals, s.activeCrystalChallengeGoal),
  );
  const enter = useGameStore((s) => s.enterCrystalChallenge);
  const abandon = useGameStore((s) => s.abandonCrystalChallenge);
  const complete = useGameStore((s) => s.completeCrystalChallenge);
  const [confirmEnter, setConfirmEnter] = useState<string | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const visible = unlockedCrystalChallenges(resonance);
  const nextUnlockAt = nextCrystalChallengeUnlockAt(resonance);
  const doneCount = Object.keys(completed).length;
  const activeDef = active ? CRYSTAL_CHALLENGES_BY_ID[active] : null;

  // Nothing to show before the first Cascade — the system unlocks with Resonance.
  if (visible.length === 0 && !activeDef) return null;

  return (
    <View>
      <View style={styles.titleRow}>
        <Icon name="challenge" size={18} color={colors.darkMatter} accent={colors.darkMatter} />
        <Text style={styles.title}>Crystal Challenges</Text>
        <Text style={styles.count}>
          {doneCount}/{CRYSTAL_CHALLENGES.length}
        </Text>
      </View>
      <Text style={styles.hint}>
        Constrained runs (your crystal run resets on entry, with no Cascade payout). Beat the
        goal for a permanent crystal reward. More unlock as Resonance grows.
      </Text>

      {activeDef ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeName}>⚔ {activeDef.name}</Text>
          <Text style={styles.activeDesc}>{activeDef.description}</Text>
          <ChallengeProgress goal={activeGoal} />
          <Text style={styles.rewardLine}>Reward: {activeDef.rewardLabel}</Text>
          <Text style={styles.lockNote}>
            Cascading, the Crystal Matrix and the Convergence tree are locked until you finish
            or abandon the challenge.
          </Text>
          {canClaim ? (
            <BigButton
              label="Claim Victory!"
              color={colors.gold}
              onPress={() => {
                complete();
                playSound('prestige');
              }}
            />
          ) : confirmAbandon ? (
            <View style={styles.confirmRow}>
              <BigButton
                label="Abandon"
                color={colors.danger}
                onPress={() => {
                  abandon();
                  setConfirmAbandon(false);
                }}
                style={styles.flex}
              />
              <BigButton
                label="Keep going"
                color={colors.panelLight}
                onPress={() => setConfirmAbandon(false)}
                style={styles.flex}
              />
            </View>
          ) : (
            <Pressable onPress={() => setConfirmAbandon(true)} style={styles.abandon}>
              <Text style={styles.abandonText}>Abandon challenge</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          {visible.map((c) => {
            const done = !!completed[c.id];
            const confirming = confirmEnter === c.id;
            return (
              <View key={c.id} style={[styles.row, done && styles.rowDone]}>
                <View style={styles.info}>
                  <Text style={[styles.name, done && styles.nameDone]}>{c.name}</Text>
                  <Text style={styles.desc}>{c.description}</Text>
                  <Text style={styles.meta}>
                    Goal {formatNumber(scaledCrystalChallengeGoal(c, permanentPower))} ✦ ·{' '}
                    {c.rewardLabel}
                  </Text>
                  {confirming && (
                    <View style={styles.confirmRow}>
                      <BigButton
                        label="Enter (resets crystal run)"
                        color={colors.danger}
                        onPress={() => {
                          enter(c.id);
                          playSound('prestige');
                          setConfirmEnter(null);
                        }}
                        style={styles.flex}
                      />
                      <BigButton
                        label="Cancel"
                        color={colors.panelLight}
                        onPress={() => setConfirmEnter(null)}
                        style={styles.flex}
                      />
                    </View>
                  )}
                </View>
                {done ? (
                  <View style={styles.doneBadge}>
                    <Icon name="check" size={18} accent={colors.gold} />
                  </View>
                ) : !confirming ? (
                  <Pressable style={styles.enterBtn} onPress={() => setConfirmEnter(c.id)}>
                    <Text style={styles.enterText}>Enter</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
          {nextUnlockAt !== null && (
            <View style={styles.lockedHint}>
              <Icon name="lock" size={14} color={colors.textMuted} accent={colors.textMuted} />
              <Text style={styles.lockedText}>
                {CRYSTAL_CHALLENGES.length - visible.length} more challenge
                {CRYSTAL_CHALLENGES.length - visible.length === 1 ? '' : 's'} unlock at Resonance{' '}
                {nextUnlockAt}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

/** Live progress toward the run goal — its own leaf so the 10 Hz tick stays here. */
function ChallengeProgress({ goal }: { goal: number }) {
  const lifetimeCrystals = useGameStore((s) => s.lifetimeCrystals);
  return (
    <>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${Math.min((lifetimeCrystals / goal) * 100, 100)}%` }]}
        />
      </View>
      <Text style={styles.progress}>
        {formatNumber(Math.min(lifetimeCrystals, goal))} / {formatNumber(goal)} ✦
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  title: { color: colors.darkMatter, fontSize: 18, fontWeight: '800', flex: 1 },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md },
  activeCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.darkMatter,
    padding: spacing.lg,
  },
  activeName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  activeDesc: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.sm },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  fill: { height: '100%', backgroundColor: colors.darkMatter },
  progress: { color: colors.textMuted, fontSize: 12, marginTop: 4, fontVariant: ['tabular-nums'] },
  rewardLine: { color: colors.gold, fontSize: 13, fontWeight: '700', marginVertical: spacing.sm },
  lockNote: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.sm },
  abandon: { alignItems: 'center', paddingVertical: spacing.sm },
  abandonText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowDone: { borderColor: colors.gold },
  info: { flex: 1 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' },
  nameDone: { color: colors.gold },
  desc: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  meta: { color: colors.darkMatter, fontSize: 11, marginTop: 2 },
  enterBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginLeft: spacing.sm,
  },
  enterText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  doneBadge: { marginLeft: spacing.sm },
  confirmRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
  lockedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  lockedText: { color: colors.textMuted, fontSize: 12, flex: 1 },
});
