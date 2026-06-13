import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GeneratorDef, BuyQty } from '../game/types';
import { generatorProduction, maxAffordable } from '../game/math';
import { purchaseCost, useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatRate } from '../utils/format';
import { playSound } from '../audio/sound';
import { Amount } from './art/Amount';
import { Icon, IconName } from './art/Icon';

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
      <View style={styles.iconBox}>
        <Icon name={def.id as IconName} size={30} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>
          {def.name} <Text style={styles.owned}>×{owned}</Text>
        </Text>
        <Text style={styles.production}>
          {owned > 0 ? formatRate(production) : def.description}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          buyGenerator(def.id, qty);
          playSound('buy');
        }}
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
        <Amount
          kind="mineral"
          value={cost}
          size={12}
          textStyle={[styles.buyCost, !affordable && styles.buyLabelDisabled]}
        />
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
  iconBox: {
    width: 38,
    alignItems: 'center',
    marginRight: spacing.sm,
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
    fontVariant: ['tabular-nums'],
  },
  buyLabelDisabled: {
    color: colors.disabled,
  },
});
