import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  name: string;
  description: string;
  /** Rendered cost (e.g. an <Amount> coin or a "✦" text). */
  cost: React.ReactNode;
  affordable: boolean;
  /** Accent colour for the border / name (gold for minerals, purple for crystals). */
  accent: string;
  onBuy: () => void;
}

/**
 * A compact, full-width upgrade row that sits directly beneath the generator it
 * boosts. Indented and left-accented so it reads as a child of the generator
 * above, and small enough that it doesn't shove the list around when it appears.
 */
export function InlineUpgrade({ name, description, cost, affordable, accent, onBuy }: Props) {
  return (
    <View style={[styles.row, { borderLeftColor: accent }, !affordable && styles.rowDisabled]}>
      <View style={styles.info}>
        <Text style={[styles.name, { color: accent }, !affordable && styles.dim]}>⬆ {name}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Pressable
        onPress={onBuy}
        disabled={!affordable}
        style={({ pressed }) => [
          styles.buyButton,
          { borderColor: accent },
          !affordable && styles.buyButtonDisabled,
          pressed && affordable && styles.buyButtonPressed,
        ]}
      >
        <Text style={[styles.buyLabel, { color: accent }, !affordable && styles.dim]}>Buy</Text>
        <View style={styles.costRow}>{cost}</View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panelLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowDisabled: {
    opacity: 0.7,
  },
  info: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  dim: {
    color: colors.disabled,
  },
  buyButton: {
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 84,
  },
  buyButtonPressed: {
    opacity: 0.7,
  },
  buyButtonDisabled: {
    borderColor: colors.disabled,
    backgroundColor: 'transparent',
  },
  buyLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  costRow: {
    marginTop: 2,
  },
});
