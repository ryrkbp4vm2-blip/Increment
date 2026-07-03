/**
 * Resonant Echoes — crystal mode's cosmic-event analogue: timed opportunity
 * pop-ups on the Crystal Mine. Reuses the mineral event architecture
 * (CosmicEvent shape + EventOutcome), with outcomes routed to crystals by
 * applyEventOutcome's mode check.
 */
import { CosmicEvent, EventOutcome } from './cosmicEvents';

export type { EventOutcome };

interface Ctx {
  crystalCps: number;
  crystals: number;
}

function windfall(crystalCps: number, seconds: number, floor: number): number {
  return Math.max(floor, Math.ceil(crystalCps * seconds));
}

type Builder = (ctx: Ctx) => CosmicEvent;

const BUILDERS: Builder[] = [
  () => ({
    id: 'harmonic_surge',
    title: 'Harmonic Surge',
    message: 'The lattice hums in sympathy — every crystal in reach vibrates as one.',
    options: [
      {
        label: 'Ride the wave',
        outcome: { kind: 'frenzy', mult: 3, durationMs: 90_000 },
        resultText: 'Production ×3 for 90s!',
      },
    ],
  }),
  () => ({
    id: 'overtone_cascade',
    title: 'Overtone Cascade',
    message: 'A piercing overtone races through the formation, briefly amplifying everything.',
    options: [
      {
        label: 'Amplify it',
        outcome: { kind: 'frenzy', mult: 5, durationMs: 30_000 },
        resultText: 'Production ×5 for 30s!',
      },
    ],
  }),
  (ctx) => {
    const amount = windfall(ctx.crystalCps, 300, 50);
    return {
      id: 'geode_cache',
      title: 'Buried Geode Cache',
      message: 'Your resonators detect a hollow pocket packed with dormant geodes.',
      options: [
        {
          label: 'Crack it open',
          outcome: { kind: 'windfall', amount },
          resultText: `+${amount.toLocaleString()} ✦`,
        },
      ],
    };
  },
  (ctx) => {
    const amount = windfall(ctx.crystalCps, 150, 25);
    return {
      id: 'dissonance',
      title: 'Dissonant Swarm!',
      message: 'A swarm of null-tone shards descends, threatening to shatter your reserves.',
      options: [
        {
          label: 'Retune and repel',
          outcome: { kind: 'windfall', amount },
          resultText: `Repelled! Harvested +${amount.toLocaleString()} ✦ from the swarm`,
        },
      ],
      timeoutOutcome: { kind: 'loseMineralsPct', pct: 0.05 },
      timeoutText: 'The swarm dissolved 5% of your crystals.',
    };
  },
  (ctx) => {
    const amount = windfall(ctx.crystalCps, 240, 40);
    return {
      id: 'prism_bloom',
      title: 'Prism Bloom',
      message: 'A flowering of prisms erupts from the formation. Harvest now, or let it charge?',
      options: [
        {
          label: 'Harvest it',
          outcome: { kind: 'windfall', amount },
          resultText: `+${amount.toLocaleString()} ✦`,
        },
        {
          label: 'Let it charge',
          outcome: { kind: 'frenzy', mult: 4, durationMs: 60_000 },
          resultText: 'Production ×4 for 60s!',
        },
      ],
    };
  },
];

/** Build a random Echo instance with rewards resolved for the current state. */
export function pickCrystalEvent(ctx: Ctx, random: () => number = Math.random): CosmicEvent {
  const builder = BUILDERS[Math.floor(random() * BUILDERS.length) % BUILDERS.length];
  return builder(ctx);
}

export const CRYSTAL_EVENT_COUNT = BUILDERS.length;
