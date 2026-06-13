import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../audio/sound';
import { ACHIEVEMENTS_BY_ID } from '../game/achievements';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { Icon } from './art/Icon';

/** Shows a celebratory toast as achievements unlock, one at a time. */
export function AchievementToast() {
  const newAchievements = useGameStore((s) => s.newAchievements);
  const consume = useGameStore((s) => s.consumeAchievements);
  const [queue, setQueue] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  // Drain newly unlocked ids from the store into a local queue.
  useEffect(() => {
    if (newAchievements.length > 0) {
      const ids = consume();
      if (ids.length) setQueue((q) => [...q, ...ids]);
    }
  }, [newAchievements, consume]);

  // Show the next queued achievement.
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrent(next);
    playSound('achievement');
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 8 }),
      Animated.delay(2600),
      Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setCurrent(null));
  }, [queue, current, anim]);

  if (!current) return null;
  const def = ACHIEVEMENTS_BY_ID[current];
  if (!def) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
          ],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.badge}>
        <Icon name="goals" size={22} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>Goal unlocked!</Text>
        <Text style={styles.name}>{def.name}</Text>
      </View>
      <Text style={styles.bonus}>+{Math.round(def.bonusPct * 100)}%</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.panelLight,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    zIndex: 50,
    shadowColor: colors.gold,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  badge: {
    width: 30,
    alignItems: 'center',
  },
  body: {},
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  name: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '800',
  },
  bonus: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: spacing.sm,
  },
});
