import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { Icon, IconName } from './art/Icon';

export type Tab =
  | 'mine'
  | 'shop'
  | 'fleet'
  | 'lab'
  | 'goals'
  | 'prestige'
  | 'crystal_mine'
  | 'crystal_forge';

const ALL_TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'mine', label: 'Mine', icon: 'mine' },
  { id: 'shop', label: 'Empire', icon: 'empire' },
  { id: 'fleet', label: 'Fleet', icon: 'fleet' },
  { id: 'lab', label: 'Lab', icon: 'lab' },
  { id: 'crystal_mine', label: 'Mine', icon: 'shard' },
  { id: 'crystal_forge', label: 'Forge', icon: 'gem_outline' },
  { id: 'goals', label: 'Goals', icon: 'goals' },
  { id: 'prestige', label: 'Prestige', icon: 'prestige' },
];

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  tabs: Tab[];
  /** Tabs that should show an attention marker (e.g. a claim is available). */
  attention?: Partial<Record<Tab, boolean>>;
}

export function TabBar({ active, onChange, tabs, attention }: Props) {
  const visible = ALL_TABS.filter((t) => tabs.includes(t.id));
  return (
    <View style={styles.bar}>
      {visible.map((tab) => {
        const isActive = tab.id === active;
        const flagged = attention?.[tab.id] && !isActive;
        return (
          <Pressable key={tab.id} style={styles.tab} onPress={() => onChange(tab.id)}>
            <View>
              <Icon
                name={tab.icon}
                size={20}
                color={isActive ? colors.accent : colors.textMuted}
                accent={isActive ? colors.accent : colors.textMuted}
              />
              {flagged && <View style={styles.dot} />}
            </View>
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
    fontSize: 10,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.accent,
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
    borderWidth: 1,
    borderColor: colors.panel,
  },
});
