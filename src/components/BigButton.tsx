import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  label: string;
  sublabel?: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
}

export function BigButton({ label, sublabel, onPress, disabled, color = colors.accent, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: disabled ? colors.disabled : color, opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
      {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  label: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  sublabel: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.75,
    marginTop: 2,
  },
});
