import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { formatNumber } from '../../utils/format';
import { Icon } from './Icon';

interface Props {
  kind: 'mineral' | 'dm';
  value: number;
  size?: number;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  prefix?: string;
}

/** Inline currency: a vector coin/gem icon followed by a formatted amount. */
export function Amount({ kind, value, size = 16, textStyle, style, prefix }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Icon name={kind === 'dm' ? 'darkmatter' : 'mineral'} size={size} />
      <Text style={[styles.text, textStyle]}>
        {prefix}
        {formatNumber(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    marginLeft: 4,
  },
});
