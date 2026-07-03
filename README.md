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
- **Sectors** — after 5 ascensions, **Warp** to the next sector for a ×50 permanent
  production multiplier and a fresh, visually distinct belt. The run, Dark Matter and
  spendable cores reset; collections, research, perks and the singularity bonus carry over.
- **Challenges** — six constrained runs (no generators, no upgrades, throttled production…)
  that unlock progressively across ascensions and grant permanent rewards. Goals scale with
  your permanent power, so they stay challenging forever.
- **Goals** — 41 achievements, each a permanent production bonus.

**Transcendence — the crystal endgame**
- After enough ascensions, **Transcend**: permanently trade the entire mineral empire for
  **Crystals** and a brand-new game — mine Crystal Formations, build crystal generators in
  the **Forge**, and catch **Resonant Geodes**.
- **Prime formations** — every 10th formation is a boss: far tougher, a huge payout, and a
  victory frenzy when it breaks.
- **Harmonic Relics** — 8 permanent perks, each sealed inside a specific Prime formation and
  claimed on its first-ever kill. Relics survive everything.
- **Resonant Echoes** — risk/reward event pop-ups (harmonic surges, geode caches, dissonant
  swarms that eat your reserves if ignored).
- **Resonance Cascade** — the in-crystal prestige: reset the crystal run for permanent
  **Resonance** (production multiplier) and **Attunement**, spent on the permanent
  **Crystal Matrix**.
- **Crystal Challenges** — five constrained Cascade runs with permanent crystal rewards,
  unlocking as Resonance grows.
- **Convergence** — the deepest layer: channel enough Attunement, then collapse the whole
  crystal cosmos into **Eons** and the Convergence tree.

**Quality of life**
- **Offline earnings** while away (capped, extendable), a **daily bonus** with streaks,
  optional **reminder notifications** (expedition returned, offline storage full, daily
  bonus ready), **sound** + **haptics** (off/light/full), a **Statistics** panel with full
  multiplier breakdowns and all-time **records** (fastest collapse, deepest push, peak
  rates, playtime), and **save backup/restore** via portable codes. Auto-saves locally;
  no account or network.

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

To ship store builds later, use [EAS Build](https://docs.expo.dev/build/setup/).
Build profiles are configured in `eas.json` (preview = installable APK / internal
build, production = store binary). See **[DEVICE_TESTING.md](DEVICE_TESTING.md)**
for the full build commands and an on-device QA checklist.

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
