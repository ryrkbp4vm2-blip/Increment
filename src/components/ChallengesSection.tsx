import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../audio/sound';
import {
  CHALLENGES,
  CHALLENGES_BY_ID,
  challengeComplete,
  nextChallengeUnlockAt,
  scaledChallengeGoal,
  unlockedChallenges,
} from '../game/challenges';
import { permanentPowerMultiplier } from '../game/math';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber } from '../utils/format';
import { BigButton } from './BigButton';
import { Icon } from './art/Icon';

export function ChallengesSection() {
  const activeChallenge = useGameStore((s) => s.activeChallenge);
  const activeChallengeGoal = useGameStore((s) => s.activeChallengeGoal);
  const challengesCompleted = useGameStore((s) => s.challengesCompleted);
  const lifetimeThisRun = useGameStore((s) => s.lifetimeThisRun);
  const ascensionCount = useGameStore((s) => s.ascensionCount);
  const permanentPower = useGameStore((s) => permanentPowerMultiplier(s));
  const enterChallenge = useGameStore((s) => s.enterChallenge);
  const abandonChallenge = useGameStore((s) => s.abandonChallenge);
  const completeChallenge = useGameStore((s) => s.completeChallenge);
  const [confirmEnter, setConfirmEnter] = useState<string | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const visible = unlockedChallenges(ascensionCount);
  const nextUnlockAt = nextChallengeUnlockAt(ascensionCount);
  const doneCount = Object.keys(challengesCompleted).length;
  const active = activeChallenge ? CHALLENGES_BY_ID[activeChallenge] : null;
  const canClaim = challengeComplete(activeChallenge, lifetimeThisRun, activeChallengeGoal);

  return (
    <View>
      <View style={styles.titleRow}>
        <Icon name="challenge" size={18} color={colors.danger} accent={colors.danger} />
        <Text style={styles.title}>Challenges</Text>
        <Text style={styles.count}>
          {doneCount}/{CHALLENGES.length}
        </Text>
      </View>
      <Text style={styles.hint}>
        Constrained runs (your current run resets on entry). Beat the goal for a permanent reward.
        New challenges unlock as you ascend.
      </Text>

      {active ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeName}>⚔ {active.name}</Text>
          <Text style={styles.activeDesc}>{active.description}</Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.min((lifetimeThisRun / activeChallengeGoal) * 100, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progress}>
            {formatNumber(Math.min(lifetimeThisRun, activeChallengeGoal))} /{' '}
            {formatNumber(activeChallengeGoal)}
          </Text>
          <Text style={styles.rewardLine}>Reward: {active.rewardLabel}</Text>
          <Text style={styles.lockNote}>
            Permanent shops (Dark Matter, Research, Singularity) are locked until you finish or
            abandon the challenge.
          </Text>
          {canClaim ? (
            <BigButton
              label="Claim Victory!"
              color={colors.gold}
              onPress={() => {
                completeChallenge();
                playSound('prestige');
              }}
            />
          ) : confirmAbandon ? (
            <View style={styles.confirmRow}>
              <BigButton
                label="Abandon"
                color={colors.danger}
                onPress={() => {
                  abandonChallenge();
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
            const done = !!challengesCompleted[c.id];
            const confirming = confirmEnter === c.id;
            return (
              <View key={c.id} style={[styles.row, done && styles.rowDone]}>
                <View style={styles.info}>
                  <Text style={[styles.name, done && styles.nameDone]}>{c.name}</Text>
                  <Text style={styles.desc}>{c.description}</Text>
                  <Text style={styles.meta}>
                    Goal {formatNumber(scaledChallengeGoal(c, permanentPower))} · {c.rewardLabel}
                  </Text>
                  {confirming && (
                    <View style={styles.confirmRow}>
                      <BigButton
                        label="Enter (resets run)"
                        color={colors.danger}
                        onPress={() => {
                          enterChallenge(c.id);
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
                {CHALLENGES.length - visible.length} more challenge
                {CHALLENGES.length - visible.length === 1 ? '' : 's'} unlock after ascension{' '}
                {nextUnlockAt}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  title: { color: colors.danger, fontSize: 18, fontWeight: '800', flex: 1 },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md },
  activeCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
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
  fill: { height: '100%', backgroundColor: colors.danger },
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
  meta: { color: colors.accent, fontSize: 11, marginTop: 2 },
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
