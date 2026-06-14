# 🪨 Asteroid Tycoon

An incremental (idle/clicker) game for **iOS and Android**, built with React Native + Expo.

Tap an asteroid to mine minerals, build an automated mining empire, and eventually collapse
it all into **Dark Matter** for permanent production bonuses.

## Gameplay

**Core loop**
- **Mine** — tap the asteroid to earn minerals and kick-start your empire.
- **Drill Heat** — rapid tapping builds a combo meter that multiplies tap value up to ×3; it decays when you stop, rewarding bursts of active play.
- **Shatter the belt** — every mineral earned damages the current asteroid. Break it for a
  bonus payout and fly to the next rock; each is permanently richer, and every 10th is a
  tougher **boss** with a huge reward and a victory frenzy.
- **Empire** — 10 generator tiers (Mining Drone → Galactic Core Tap) with passive output,
  per-generator and global upgrades, and a milestone doubling every 25 owned. Buy ×1/×10/Max.

**Events**
- **Golden comets** — catch them for a ×7 production frenzy or a mineral windfall.
- **Cosmic events** — timed opportunity pop-ups with risk/reward choices.

**Meta progression**
- **Fleet expeditions** — timed missions that cost fuel, return loot, and recover one of
  **18 artifacts** (permanent perks).
- **Research Lab** — a two-tier tech tree bought with Research Points minted by shattering.
- **Prestige (Supernova Collapse)** — reset the run for **Dark Matter**, spent in a permanent
  shop (production, taps, comets, expeditions, head starts, offline cap, DM gain).
- **Ascension** — sacrifice the Dark Matter layer for **Singularity Cores** (permanent
  multiplier) and **perks**, including automation: auto-tap, auto-buy, auto-expeditions.
- **Challenges** — six constrained runs (no generators, no upgrades, throttled production…)
  that grant permanent rewards.
- **Goals** — 41 achievements, each a permanent production bonus.

**Quality of life**
- **Offline earnings** while away (capped, extendable), a **daily bonus** with streaks,
  **sound** + **settings**, a **Statistics** breakdown of every multiplier, and
  **save backup/restore** via portable codes. Auto-saves locally; no account or network.

## Running the game

Requires Node 20+.

```bash
npm install
npx expo start
```

Then scan the QR code with the **Expo Go** app ([iOS](https://apps.apple.com/app/expo-go/id982107779) /
[Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) to play on your
phone. If your phone isn't on the same network, use `npx expo start --tunnel`.

You can also run it in a browser with `npx expo start --web`.

To ship store builds later, use [EAS Build](https://docs.expo.dev/build/setup/):
`npx eas build --platform all`.

## Development

```bash
npm run typecheck   # strict TypeScript check
npm test            # jest suite (game math, store, persistence, economy simulation)
npm run sim         # balance playthrough: prints a timeline + ASCII charts of
                    # how long each part of the game takes (re-run while tuning)
```

The simulator (`scripts/balance-sim.ts`) drives the real game store with an
optimal-payback strategy and fast-forwards idle gaps, so its timing always
reflects the current balance constants. It prints a milestone timeline, a
per-phase bar chart, and an **active-vs-idle** comparison (an idle player taps
only to bootstrap their first generator, then runs purely passive). Override
the strategy via env vars without editing the file, e.g.:

```bash
TAPS_PER_SEC=0 npm run sim          # model a pure-idle playstyle
STOP_AT_ASCENSIONS=1 npm run sim    # only simulate up to the first ascension
PRESTIGE_GROWTH=1 npm run sim       # prestige less eagerly
```

### Architecture

```
src/
├── game/        # Pure game logic — no React imports, fully unit-tested
│   ├── balance.ts   # All tuning data: generators, upgrades, prestige constants
│   ├── math.ts      # Cost curves, bulk buying, production & tap formulas
│   ├── prestige.ts  # Dark Matter formulas
│   ├── offline.ts   # Offline earnings
│   └── tick.ts      # Pure tick step
├── store/       # zustand store + AsyncStorage persistence (versioned saves)
├── hooks/       # Game loop (timestamp-delta ticks) + AppState lifecycle
├── components/  # Asteroid, generator rows, upgrade cards, tab bar, modals
└── screens/     # Mine / Empire / Prestige screens
```

Key design choices:

- **Timestamp-delta ticking**: production is derived from real elapsed time, never from tick
  counts, so timer jitter loses nothing. Gaps longer than 2 s flow through the offline path.
- **Cached derived values**: minerals/sec and tap value are recomputed only on purchases and
  prestige, so the 10 Hz tick is a single multiply-add.
- **Plain JS numbers**: the economy tops out far below the 1e308 double limit; values display
  with 3-significant-figure suffixes (K, M, B, T, aa, ab, …).
