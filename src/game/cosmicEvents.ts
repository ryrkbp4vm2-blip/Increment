/** Random "cosmic events" — opportunity pop-ups distinct from golden comets. */

export type EventOutcome =
  | { kind: 'frenzy'; mult: number; durationMs: number }
  | { kind: 'windfall'; amount: number }
  | { kind: 'rp'; amount: number }
  | { kind: 'loseMineralsPct'; pct: number };

export interface EventOption {
  label: string;
  outcome: EventOutcome;
  resultText: string;
}

export interface CosmicEvent {
  id: string;
  title: string;
  message: string;
  options: EventOption[];
  /** Applied if the player lets the event expire without choosing. */
  timeoutOutcome?: EventOutcome;
  timeoutText?: string;
}

export const EVENT_FIRST_SPAWN_MS: [number, number] = [70_000, 120_000];
export const EVENT_SPAWN_MS: [number, number] = [120_000, 220_000];
export const EVENT_VISIBLE_MS = 12_000;

interface Ctx {
  cps: number;
  minerals: number;
  totalResearch: number;
}

function windfall(cps: number, seconds: number, floor: number): number {
  return Math.max(floor, Math.ceil(cps * seconds));
}

type Builder = (ctx: Ctx) => CosmicEvent;

const BUILDERS: Builder[] = [
  (ctx) => ({
    id: 'mineral_rush',
    title: 'Mineral Rush',
    message: 'A dense vein of ore is briefly exposed across the belt.',
    options: [
      {
        label: 'Mine the vein!',
        outcome: { kind: 'frenzy', mult: 3, durationMs: 90_000 },
        resultText: 'Production ×3 for 90s!',
      },
    ],
  }),
  (ctx) => ({
    id: 'solar_storm',
    title: 'Solar Storm',
    message: 'A wave of charged particles supercharges your equipment.',
    options: [
      {
        label: 'Harness it',
        outcome: { kind: 'frenzy', mult: 5, durationMs: 30_000 },
        resultText: 'Production ×5 for 30s!',
      },
    ],
  }),
  (ctx) => {
    const minerals = windfall(ctx.cps, 240, 500);
    const rp = Math.max(5, Math.round(ctx.totalResearch * 0.05) + 6);
    return {
      id: 'derelict',
      title: 'Derelict Freighter',
      message: 'A drifting alien hulk appears on your scanners. How do you board it?',
      options: [
        {
          label: 'Strip the cargo',
          outcome: { kind: 'windfall', amount: minerals },
          resultText: `+${minerals.toLocaleString()} minerals`,
        },
        {
          label: 'Recover its tech',
          outcome: { kind: 'rp', amount: rp },
          resultText: `+${rp} Research Points`,
        },
      ],
    };
  },
  (ctx) => {
    const amount = windfall(ctx.cps, 300, 1000);
    return {
      id: 'cache',
      title: 'Ancient Cache',
      message: 'Your drones unearth a sealed vault humming with stored wealth.',
      options: [
        {
          label: 'Crack it open',
          outcome: { kind: 'windfall', amount },
          resultText: `+${amount.toLocaleString()} minerals`,
        },
      ],
    };
  },
  (ctx) => {
    const bounty = windfall(ctx.cps, 150, 400);
    return {
      id: 'pirates',
      title: 'Pirate Ambush!',
      message: 'Raiders lock onto your convoy. Act fast or they will loot your reserves.',
      options: [
        {
          label: 'Fight them off',
          outcome: { kind: 'windfall', amount: bounty },
          resultText: `Repelled! Salvaged +${bounty.toLocaleString()} minerals`,
        },
      ],
      timeoutOutcome: { kind: 'loseMineralsPct', pct: 0.05 },
      timeoutText: 'The pirates escaped with 5% of your minerals.',
    };
  },
];

/** Build a random event instance with rewards resolved for the current state. */
export function pickEvent(ctx: Ctx, random: () => number = Math.random): CosmicEvent {
  const builder = BUILDERS[Math.floor(random() * BUILDERS.length) % BUILDERS.length];
  return builder(ctx);
}

export const EVENT_COUNT = BUILDERS.length;
