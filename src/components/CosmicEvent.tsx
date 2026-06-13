import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '../audio/sound';
import { cometsDisabled } from '../game/challenges';
import { rollSpawnDelay } from '../game/events';
import {
  CosmicEvent as EventInstance,
  EVENT_FIRST_SPAWN_MS,
  EVENT_SPAWN_MS,
  EVENT_VISIBLE_MS,
  EventOption,
  pickEvent,
} from '../game/cosmicEvents';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { BigButton } from './BigButton';

export function CosmicEvent() {
  const applyEventOutcome = useGameStore((s) => s.applyEventOutcome);
  const [event, setEvent] = useState<EventInstance | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(EVENT_VISIBLE_MS);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventRef = useRef<EventInstance | null>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (tickRef.current) clearInterval(tickRef.current);
  };

  const schedule = useCallback((range: [number, number]) => {
    const t = setTimeout(() => {
      const s = useGameStore.getState();
      if (cometsDisabled(s.activeChallenge)) {
        schedule(EVENT_SPAWN_MS);
        return;
      }
      const ev = pickEvent({ cps: s.cachedCps, minerals: s.minerals, totalResearch: s.totalResearch });
      eventRef.current = ev;
      setEvent(ev);
      setRemaining(EVENT_VISIBLE_MS);
      const start = Date.now();
      tickRef.current = setInterval(() => {
        const left = EVENT_VISIBLE_MS - (Date.now() - start);
        setRemaining(Math.max(0, left));
      }, 200);
      const expire = setTimeout(() => handleExpire(), EVENT_VISIBLE_MS);
      timers.current.push(expire);
    }, rollSpawnDelay(range));
    timers.current.push(t);
  }, []);

  const finish = (text: string, positive: boolean) => {
    clearTimers();
    eventRef.current = null;
    setEvent(null);
    setResult(text);
    playSound(positive ? 'comet' : 'shatter');
    const clear = setTimeout(() => setResult(null), 3500);
    timers.current.push(clear);
    schedule(EVENT_SPAWN_MS);
  };

  const handleExpire = () => {
    const ev = eventRef.current;
    if (!ev) return;
    if (ev.timeoutOutcome) {
      applyEventOutcome(ev.timeoutOutcome, Date.now());
      finish(ev.timeoutText ?? 'The opportunity passed.', false);
    } else {
      finish('The opportunity passed.', false);
    }
  };

  const choose = (option: EventOption) => {
    applyEventOutcome(option.outcome, Date.now());
    finish(option.resultText, true);
  };

  useEffect(() => {
    schedule(EVENT_FIRST_SPAWN_MS);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {result && (
        <View style={styles.resultBanner} pointerEvents="none">
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}
      <Modal visible={event !== null} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>{event?.title}</Text>
            <Text style={styles.message}>{event?.message}</Text>
            <View style={styles.timerTrack}>
              <View style={[styles.timerFill, { width: `${(remaining / EVENT_VISIBLE_MS) * 100}%` }]} />
            </View>
            <View style={styles.options}>
              {event?.options.map((opt) => (
                <BigButton
                  key={opt.label}
                  label={opt.label}
                  color={colors.accent}
                  onPress={() => choose(opt)}
                  style={styles.option}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000B0',
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
    borderColor: colors.accent,
    padding: spacing.lg,
  },
  title: { color: colors.accent, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  timerTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.background,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  timerFill: { height: '100%', backgroundColor: colors.gold },
  options: { gap: spacing.sm },
  option: {},
  resultBanner: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: colors.panelLight,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    zIndex: 40,
    maxWidth: '92%',
  },
  resultText: { color: colors.accent, fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
