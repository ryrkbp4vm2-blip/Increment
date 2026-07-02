/**
 * Haptics with a persisted intensity preference, mirroring the sound module's
 * pattern (module-level state + AsyncStorage, so it survives every prestige
 * reset without living in the game store).
 *
 *   off   — nothing, ever
 *   light — only event moments (comets, shatters), and gently
 *   full  — taps buzz too, shatters thump, bosses hit hard (default)
 *
 * Every call is fire-and-forget and swallows errors: haptics are unavailable
 * on web and must never break gameplay.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export type HapticsMode = 'off' | 'light' | 'full';

const HAPTICS_KEY = 'asteroid-tycoon/haptics';

let mode: HapticsMode = 'full';

/** Load the persisted preference; call once at app start. */
export async function initHaptics(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(HAPTICS_KEY);
    if (stored === 'off' || stored === 'light' || stored === 'full') mode = stored;
  } catch {
    // default 'full'
  }
}

export function getHapticsMode(): HapticsMode {
  return mode;
}

export async function setHapticsMode(value: HapticsMode): Promise<void> {
  mode = value;
  try {
    await AsyncStorage.setItem(HAPTICS_KEY, value);
  } catch {
    // ignore — the in-memory mode still applies this session
  }
}

/** Per-tap tick — the highest-frequency haptic, so 'light' mode skips it. */
export function hapticTap(): void {
  if (mode !== 'full') return;
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // unavailable (web) — ignore
  }
}

/** Event moments: comet/geode caught, prestige, achievement. */
export function hapticEvent(): void {
  if (mode === 'off') return;
  try {
    if (mode === 'full') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // unavailable (web) — ignore
  }
}

/** An asteroid/formation breaking; bosses hit noticeably harder. */
export function hapticShatter(boss: boolean): void {
  if (mode === 'off') return;
  try {
    if (mode === 'light') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (boss) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {
    // unavailable (web) — ignore
  }
}
