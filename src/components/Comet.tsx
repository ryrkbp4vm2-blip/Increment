import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import {
  COMET_FIRST_SPAWN_MS,
  COMET_SPAWN_MS,
  COMET_VISIBLE_MS,
} from '../game/balance';
import { cometsDisabled } from '../game/challenges';
import { CometReward, rollCometReward, rollSpawnDelay } from '../game/events';
import { effectivePowers } from '../game/powers';
import { playSound } from '../audio/sound';
import { useGameStore } from '../store/gameStore';
import { colors } from '../theme';
import { CometArt } from './art/CometArt';

interface Props {
  onCollect: (reward: CometReward) => void;
}

/**
 * A golden comet that appears at a random spot every minute or two and
 * grants a bonus when caught. Schedules itself; mount once on the screen.
 */
export function Comet({ onCollect }: Props) {
  const { width, height } = useWindowDimensions();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = useCallback(
    (range: [number, number]) => {
      const { artifacts, dmUpgrades, research } = useGameStore.getState();
      const spawnMult = effectivePowers(artifacts, dmUpgrades, research).cometSpawnMult;
      const spawnTimer = setTimeout(() => {
        // Some challenges forbid comets — silently reschedule instead.
        if (cometsDisabled(useGameStore.getState().activeChallenge)) {
          schedule(COMET_SPAWN_MS);
          return;
        }
        setPosition({
          x: 20 + Math.random() * (width - 100),
          y: 80 + Math.random() * (height * 0.5),
        });
        const despawnTimer = setTimeout(() => {
          setPosition(null);
          schedule(COMET_SPAWN_MS);
        }, COMET_VISIBLE_MS);
        timers.current.push(despawnTimer);
      }, rollSpawnDelay(range) * spawnMult);
      timers.current.push(spawnTimer);
    },
    [width, height],
  );

  useEffect(() => {
    schedule(COMET_FIRST_SPAWN_MS);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    const pending = timers.current;
    return () => {
      loop.stop();
      pending.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!position) return null;

  const catchComet = () => {
    setPosition(null);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    schedule(COMET_SPAWN_MS);
    playSound('comet');
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics unavailable (e.g. web); ignore.
    }
    const state = useGameStore.getState();
    const powers = effectivePowers(state.artifacts, state.dmUpgrades, state.research);
    onCollect(
      rollCometReward(state.cachedCps, {
        cometMult: powers.cometRewardMult,
        frenzyExtraMs: powers.frenzyExtraMs,
      }),
    );
  };

  return (
    <Pressable onPress={catchComet} hitSlop={24} style={[styles.comet, { left: position.x, top: position.y }]}>
      <Animated.View
        style={{
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
        }}
      >
        <CometArt size={52} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  comet: {
    position: 'absolute',
    zIndex: 20,
    shadowColor: colors.gold,
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  emoji: {
    fontSize: 44,
  },
});
