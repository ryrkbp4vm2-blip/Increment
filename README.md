# 🪨 Asteroid Tycoon

An incremental (idle/clicker) game for **iOS and Android**, built with React Native + Expo.

Tap an asteroid to mine minerals, build an automated mining empire, and eventually collapse
it all into **Dark Matter** for permanent production bonuses.

## Gameplay

- **⛏️ Mine** — tap the asteroid to earn minerals and kick-start your empire.
- **💥 Shatter the belt** — every mineral you earn damages the current asteroid. Break it and
  it shatters (with a bonus payout), and you fly to the next rock — Glacial, Ferrous, Auric,
  Crystalline, Voidstone — each one permanently richer (+15% production per asteroid this run).
- **☄️ Golden comets** — every minute or two a comet streaks by; catch it for a ×7
  production frenzy or an instant mineral windfall.
- **🚀 Empire** — spend minerals on 8 tiers of generators (Mining Drones → Dyson Swarm) that
  produce passively, plus upgrades that multiply tap power and production. Buy ×1, ×10, or Max.
  Every 25 of a generator doubles its output.
- **🛰️ Fleet expeditions** — send your fleet on timed missions (5 min sweeps to 2 h ghost-ship
  salvages). They cost fuel, return mineral loot, and can recover one of **12 unique artifacts**
  with permanent perks. Artifacts survive prestige. Expeditions keep flying while you're away.
- **🌌 Prestige** — once you've mined 1T minerals in a run, trigger a *Supernova Collapse*:
  reset the run for Dark Matter, each granting **+2% to all production and taps, forever**.
- **💤 Offline earnings** — your empire keeps mining while the app is closed (up to 8 hours),
  collected via a "Welcome back" report.
- **💾 Auto-save** — progress persists locally (every 10 s and on backgrounding). No account,
  no network needed.

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
