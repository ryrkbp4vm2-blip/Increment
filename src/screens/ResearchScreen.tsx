import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/art/Icon';
import { playSound } from '../audio/sound';
import {
  RESEARCH_BRANCHES,
  RESEARCH_NODES,
  ResearchNodeDef,
  isResearchUnlocked,
} from '../game/research';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber } from '../utils/format';

export function ResearchScreen() {
  const researchPoints = useGameStore((s) => s.researchPoints);
  const totalResearch = useGameStore((s) => s.totalResearch);
  const research = useGameStore((s) => s.research);
  const buyResearch = useGameStore((s) => s.buyResearch);

  const ownedCount = Object.keys(research).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Icon name="lab" size={22} />
        <Text style={styles.title}>Research Lab</Text>
      </View>
      <View style={styles.summary}>
        <View style={styles.rpRow}>
          <Icon name="lab" size={16} color={colors.accent} accent={colors.accent} />
          <Text style={styles.rpText}>{formatNumber(researchPoints)} RP</Text>
        </View>
        <Text style={styles.summarySub}>
          {ownedCount}/{RESEARCH_NODES.length} researched
        </Text>
      </View>
      <Text style={styles.hint}>
        Earn Research Points by shattering asteroids. Unlocks are permanent and survive collapse.
      </Text>

      {RESEARCH_BRANCHES.map((branch) => (
        <View key={branch.id} style={styles.branch}>
          <Text style={styles.branchTitle}>{branch.name}</Text>
          {RESEARCH_NODES.filter((n) => n.branch === branch.id).map((node) => (
            <ResearchRow
              key={node.id}
              node={node}
              owned={!!research[node.id]}
              unlocked={isResearchUnlocked(node, research)}
              affordable={researchPoints >= node.cost}
              onBuy={() => {
                buyResearch(node.id);
                playSound('buy');
              }}
            />
          ))}
        </View>
      ))}
      <View style={{ height: spacing.lg }} />
      <Text style={styles.footer}>Total RP earned: {formatNumber(totalResearch)}</Text>
    </ScrollView>
  );
}

function ResearchRow({
  node,
  owned,
  unlocked,
  affordable,
  onBuy,
}: {
  node: ResearchNodeDef;
  owned: boolean;
  unlocked: boolean;
  affordable: boolean;
  onBuy: () => void;
}) {
  const canBuy = !owned && unlocked && affordable;
  return (
    <View style={[styles.row, owned && styles.rowOwned, !unlocked && !owned && styles.rowLocked]}>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, owned && styles.nameOwned]}>{node.name}</Text>
          {owned && <Icon name="check" size={16} accent={colors.gold} />}
        </View>
        <Text style={styles.desc}>{node.description}</Text>
        {!unlocked && !owned && (
          <Text style={styles.requires}>
            Requires: {node.requires.map((r) => RESEARCH_NODE_NAME(r)).join(', ')}
          </Text>
        )}
      </View>
      {owned ? (
        <View style={styles.ownedTag}>
          <Text style={styles.ownedText}>Done</Text>
        </View>
      ) : (
        <Pressable
          onPress={onBuy}
          disabled={!canBuy}
          style={[styles.buy, !canBuy && styles.buyDisabled]}
        >
          <Icon name="lab" size={13} color={canBuy ? colors.accent : colors.disabled} accent={canBuy ? colors.accent : colors.disabled} />
          <Text style={[styles.buyText, !canBuy && styles.buyTextDisabled]}>{formatNumber(node.cost)}</Text>
        </Pressable>
      )}
    </View>
  );
}

function RESEARCH_NODE_NAME(id: string): string {
  const node = RESEARCH_NODES.find((n) => n.id === id);
  return node ? node.name : id;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rpRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rpText: { color: colors.accent, fontSize: 17, fontWeight: '800' },
  summarySub: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, marginBottom: spacing.md },
  branch: { marginBottom: spacing.md },
  branchTitle: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
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
  rowOwned: { borderColor: colors.gold },
  rowLocked: { opacity: 0.6 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  nameOwned: { color: colors.gold },
  desc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  requires: { color: colors.danger, fontSize: 11, marginTop: 3, opacity: 0.9 },
  buy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 70,
    justifyContent: 'center',
  },
  buyDisabled: { borderColor: colors.disabled, backgroundColor: 'transparent' },
  buyText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  buyTextDisabled: { color: colors.disabled },
  ownedTag: { paddingHorizontal: spacing.md },
  ownedText: { color: colors.gold, fontSize: 13, fontWeight: '800' },
  footer: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
