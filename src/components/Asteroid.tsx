import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../audio/sound';
import { useGameStore } from '../store/gameStore';
import { colors } from '../theme';
import { formatNumber } from '../utils/format';
import { AsteroidArt } from './art/AsteroidArt';
import { Icon } from './art/Icon';

interface Particle {
  id: number;
  kind: 'text' | 'burst';
  label: string;
  offsetX: number;
  progress: Animated.Value;
}

const MAX_PARTICLES = 14;

export function Asteroid() {
  const tap = useGameStore((s) => s.tap);
  const asteroidIndex = useGameStore((s) => s.asteroidIndex);
  const scale = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);
  const prevIndex = useRef(asteroidIndex);

  // Slow idle rotation gives the rock life without distracting from taps.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 36000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const spawnParticle = useCallback((kind: 'text' | 'burst', label: string) => {
    const big = kind === 'burst';
    const particle: Particle = {
      id: nextId.current++,
      kind,
      label,
      offsetX: (Math.random() - 0.5) * (big ? 200 : 120),
      progress: new Animated.Value(0),
    };
    setParticles((prev) => [...prev.slice(-(MAX_PARTICLES - 1)), particle]);
    Animated.timing(particle.progress, {
      toValue: 1,
      duration: big ? 1100 : 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setParticles((prev) => prev.filter((p) => p.id !== particle.id));
    });
  }, []);

  // Shatter burst when the belt advances to a new asteroid.
  useEffect(() => {
    if (asteroidIndex > prevIndex.current) {
      scale.setValue(1.5);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }).start();
      for (let i = 0; i < 6; i++) spawnParticle('burst', '');
      playSound('shatter');
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics unavailable (e.g. web); ignore.
      }
    }
    prevIndex.current = asteroidIndex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asteroidIndex]);

  const handlePress = useCallback(() => {
    const earned = tap();
    playSound('tap');
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics unavailable (e.g. web); ignore.
    }
    scale.setValue(0.92);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 12 }).start();
    spawnParticle('text', `+${formatNumber(earned)}`);
  }, [tap, scale, spawnParticle]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      {particles.map((p) => {
        const transform = [
          { translateX: p.offsetX },
          {
            translateY: p.progress.interpolate({ inputRange: [0, 1], outputRange: [-90, -190] }),
          },
        ];
        const opacity = p.progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
        if (p.kind === 'burst') {
          return (
            <Animated.View key={p.id} style={[styles.particle, { opacity, transform }]}>
              <Icon name="burst" size={26} />
            </Animated.View>
          );
        }
        return (
          <Animated.Text key={p.id} style={[styles.particle, styles.textParticle, { opacity, transform }]}>
            {p.label}
          </Animated.Text>
        );
      })}
      <Pressable onPress={handlePress} hitSlop={20}>
        <Animated.View style={[styles.asteroid, { transform: [{ scale }] }]}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <AsteroidArt typeIndex={asteroidIndex} size={210} />
          </Animated.View>
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
    width: 230,
    height: 230,
    borderRadius: 115,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  particle: {
    position: 'absolute',
    zIndex: 10,
  },
  textParticle: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '800',
  },
});
