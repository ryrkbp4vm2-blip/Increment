import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UpgradeDef } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber } from '../utils/format';

interface Props {
  def: UpgradeDef;
}

export function UpgradeCard({ def }: Props) {
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);
  const affordable = useGameStore((s) => s.minerals >= def.cost);

  return (
    <Pressable
      onPress={() => buyUpgrade(def.id)}
      disabled={!affordable}
      style={({ pressed }) => [
        styles.card,
        !affordable && styles.cardDisabled,
        pressed && affordable && styles.cardPressed,
      ]}
    >
      <Text style={styles.name}>{def.name}</Text>
      <Text style={styles.description}>{def.description}</Text>
      <View style={styles.costRow}>
        <Text style={[styles.cost, !affordable && styles.costDisabled]}>
          💎 {formatNumber(def.cost)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panelLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.md,
    marginRight: spacing.sm,
    width: 160,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardDisabled: {
    borderColor: colors.border,
    opacity: 0.7,
  },
  name: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    flex: 1,
  },
  costRow: {
    marginTop: spacing.sm,
  },
  cost: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  costDisabled: {
    color: colors.textMuted,
  },
});
