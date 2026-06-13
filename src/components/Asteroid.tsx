import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { colors } from '../theme';
import { formatNumber } from '../utils/format';

interface Particle {
  id: number;
  label: string;
  offsetX: number;
  progress: Animated.Value;
}

const MAX_PARTICLES = 12;

export function Asteroid() {
  const tap = useGameStore((s) => s.tap);
  const scale = useRef(new Animated.Value(1)).current;
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);

  const handlePress = useCallback(() => {
    const earned = tap();

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics unavailable (e.g. web); ignore.
    }

    scale.setValue(0.92);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 12 }).start();

    const particle: Particle = {
      id: nextId.current++,
      label: `+${formatNumber(earned)}`,
      offsetX: (Math.random() - 0.5) * 120,
      progress: new Animated.Value(0),
    };
    setParticles((prev) => [...prev.slice(-(MAX_PARTICLES - 1)), particle]);
    Animated.timing(particle.progress, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setParticles((prev) => prev.filter((p) => p.id !== particle.id));
    });
  }, [tap, scale]);

  return (
    <View style={styles.container}>
      {particles.map((p) => (
        <Animated.Text
          key={p.id}
          style={[
            styles.particle,
            {
              transform: [
                { translateX: p.offsetX },
                {
                  translateY: p.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-90, -190],
                  }),
                },
              ],
              opacity: p.progress.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [1, 1, 0],
              }),
            },
          ]}
        >
          {p.label}
        </Animated.Text>
      ))}
      <Pressable onPress={handlePress} hitSlop={20}>
        <Animated.View style={[styles.asteroid, { transform: [{ scale }] }]}>
          <Text style={styles.asteroidEmoji}>🪨</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  asteroid: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.panelLight,
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  asteroidEmoji: {
    fontSize: 110,
  },
  particle: {
    position: 'absolute',
    color: colors.accent,
    fontSize: 22,
    fontWeight: '800',
    zIndex: 10,
  },
});
