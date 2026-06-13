import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

export type Tab = 'mine' | 'shop' | 'fleet' | 'prestige';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'mine', label: 'Mine', icon: '⛏️' },
  { id: 'shop', label: 'Empire', icon: '🏭' },
  { id: 'fleet', label: 'Fleet', icon: '🚀' },
  { id: 'prestige', label: 'Prestige', icon: '🌌' },
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
            <Text style={styles.icon}>{tab.icon}</Text>
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
  },
  icon: {
    fontSize: 20,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  labelActive: {
    color: colors.accent,
  },
});
