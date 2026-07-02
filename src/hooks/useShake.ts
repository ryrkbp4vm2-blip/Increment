import { useCallback, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * A decaying screen-shake. Spread the returned `shakeStyle` on an
 * Animated.View wrapping the content, then call `shake(magnitudePx)` — e.g.
 * 7 for a normal shatter, 14 for a boss. Runs on the native driver.
 */
export function useShake() {
  const progress = useRef(new Animated.Value(0)).current;
  const [magnitude, setMagnitude] = useState(0);

  const shake = useCallback(
    (mag: number) => {
      setMagnitude(mag);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 450,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    },
    [progress],
  );

  // A hand-rolled damped oscillation: alternating offsets that decay to rest.
  const translateX = progress.interpolate({
    inputRange: [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
    outputRange: [0, 1, -0.8, 0.6, -0.4, 0.25, -0.1, 0].map((v) => v * magnitude),
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.15, 0.3, 0.5, 0.65, 0.8, 1],
    outputRange: [0, -0.6, 0.5, -0.35, 0.22, -0.1, 0].map((v) => v * magnitude * 0.7),
  });

  return { shakeStyle: { transform: [{ translateX }, { translateY }] }, shake };
}
