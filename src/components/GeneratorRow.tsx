import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GeneratorDef, BuyQty } from '../game/types';
import { generatorProduction, maxAffordable } from '../game/math';
import { purchaseCost, useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber, formatRate } from '../utils/format';

interface Props {
  def: GeneratorDef;
  qty: BuyQty;
}

export function GeneratorRow({ def, qty }: Props) {
  const owned = useGameStore((s) => s.generators[def.id] ?? 0);
  const buyGenerator = useGameStore((s) => s.buyGenerator);
  const affordable = useGameStore((s) => {
    if (qty === 'max') return maxAffordable(def, s.generators[def.id] ?? 0, s.minerals) > 0;
    return purchaseCost(s, def.id, qty) <= s.minerals;
  });
  const cost = useGameStore((s) => purchaseCost(s, def.id, qty));
  const production = useGameStore((s) =>
    generatorProduction(def, s.generators[def.id] ?? 0, s),
  );
  const buyCount = useGameStore((s) =>
    qty === 'max' ? maxAffordable(def, s.generators[def.id] ?? 0, s.minerals) : qty,
  );

  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>{def.emoji}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>
          {def.name} <Text style={styles.owned}>×{owned}</Text>
        </Text>
        <Text style={styles.production}>
          {owned > 0 ? formatRate(production) : def.description}
        </Text>
      </View>
      <Pressable
        onPress={() => buyGenerator(def.id, qty)}
        disabled={!affordable}
        style={({ pressed }) => [
          styles.buyButton,
          !affordable && styles.buyButtonDisabled,
          pressed && affordable && styles.buyButtonPressed,
        ]}
      >
        <Text style={[styles.buyLabel, !affordable && styles.buyLabelDisabled]}>
          Buy {qty === 'max' ? (buyCount > 0 ? `×${buyCount}` : 'Max') : `×${qty}`}
        </Text>
        <Text style={[styles.buyCost, !affordable && styles.buyLabelDisabled]}>
          💎 {formatNumber(cost)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  emoji: {
    fontSize: 30,
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  owned: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  production: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  buyButton: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 96,
  },
  buyButtonPressed: {
    opacity: 0.7,
  },
  buyButtonDisabled: {
    borderColor: colors.disabled,
    backgroundColor: 'transparent',
  },
  buyLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  buyCost: {
    color: colors.accent,
    fontSize: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  buyLabelDisabled: {
    color: colors.disabled,
  },
});
