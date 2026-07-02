import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ACHIEVEMENTS } from '../game/achievements';
import { ARTIFACTS } from '../game/artifacts';
import { RESEARCH_NODES } from '../game/research';
import { asteroidName } from '../game/asteroids';
import { crystalFormationName } from '../game/crystalGame';
import { crystalGlobalFactors } from '../game/crystalStats';
import { globalFactors } from '../game/math';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatDuration, formatNumber, formatRate } from '../utils/format';
import { Amount } from './art/Amount';
import { Icon } from './art/Icon';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function StatsModal({ visible, onClose }: Props) {
  const s = useGameStore();
  const factors = globalFactors(s);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Icon name="stats" size={22} />
            <Text style={styles.title}>Statistics</Text>
          </View>
          <ScrollView style={styles.scroll}>
            <Text style={styles.section}>Production</Text>
            <Row label="Minerals / sec" value={formatRate(s.cachedCps)} />
            <Row label="Per tap" value={formatNumber(s.cachedTapValue)} />
            <Text style={styles.section}>Global multiplier breakdown</Text>
            {factors.map((f) => (
              <Row key={f.label} label={f.label} value={`×${f.value.toFixed(2)}`} muted />
            ))}

            <Text style={styles.section}>Lifetime</Text>
            <CurrencyRow label="Minerals all-time" kind="mineral" value={s.lifetimeAllTime} />
            <Row label="Total taps" value={formatNumber(s.totalTaps)} />
            <Row label="Asteroids shattered" value={formatNumber(s.asteroidsShattered)} />
            <Row label="Comets caught" value={formatNumber(s.cometsCaught)} />
            <Row label="Expeditions run" value={formatNumber(s.expeditionsCompleted)} />

            <Text style={styles.section}>Progression</Text>
            <Row label="Collapses" value={formatNumber(s.prestigeCount)} />
            <Row label="Ascensions" value={formatNumber(s.ascensionCount)} />
            <CurrencyRow label="Dark Matter all-time" kind="dm" value={s.totalDarkMatter} />
            <Row label="Singularity Cores (total)" value={formatNumber(s.totalSingularityCores)} />

            {s.transcendCount > 0 && (
              <>
                <Text style={styles.section}>Crystal Empire</Text>
                <Row label="Crystals / sec" value={formatRate(s.cachedCrystalCps)} />
                <Row label="Per tap" value={formatNumber(s.cachedCrystalTapValue)} />
                <Text style={styles.section}>Crystal multiplier breakdown</Text>
                {crystalGlobalFactors(s).map((f) => (
                  <Row key={f.label} label={f.label} value={`×${f.value.toFixed(2)}`} muted />
                ))}
                <Row label="Resonance level" value={formatNumber(s.resonance)} />
                <Row label="Attunement" value={`${formatNumber(s.attunement)} ◈`} />
                <Row label="Attunement all-time" value={`${formatNumber(s.totalAttunement)} ◈`} />
                <Row label="Crystals all-time" value={`${formatNumber(s.totalCrystals)} ✦`} />
                <Row label="Formations shattered" value={formatNumber(s.crystalFormationsShattered)} />
                <Row label="Transcendences" value={formatNumber(s.transcendCount)} />
                {(s.totalEons > 0 || s.convergenceCount > 0) && (
                  <>
                    <Row label="Eons" value={`${formatNumber(s.eons)} ∞`} />
                    <Row label="Eons all-time" value={`${formatNumber(s.totalEons)} ∞`} />
                    <Row label="Convergences" value={formatNumber(s.convergenceCount)} />
                  </>
                )}
              </>
            )}

            <Text style={styles.section}>Records</Text>
            {s.fastestCollapseMs > 0 && (
              <Row label="Fastest Collapse" value={formatDuration(s.fastestCollapseMs)} />
            )}
            {s.deepestAsteroid > 0 && (
              <Row
                label="Deepest asteroid"
                value={`#${s.deepestAsteroid + 1} · ${asteroidName(s.deepestAsteroid)}`}
              />
            )}
            {s.deepestFormation > 0 && (
              <Row
                label="Deepest formation"
                value={`#${s.deepestFormation + 1} · ${crystalFormationName(s.deepestFormation)}`}
              />
            )}
            <Row label="Peak minerals / sec" value={formatRate(s.peakCps)} />
            {s.peakCrystalCps > 0 && (
              <Row label="Peak crystals / sec" value={formatRate(s.peakCrystalCps)} />
            )}
            <Row label="Total playtime" value={formatDuration(s.totalPlayMs)} />

            <Text style={styles.section}>Collections</Text>
            <Row label="Artifacts" value={`${Object.keys(s.artifacts).length} / ${ARTIFACTS.length}`} />
            <Row label="Research" value={`${Object.keys(s.research).length} / ${RESEARCH_NODES.length}`} />
            <Row label="Goals" value={`${Object.keys(s.achievements).length} / ${ACHIEVEMENTS.length}`} />
            <Row label="Singularity perks" value={`${Object.keys(s.singularityPerks).length}`} />
          </ScrollView>
          <Pressable style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, muted && styles.valueMuted]}>{value}</Text>
    </View>
  );
}

function CurrencyRow({ label, kind, value }: { label: string; kind: 'mineral' | 'dm'; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Amount kind={kind} value={value} size={14} textStyle={styles.value} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000AA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '82%',
    backgroundColor: colors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  scroll: { flexGrow: 0 },
  section: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  label: { color: colors.textMuted, fontSize: 14 },
  value: { color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  valueMuted: { color: colors.accent },
  done: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.sm },
  doneText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
});
