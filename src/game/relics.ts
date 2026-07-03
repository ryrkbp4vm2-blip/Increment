/**
 * Harmonic Relics — crystal mode's artifact analogue. Each relic is bound to a
 * specific Prime formation (every 10th formation, see crystalGame.ts) and is
 * granted the first time that Prime is shattered. Relics are PERMANENT: they
 * survive Cascades and even Convergences, making deep pushes toward the next
 * Prime a lasting goal rather than run-scoped grinding.
 */

export type RelicEffect =
  | { kind: 'crystalGlobal'; x: number }
  | { kind: 'crystalTap'; x: number }
  | { kind: 'geodeReward'; x: number }
  | { kind: 'resonanceGain'; x: number }
  | { kind: 'attunementGain'; x: number };

export interface RelicDef {
  id: string;
  name: string;
  description: string;
  /** Shattering the Prime formation at this index grants the relic. */
  formationIndex: number;
  effect: RelicEffect;
  /** Glyph shown in the collection grid. */
  glyph: string;
}

export const RELICS: RelicDef[] = [
  {
    id: 'echo_prism',
    name: 'Echo Prism',
    description: 'All crystal production ×1.25',
    formationIndex: 9,
    effect: { kind: 'crystalGlobal', x: 1.25 },
    glyph: '◇',
  },
  {
    id: 'deep_tuning_fork',
    name: 'Deep Tuning Fork',
    description: 'Crystal tap power ×2',
    formationIndex: 19,
    effect: { kind: 'crystalTap', x: 2 },
    glyph: '⑂',
  },
  {
    id: 'geode_heart',
    name: 'Geode Heart',
    description: 'Resonant Geode rewards ×1.5',
    formationIndex: 29,
    effect: { kind: 'geodeReward', x: 1.5 },
    glyph: '❖',
  },
  {
    id: 'resonant_core',
    name: 'Resonant Core',
    description: '+25% Resonance from every Cascade',
    formationIndex: 39,
    effect: { kind: 'resonanceGain', x: 1.25 },
    glyph: '◉',
  },
  {
    id: 'attuned_lens',
    name: 'Attuned Lens',
    description: '+25% Attunement from every Cascade',
    formationIndex: 49,
    effect: { kind: 'attunementGain', x: 1.25 },
    glyph: '◈',
  },
  {
    id: 'fractal_seed',
    name: 'Fractal Seed',
    description: 'All crystal production ×1.5',
    formationIndex: 59,
    effect: { kind: 'crystalGlobal', x: 1.5 },
    glyph: '❄',
  },
  {
    id: 'harmonic_crown',
    name: 'Harmonic Crown',
    description: 'Crystal tap power ×3',
    formationIndex: 69,
    effect: { kind: 'crystalTap', x: 3 },
    glyph: '♛',
  },
  {
    id: 'void_chord',
    name: 'Void Chord',
    description: 'All crystal production ×2',
    formationIndex: 79,
    effect: { kind: 'crystalGlobal', x: 2 },
    glyph: '𝄞',
  },
];

export const RELICS_BY_ID: Record<string, RelicDef> = Object.fromEntries(
  RELICS.map((r) => [r.id, r]),
);

export interface RelicPowers {
  globalMult: number;
  tapMult: number;
  geodeMult: number;
  resonanceGainMult: number;
  attunementGainMult: number;
}

/** Aggregate owned relics into their multipliers. */
export function relicPowers(owned: Record<string, true>): RelicPowers {
  const p: RelicPowers = {
    globalMult: 1,
    tapMult: 1,
    geodeMult: 1,
    resonanceGainMult: 1,
    attunementGainMult: 1,
  };
  for (const id of Object.keys(owned)) {
    const e = RELICS_BY_ID[id]?.effect;
    if (!e) continue;
    if (e.kind === 'crystalGlobal') p.globalMult *= e.x;
    else if (e.kind === 'crystalTap') p.tapMult *= e.x;
    else if (e.kind === 'geodeReward') p.geodeMult *= e.x;
    else if (e.kind === 'resonanceGain') p.resonanceGainMult *= e.x;
    else if (e.kind === 'attunementGain') p.attunementGainMult *= e.x;
  }
  return p;
}

/** Relics whose Prime formation lies in [fromIndex, toIndex) — just shattered. */
export function relicsCrossed(fromIndex: number, toIndex: number): RelicDef[] {
  return RELICS.filter((r) => r.formationIndex >= fromIndex && r.formationIndex < toIndex);
}

/**
 * Relics a save should already own given its deepest-formation record — used
 * to retro-grant on load for saves that pushed deep before relics existed.
 */
export function relicsForDepth(deepestFormation: number): RelicDef[] {
  return RELICS.filter((r) => deepestFormation > r.formationIndex);
}
