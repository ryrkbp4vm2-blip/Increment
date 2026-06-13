import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

export type SoundName = 'tap' | 'buy' | 'shatter' | 'comet' | 'prestige' | 'achievement';

const SOURCES: Record<SoundName, number> = {
  tap: require('../../assets/sounds/tap.wav'),
  buy: require('../../assets/sounds/buy.wav'),
  shatter: require('../../assets/sounds/shatter.wav'),
  comet: require('../../assets/sounds/comet.wav'),
  prestige: require('../../assets/sounds/prestige.wav'),
  achievement: require('../../assets/sounds/achievement.wav'),
};

const MUTE_KEY = 'asteroid-tycoon/muted';
const VOLUME: Partial<Record<SoundName, number>> = { tap: 0.35 };

let muted = false;
let initialized = false;
const players: Partial<Record<SoundName, AudioPlayer>> = {};

/** Load the persisted mute preference and warm up the audio players. */
export async function initSound(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    muted = (await AsyncStorage.getItem(MUTE_KEY)) === '1';
  } catch {
    // ignore; default unmuted
  }
  try {
    // Allow SFX to play even when the device is on silent (iOS).
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    // not fatal
  }
  for (const name of Object.keys(SOURCES) as SoundName[]) {
    try {
      const player = createAudioPlayer(SOURCES[name]);
      player.volume = VOLUME[name] ?? 0.6;
      players[name] = player;
    } catch {
      // A failed player just means that sound is silent.
    }
  }
}

export function isMuted(): boolean {
  return muted;
}

export async function setMuted(value: boolean): Promise<void> {
  muted = value;
  try {
    await AsyncStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
}

/** Fire-and-forget SFX. Safe to call rapidly; never throws. */
export function playSound(name: SoundName): void {
  if (muted) return;
  const player = players[name];
  if (!player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // ignore playback hiccups
  }
}
