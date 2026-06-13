import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACHIEVEMENTS_BY_ID } from '../game/achievements';
import { ARTIFACTS_BY_ID } from '../game/artifacts';
import { UPGRADES_BY_ID } from '../game/balance';
import { DM_UPGRADES_BY_ID } from '../game/darkmatter';
import { EXPEDITIONS_BY_ID } from '../game/expeditions';
import { RESEARCH_BY_ID } from '../game/research';
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
