import AsyncStorage from '@react-native-async-storage/async-storage';
import { UPGRADES_BY_ID } from '../game/balance';
import { GameState, GeneratorId, PersistedState, SaveFile } from '../game/types';
import { emptyGenerators, initialPersistedState } from './gameStore';

export const SAVE_KEY = 'asteroid-tycoon/save';
export const SAVE_VERSION = 1;
export const SAVE_INTERVAL_MS = 10_000;

export function toPersisted(state: GameState): PersistedState {
  return {
    minerals: state.minerals,
    lifetimeThisRun: state.lifetimeThisRun,
    lifetimeAllTime: state.lifetimeAllTime,
    totalTaps: state.totalTaps,
    generators: state.generators,
    upgrades: state.upgrades,
    darkMatter: state.darkMatter,
    prestigeCount: state.prestigeCount,
    startedAt: state.startedAt,
    frenzyUntil: state.frenzyUntil,
    frenzyMult: state.frenzyMult,
  };
}

export function serialize(state: GameState, savedAt: number): string {
  const save: SaveFile = { version: SAVE_VERSION, savedAt, state: toPersisted(state) };
  return JSON.stringify(save);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Parse and migrate a raw save string. Returns null for anything corrupt or
 * unrecognizable so callers fall back to a fresh game instead of crashing.
 */
export function migrate(raw: string | null): SaveFile | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const save = parsed as { version?: unknown; savedAt?: unknown; state?: unknown };
  if (typeof save.state !== 'object' || save.state === null) return null;

  // Future versions migrate stepwise here (1 -> 2 -> ...). Unknown newer
  // versions are treated as corrupt rather than misread.
  if (typeof save.version === 'number' && save.version > SAVE_VERSION) return null;

  const raw_ = save.state as Partial<PersistedState>;
  const defaults = initialPersistedState();
  const generators = emptyGenerators();
  if (typeof raw_.generators === 'object' && raw_.generators !== null) {
    for (const id of Object.keys(generators) as GeneratorId[]) {
      generators[id] = Math.max(0, Math.floor(finiteNumber(raw_.generators[id], 0)));
    }
  }
  const upgrades: Record<string, true> = {};
  if (typeof raw_.upgrades === 'object' && raw_.upgrades !== null) {
    for (const id of Object.keys(raw_.upgrades)) {
      if (UPGRADES_BY_ID[id]) upgrades[id] = true;
    }
  }
  const state: PersistedState = {
    minerals: Math.max(0, finiteNumber(raw_.minerals, 0)),
    lifetimeThisRun: Math.max(0, finiteNumber(raw_.lifetimeThisRun, 0)),
    lifetimeAllTime: Math.max(0, finiteNumber(raw_.lifetimeAllTime, 0)),
    totalTaps: Math.max(0, Math.floor(finiteNumber(raw_.totalTaps, 0))),
    generators,
    upgrades,
    darkMatter: Math.max(0, finiteNumber(raw_.darkMatter, 0)),
    prestigeCount: Math.max(0, Math.floor(finiteNumber(raw_.prestigeCount, 0))),
    startedAt: finiteNumber(raw_.startedAt, defaults.startedAt),
    frenzyUntil: Math.max(0, finiteNumber(raw_.frenzyUntil, 0)),
    frenzyMult: Math.max(1, finiteNumber(raw_.frenzyMult, 1)),
  };
  return {
    version: SAVE_VERSION,
    savedAt: finiteNumber(save.savedAt, Date.now()),
    state,
  };
}

export async function loadSave(): Promise<SaveFile | null> {
  try {
    return migrate(await AsyncStorage.getItem(SAVE_KEY));
  } catch (error) {
    console.warn('Failed to load save, starting fresh', error);
    return null;
  }
}

let saveInFlight = false;
let lastSaveAt = 0;

export async function writeSave(state: GameState, nowMs: number = Date.now()): Promise<void> {
  if (saveInFlight) return;
  saveInFlight = true;
  try {
    await AsyncStorage.setItem(SAVE_KEY, serialize(state, nowMs));
    lastSaveAt = nowMs;
  } catch (error) {
    console.warn('Failed to write save', error);
  } finally {
    saveInFlight = false;
  }
}

/** Called from the game loop; only writes every SAVE_INTERVAL_MS. */
export function saveThrottled(state: GameState, nowMs: number = Date.now()): void {
  if (nowMs - lastSaveAt < SAVE_INTERVAL_MS) return;
  void writeSave(state, nowMs);
}
