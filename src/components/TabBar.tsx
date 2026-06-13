import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { Icon, IconName } from './art/Icon';

export type Tab = 'mine' | 'shop' | 'fleet' | 'prestige';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'mine', label: 'Mine', icon: 'mine' },
  { id: 'shop', label: 'Empire', icon: 'empire' },
  { id: 'fleet', label: 'Fleet', icon: 'fleet' },
  { id: 'prestige', label: 'Prestige', icon: 'prestige' },
];

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable key={tab.id} style={styles.tab} onPress={() => onChange(tab.id)}>
            <Icon
              name={tab.icon}
              size={24}
              color={isActive ? colors.accent : colors.textMuted}
              accent={isActive ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 3,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.accent,
  },
});
