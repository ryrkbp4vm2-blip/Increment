import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACHIEVEMENTS_BY_ID } from '../game/achievements';
import { ARTIFACTS_BY_ID } from '../game/artifacts';
import { UPGRADES_BY_ID } from '../game/balance';
import { DM_UPGRADES_BY_ID } from '../game/darkmatter';
import { EXPEDITIONS_BY_ID } from '../game/expeditions';
import { RESEARCH_BY_ID } from '../game/research';
import { SINGULARITY_PERKS_BY_ID } from '../game/ascension';
import { CHALLENGES_BY_ID } from '../game/challenges';
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
    totalDarkMatter: state.totalDarkMatter,
    dmUpgrades: state.dmUpgrades,
    prestigeCount: state.prestigeCount,
    startedAt: state.startedAt,
    frenzyUntil: state.frenzyUntil,
    frenzyMult: state.frenzyMult,
    asteroidIndex: state.asteroidIndex,
    asteroidDamage: state.asteroidDamage,
    artifacts: state.artifacts,
    expedition: state.expedition,
    achievements: state.achievements,
    asteroidsShattered: state.asteroidsShattered,
    cometsCaught: state.cometsCaught,
    expeditionsCompleted: state.expeditionsCompleted,
    researchPoints: state.researchPoints,
    totalResearch: state.totalResearch,
    research: state.research,
    singularityCores: state.singularityCores,
    totalSingularityCores: state.totalSingularityCores,
    ascensionCount: state.ascensionCount,
    dmSinceAscension: state.dmSinceAscension,
    singularityPerks: state.singularityPerks,
    activeChallenge: state.activeChallenge,
    challengesCompleted: state.challengesCompleted,
    lastDailyAt: state.lastDailyAt,
    dailyStreak: state.dailyStreak,
  };
}

export function serialize(state: GameState, savedAt: number): string {
  const save: SaveFile = { version: SAVE_VERSION, savedAt, state: toPersisted(state) };
  return JSON.stringify(save);
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[c & 63] : '=';
  }
  return out;
}

function base64ToBytes(str: string): Uint8Array {
  const clean = str.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]);
    const b = B64.indexOf(clean[i + 1]);
    const c = B64.indexOf(clean[i + 2]);
    const d = B64.indexOf(clean[i + 3]);
    if (p < len) bytes[p++] = (a << 2) | (b >> 4);
    if (p < len) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < len) bytes[p++] = ((c & 3) << 6) | d;
  }
  return bytes;
}

/** A portable, copy-pasteable backup code for the current save. */
export function exportSave(state: GameState): string {
  const json = serialize(state, Date.now());
  return bytesToBase64(new TextEncoder().encode(json));
}

/** Parse a backup code back into a save, or null if it's invalid. */
export function importSave(code: string): SaveFile | null {
  try {
    const json = new TextDecoder().decode(base64ToBytes(code.trim()));
    return migrate(json);
  } catch {
    return null;
  }
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
  const artifacts: Record<string, true> = {};
  if (typeof raw_.artifacts === 'object' && raw_.artifacts !== null) {
    for (const id of Object.keys(raw_.artifacts)) {
      if (ARTIFACTS_BY_ID[id]) artifacts[id] = true;
    }
  }
  const dmUpgrades: Record<string, number> = {};
  if (typeof raw_.dmUpgrades === 'object' && raw_.dmUpgrades !== null) {
    for (const id of Object.keys(raw_.dmUpgrades)) {
      const def = DM_UPGRADES_BY_ID[id];
      if (!def) continue;
      const level = Math.floor(finiteNumber((raw_.dmUpgrades as Record<string, unknown>)[id], 0));
      if (level > 0) dmUpgrades[id] = Math.min(level, def.maxLevel);
    }
  }
  const achievements: Record<string, true> = {};
  if (typeof raw_.achievements === 'object' && raw_.achievements !== null) {
    for (const id of Object.keys(raw_.achievements)) {
      if (ACHIEVEMENTS_BY_ID[id]) achievements[id] = true;
    }
  }
  const singularityPerks: Record<string, true> = {};
  if (typeof raw_.singularityPerks === 'object' && raw_.singularityPerks !== null) {
    for (const id of Object.keys(raw_.singularityPerks)) {
      if (SINGULARITY_PERKS_BY_ID[id]) singularityPerks[id] = true;
    }
  }
  const challengesCompleted: Record<string, true> = {};
  if (typeof raw_.challengesCompleted === 'object' && raw_.challengesCompleted !== null) {
    for (const id of Object.keys(raw_.challengesCompleted)) {
      if (CHALLENGES_BY_ID[id]) challengesCompleted[id] = true;
    }
  }
  const activeChallenge =
    typeof raw_.activeChallenge === 'string' && CHALLENGES_BY_ID[raw_.activeChallenge]
      ? raw_.activeChallenge
      : null;
  const singularityCores = Math.max(0, Math.floor(finiteNumber(raw_.singularityCores, 0)));
  const research: Record<string, true> = {};
  if (typeof raw_.research === 'object' && raw_.research !== null) {
    for (const id of Object.keys(raw_.research)) {
      if (RESEARCH_BY_ID[id]) research[id] = true;
    }
  }
  const darkMatter = Math.max(0, finiteNumber(raw_.darkMatter, 0));
  let expedition: PersistedState['expedition'] = null;
  const rawExp = raw_.expedition;
  if (
    typeof rawExp === 'object' &&
    rawExp !== null &&
    typeof rawExp.defId === 'string' &&
    EXPEDITIONS_BY_ID[rawExp.defId]
  ) {
    expedition = {
      defId: rawExp.defId,
      startedAt: finiteNumber(rawExp.startedAt, 0),
      endsAt: finiteNumber(rawExp.endsAt, 0),
      loot: Math.max(0, finiteNumber(rawExp.loot, 0)),
    };
  }
  const state: PersistedState = {
    minerals: Math.max(0, finiteNumber(raw_.minerals, 0)),
    lifetimeThisRun: Math.max(0, finiteNumber(raw_.lifetimeThisRun, 0)),
    lifetimeAllTime: Math.max(0, finiteNumber(raw_.lifetimeAllTime, 0)),
    totalTaps: Math.max(0, Math.floor(finiteNumber(raw_.totalTaps, 0))),
    generators,
    upgrades,
    darkMatter,
    // Old saves predate totalDarkMatter; seed it from the current balance.
    totalDarkMatter: Math.max(darkMatter, finiteNumber(raw_.totalDarkMatter, darkMatter)),
    dmUpgrades,
    prestigeCount: Math.max(0, Math.floor(finiteNumber(raw_.prestigeCount, 0))),
    startedAt: finiteNumber(raw_.startedAt, defaults.startedAt),
    frenzyUntil: Math.max(0, finiteNumber(raw_.frenzyUntil, 0)),
    frenzyMult: Math.max(1, finiteNumber(raw_.frenzyMult, 1)),
    asteroidIndex: Math.max(0, Math.floor(finiteNumber(raw_.asteroidIndex, 0))),
    asteroidDamage: Math.max(0, finiteNumber(raw_.asteroidDamage, 0)),
    artifacts,
    expedition,
    achievements,
    asteroidsShattered: Math.max(0, Math.floor(finiteNumber(raw_.asteroidsShattered, 0))),
    cometsCaught: Math.max(0, Math.floor(finiteNumber(raw_.cometsCaught, 0))),
    expeditionsCompleted: Math.max(0, Math.floor(finiteNumber(raw_.expeditionsCompleted, 0))),
    researchPoints: Math.max(0, finiteNumber(raw_.researchPoints, 0)),
    totalResearch: Math.max(0, finiteNumber(raw_.totalResearch, 0)),
    research,
    singularityCores,
    // Old saves predate totalSingularityCores; seed it from the current balance.
    totalSingularityCores: Math.max(
      singularityCores,
      Math.floor(finiteNumber(raw_.totalSingularityCores, singularityCores)),
    ),
    ascensionCount: Math.max(0, Math.floor(finiteNumber(raw_.ascensionCount, 0))),
    dmSinceAscension: Math.max(0, finiteNumber(raw_.dmSinceAscension, 0)),
    singularityPerks,
    activeChallenge,
    challengesCompleted,
    lastDailyAt: Math.max(0, finiteNumber(raw_.lastDailyAt, 0)),
    dailyStreak: Math.max(0, Math.floor(finiteNumber(raw_.dailyStreak, 0))),
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

export async function clearSave(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.warn('Failed to clear save', error);
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
