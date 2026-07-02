import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { COMET_FIRST_SPAWN_MS, COMET_SPAWN_MS, COMET_VISIBLE_MS } from '../game/balance';
import { CometReward, rollCometReward, rollSpawnDelay } from '../game/events';
import { playSound } from '../audio/sound';
import { hapticEvent } from '../haptics';
import { useGameStore } from '../store/gameStore';
import { colors } from '../theme';

interface Props {
  onCollect: (reward: CometReward) => void;
}

/**
 * A Resonant Geode — the crystal-mode analogue of the golden comet. It drifts
 * onto the Crystal Mine every minute or two and, when tapped, grants a crystal
 * production frenzy or an instant Crystal windfall scaled to crystal CPS.
 * Schedules itself; mount once on the screen.
 */
export function CrystalComet({ onCollect }: Props) {
  const { width, height } = useWindowDimensions();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const caught = useRef(false);

  const schedule = useCallback(
    (range: [number, number]) => {
      const spawnTimer = setTimeout(() => {
        caught.current = false;
        setPosition({
          x: 20 + Math.random() * (width - 100),
          y: 80 + Math.random() * (height * 0.5),
        });
        const despawnTimer = setTimeout(() => {
          setPosition(null);
          schedule(COMET_SPAWN_MS);
        }, COMET_VISIBLE_MS);
        timers.current.push(despawnTimer);
      }, rollSpawnDelay(range));
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
    return () => {
      loop.stop();
      // Read timers.current at cleanup time (not captured at mount) so timers
      // scheduled after any catch/reschedule are cleared too — otherwise a
      // pending spawn survives unmount and self-reschedules forever.
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!position) return null;

  const catchGeode = () => {
    // Two taps can land before the removal re-render commits; pay out once.
    if (caught.current) return;
    caught.current = true;
    setPosition(null);
    timers.current.forEach(clearTimeout);
    // Mutate rather than reassign: the unmount cleanup must keep seeing the
    // same array instance.
    timers.current.length = 0;
    schedule(COMET_SPAWN_MS);
    playSound('comet');
    hapticEvent();
    onCollect(rollCometReward(useGameStore.getState().cachedCrystalCps));
  };

  return (
    <Pressable onPress={catchGeode} hitSlop={24} style={[styles.geode, { left: position.x, top: position.y }]}>
      <Animated.View
        style={[
          styles.body,
          { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }] },
        ]}
      >
        <Text style={styles.glyph}>✦</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  geode: {
    position: 'absolute',
    zIndex: 20,
    shadowColor: colors.darkMatter,
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  body: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#C084FC33',
    borderWidth: 2,
    borderColor: colors.darkMatter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 28,
    color: colors.darkMatter,
  },
});
