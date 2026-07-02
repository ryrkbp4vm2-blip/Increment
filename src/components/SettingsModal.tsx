import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { isMuted, playSound, setMuted } from '../audio/sound';
import { HapticsMode, getHapticsMode, hapticShatter, setHapticsMode } from '../haptics';
import {
  cancelScheduledNotifications,
  ensureNotificationPermission,
} from '../notifications/notifications';
import { useGameStore } from '../store/gameStore';
import { clearSave, exportSave, importSave, writeSave } from '../store/persistence';
import { colors, spacing } from '../theme';
import { BigButton } from './BigButton';
import { Icon } from './art/Icon';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenStats: () => void;
}

type View_ = 'menu' | 'backup';

export function SettingsModal({ visible, onClose, onOpenStats }: Props) {
  const resetGame = useGameStore((s) => s.resetGame);
  const hydrate = useGameStore((s) => s.hydrate);
  const devUnlockCrystals = useGameStore((s) => s.devUnlockCrystals);
  const notificationsEnabled = useGameStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useGameStore((s) => s.setNotificationsEnabled);
  const [notifDenied, setNotifDenied] = useState(false);
  const [soundOn, setSoundOn] = useState(!isMuted());
  const [haptics, setHaptics] = useState<HapticsMode>(getHapticsMode());
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [view, setView] = useState<View_>('menu');
  const [exportCode, setExportCode] = useState('');
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'bad'>('idle');

  const close = () => {
    setView('menu');
    setConfirmingReset(false);
    setImportText('');
    setImportStatus('idle');
    setCopied(false);
    onClose();
  };

  const toggleSound = (value: boolean) => {
    setSoundOn(value);
    void setMuted(!value);
    if (value) playSound('buy');
  };

  const chooseHaptics = (value: HapticsMode) => {
    setHaptics(value);
    void setHapticsMode(value);
    // A sample thump so the choice is felt immediately.
    if (value !== 'off') hapticShatter(false);
  };

  const toggleNotifications = async (value: boolean) => {
    setNotifDenied(false);
    if (!value) {
      setNotificationsEnabled(false);
      void cancelScheduledNotifications();
      return;
    }
    // Ask for OS permission first; only persist the preference if granted so
    // the toggle honestly reflects whether reminders can actually fire.
    const granted = await ensureNotificationPermission();
    if (granted) {
      setNotificationsEnabled(true);
    } else {
      setNotifDenied(true);
    }
  };

  const handleReset = () => {
    void clearSave();
    resetGame();
    close();
  };

  // TEMPORARY: jump to a Transcendence-ready empire to try out Crystals.
  const handleDevCrystals = () => {
    devUnlockCrystals();
    void writeSave(useGameStore.getState());
    playSound('prestige');
    close();
  };

  const openBackup = () => {
    setExportCode(exportSave(useGameStore.getState()));
    setView('backup');
  };

  const copyCode = async () => {
    try {
      await Clipboard.setStringAsync(exportCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const doImport = () => {
    const save = importSave(importText);
    if (!save) {
      setImportStatus('bad');
      return;
    }
    hydrate(save.state, Date.now());
    void writeSave(useGameStore.getState());
    setImportStatus('ok');
    playSound('prestige');
    setTimeout(close, 700);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {view === 'menu' ? (
            <>
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

              <View style={styles.row}>
                <View style={styles.rowLabel}>
                  <Icon name="mine" size={20} />
                  <Text style={styles.rowText}>Haptics</Text>
                </View>
                <View style={styles.segmented}>
                  {(['off', 'light', 'full'] as HapticsMode[]).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => chooseHaptics(m)}
                      style={[styles.segment, haptics === m && styles.segmentActive]}
                    >
                      <Text style={[styles.segmentText, haptics === m && styles.segmentTextActive]}>
                        {m === 'off' ? 'Off' : m === 'light' ? 'Light' : 'Full'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.rowLabel}>
                  <Icon name="gift" size={20} />
                  <Text style={styles.rowText}>Reminders</Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={(v) => void toggleNotifications(v)}
                  trackColor={{ true: colors.accent, false: colors.disabled }}
                  thumbColor={colors.text}
                />
              </View>
              <Text style={styles.rowHint}>
                Notifies you when an expedition returns, offline earnings fill up, or the daily
                bonus is ready.
              </Text>
              {notifDenied && (
                <Text style={styles.bad}>
                  Notifications are blocked for this app — enable them in your device Settings
                  first.
                </Text>
              )}

              <Pressable style={styles.row} onPress={() => { close(); onOpenStats(); }}>
                <View style={styles.rowLabel}>
                  <Icon name="stats" size={20} />
                  <Text style={styles.rowText}>Statistics</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>

              <Pressable style={styles.row} onPress={openBackup}>
                <View style={styles.rowLabel}>
                  <Icon name="lock" size={20} />
                  <Text style={styles.rowText}>Backup &amp; restore</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>

              <View style={styles.divider} />

              {__DEV__ && (
                <>
                  <Pressable style={styles.devRow} onPress={handleDevCrystals}>
                    <View style={styles.rowLabel}>
                      <Icon name="gem_outline" size={20} color={colors.darkMatter} accent={colors.darkMatter} />
                      <Text style={styles.devText}>TEST: Jump to Transcendence</Text>
                    </View>
                  </Pressable>
                  <Text style={styles.devHint}>
                    Temporary — sets up a late-game empire with Crystals to try the new layer.
                  </Text>
                </>
              )}

              {confirmingReset ? (
                <View>
                  <Text style={styles.warn}>Erase all progress and start over? This cannot be undone.</Text>
                  <View style={styles.confirmRow}>
                    <BigButton label="Erase" color={colors.danger} onPress={handleReset} style={styles.flex} />
                    <BigButton label="Cancel" color={colors.panelLight} onPress={() => setConfirmingReset(false)} style={styles.flex} />
                  </View>
                </View>
              ) : (
                <Pressable style={styles.resetRow} onPress={() => setConfirmingReset(true)}>
                  <Text style={styles.resetText}>Reset all progress</Text>
                </Pressable>
              )}

              <BigButton label="Done" onPress={close} style={styles.done} />
            </>
          ) : (
            <>
              <View style={styles.header}>
                <Icon name="lock" size={22} />
                <Text style={styles.title}>Backup &amp; restore</Text>
              </View>

              <Text style={styles.section}>Your backup code</Text>
              <Text style={styles.hint}>Copy this and keep it safe — paste it on any device to restore.</Text>
              <TextInput
                style={styles.code}
                value={exportCode}
                editable={false}
                multiline
                numberOfLines={3}
              />
              <BigButton label={copied ? 'Copied!' : 'Copy code'} onPress={copyCode} style={styles.spaced} />

              <View style={styles.divider} />

              <Text style={styles.section}>Restore from a code</Text>
              <TextInput
                style={styles.code}
                value={importText}
                onChangeText={(t) => { setImportText(t); setImportStatus('idle'); }}
                placeholder="Paste a backup code…"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
              {importStatus === 'bad' && <Text style={styles.bad}>That code couldn’t be read.</Text>}
              {importStatus === 'ok' && <Text style={styles.ok}>Restored!</Text>}
              <View style={styles.confirmRow}>
                <BigButton label="Restore" color={colors.accent} onPress={doImport} disabled={!importText.trim()} style={styles.flex} />
                <BigButton label="Back" color={colors.panelLight} onPress={() => setView('menu')} style={styles.flex} />
              </View>
            </>
          )}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowHint: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.sm },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: 9 },
  segmentActive: { backgroundColor: colors.accentDim },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: colors.accent },
  chevron: { color: colors.textMuted, fontSize: 22, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  resetRow: { paddingVertical: spacing.sm },
  resetText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  devRow: { paddingVertical: spacing.sm },
  devText: { color: colors.darkMatter, fontSize: 15, fontWeight: '700' },
  devHint: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.sm },
  warn: { color: colors.text, fontSize: 14, marginBottom: spacing.md, lineHeight: 19 },
  confirmRow: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  done: { marginTop: spacing.lg },
  section: { color: colors.accent, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: spacing.sm },
  code: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 11,
    padding: spacing.sm,
    maxHeight: 70,
  },
  spaced: { marginTop: spacing.sm },
  bad: { color: colors.danger, fontSize: 12, marginTop: spacing.sm },
  ok: { color: colors.accent, fontSize: 12, marginTop: spacing.sm },
});
