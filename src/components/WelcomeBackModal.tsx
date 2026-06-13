import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { OfflineReport } from '../hooks/useAppLifecycle';
import { colors, spacing } from '../theme';
import { formatDuration } from '../utils/format';
import { Amount } from './art/Amount';
import { BigButton } from './BigButton';

interface Props {
  report: OfflineReport | null;
  onDismiss: () => void;
}

export function WelcomeBackModal({ report, onDismiss }: Props) {
  return (
    <Modal visible={report !== null} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back, Commander!</Text>
          <Text style={styles.subtitle}>
            Your empire kept mining for {formatDuration(report?.elapsedMs ?? 0)}
          </Text>
          <Amount
            kind="mineral"
            value={report?.earned ?? 0}
            size={26}
            textStyle={styles.earned}
            prefix="+"
            style={styles.earnedRow}
          />
          <BigButton label="Collect" onPress={onDismiss} />
        </View>
      </View>
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
    backgroundColor: colors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  earnedRow: {
    marginVertical: spacing.lg,
  },
  earned: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '800',
  },
});
