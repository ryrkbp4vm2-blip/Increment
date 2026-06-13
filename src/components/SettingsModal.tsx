import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { isMuted, playSound, setMuted } from '../audio/sound';
import { useGameStore } from '../store/gameStore';
import { clearSave } from '../store/persistence';
import { colors, spacing } from '../theme';
import { BigButton } from './BigButton';
import { Icon } from './art/Icon';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenStats: () => void;
}

export function SettingsModal({ visible, onClose, onOpenStats }: Props) {
  const resetGame = useGameStore((s) => s.resetGame);
  const [soundOn, setSoundOn] = useState(!isMuted());
  const [confirmingReset, setConfirmingReset] = useState(false);

  const toggleSound = (value: boolean) => {
    setSoundOn(value);
    void setMuted(!value);
    if (value) playSound('buy');
  };

  const handleReset = () => {
    void clearSave();
    resetGame();
    setConfirmingReset(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Icon name="settings" size={22} />
            <Text style={styles.title}>Settings</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Icon name={soundOn ? 'sound' : 'muted'} size={20} />
              <Text style={styles.rowText}>Sound effects</Text>
            </View>
            <Switch
              value={soundOn}
              onValueChange={toggleSound}
              trackColor={{ true: colors.accent, false: colors.disabled }}
              thumbColor={colors.text}
            />
          </View>

          <Pressable
            style={styles.row}
            onPress={() => {
              onClose();
              onOpenStats();
            }}
          >
            <View style={styles.rowLabel}>
              <Icon name="stats" size={20} />
              <Text style={styles.rowText}>Statistics</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <View style={styles.divider} />

          {confirmingReset ? (
            <View>
              <Text style={styles.warn}>
                Erase all progress and start over? This cannot be undone.
              </Text>
              <View style={styles.confirmRow}>
                <BigButton label="Erase" color={colors.danger} onPress={handleReset} style={styles.flex} />
                <BigButton
                  label="Cancel"
                  color={colors.panelLight}
                  onPress={() => setConfirmingReset(false)}
                  style={styles.flex}
                />
              </View>
            </View>
          ) : (
            <Pressable style={styles.resetRow} onPress={() => setConfirmingReset(true)}>
              <Text style={styles.resetText}>Reset all progress</Text>
            </Pressable>
          )}

          <BigButton label="Done" onPress={onClose} style={styles.done} />
        </Pressable>
      </Pressable>
    </Modal>
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
    maxWidth: 360,
    backgroundColor: colors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  chevron: { color: colors.textMuted, fontSize: 22, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  resetRow: { paddingVertical: spacing.sm },
  resetText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  warn: { color: colors.text, fontSize: 14, marginBottom: spacing.md, lineHeight: 19 },
  confirmRow: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  done: { marginTop: spacing.lg },
});
