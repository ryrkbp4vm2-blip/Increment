/**
 * Balance playthrough simulator.
 *
 *   npm run sim
 *
 * Drives the REAL game store (so it always reflects current balance) with a
 * reasonable "active then idle" player strategy, fast-forwarding idle gaps
 * analytically. Prints a milestone timeline and ASCII charts of how long each
 * part of the game takes. Tweak the STRATEGY constants below and re-run while
 * balancing.
 *
 * It's wrapped in a jest test only so it runs through the existing TS/babel
 * toolchain; it asserts nothing — the output is the deliverable.
 */
import { GENERATORS } from '../src/game/balance';
import { asteroidName, isBoss } from '../src/game/asteroids';
import { costOfNext, generatorProduction } from '../src/game/math';
import { pendingDarkMatter } from '../src/game/prestige';
import { pendingSingularityCores } from '../src/game/ascension';
import { canWarp, sectorName } from '../src/game/zones';
import { DM_UPGRADES, darkMatterUpgradeCost } from '../src/game/darkmatter';
import { RESEARCH_NODES, isResearchUnlocked } from '../src/game/research';
import { UPGRADES } from '../src/game/balance';
import { isUnlockMet } from '../src/game/math';
import { initialPersistedState, useGameStore } from '../src/store/gameStore';
import { formatNumber } from '../src/utils/format';

// ── Strategy knobs (tweak via env, e.g. `TAPS_PER_SEC=0 npm run sim`) ─────────
const envNum = (k: string, d: number) => (process.env[k] ? Number(process.env[k]) : d);
const TAPS_PER_SEC = envNum('TAPS_PER_SEC', 4); // active-player tap rate
const MAX_STEP_SECONDS = 60 * 60 * 6; // cap on a single analytic time-skip
const SIM_CAP_YEARS = envNum('SIM_CAP_YEARS', 50); // stop after this much game time
const STOP_AT_ASCENSIONS = envNum('STOP_AT_ASCENSIONS', 12); // ...or this many ascensions
const STOP_AT_SECTOR = envNum('STOP_AT_SECTOR', 2); // ...or reaching this sector (warps)
// Prestige/ascend when the pending gain both clears 1 and grows the bank ≥this.
const PRESTIGE_GROWTH = envNum('PRESTIGE_GROWTH', 0.5);
const ASCEND_GROWTH = envNum('ASCEND_GROWTH', 0.5);

const out = (s = '') => process.stdout.write(s + '\n');

function fmtDur(seconds: number): string {
  if (!isFinite(seconds)) return '∞';
  const y = 31_536_000, d = 86_400, h = 3600, m = 60;
  if (seconds >= y) return `${(seconds / y).toFixed(1)}y`;
  if (seconds >= d) return `${(seconds / d).toFixed(1)}d`;
  if (seconds >= h) return `${(seconds / h).toFixed(1)}h`;
  if (seconds >= m) return `${(seconds / m).toFixed(1)}m`;
  return `${seconds.toFixed(0)}s`;
}

interface Event {
  t: number; // sim seconds
  label: string;
  cps: number;
}

function runSimulation(tapsPerSec: number): Event[] {
  const events: Event[] = [];
  let simMs = 0;
  const get = () => useGameStore.getState();
  get().hydrate(initialPersistedState(0), 0);

  // Milestone trackers (record-once).
  const seen = new Set<string>();
  const record = (label: string) => {
    if (seen.has(label)) return;
    seen.add(label);
    events.push({ t: simMs / 1000, label, cps: get().cachedCps });
  };
  const LIFETIME_MARKS = [1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24];
  const BELT_MARKS = [1, 4, 9, 19, 49, 99];

  const checkMilestones = () => {
    const s = get();
    for (const g of GENERATORS) {
      if (s.generators[g.id] > 0) record(`Unlock ${g.name}`);
    }
    for (const mark of LIFETIME_MARKS) {
      if (s.lifetimeAllTime >= mark) record(`Earn ${formatNumber(mark)} minerals (all-time)`);
    }
    for (const idx of BELT_MARKS) {
      if (s.asteroidIndex >= idx) record(`Reach ${asteroidName(idx)}${isBoss(idx) ? ' (boss)' : ''}`);
    }
    for (const n of [1, 3, 5, 10, 25, 50, 100]) if (s.prestigeCount >= n) record(`Prestige #${n}`);
    for (const n of [1, 2, 3, 4, 5, 7, 10]) if (s.ascensionCount >= n) record(`Ascension #${n}`);
    for (const n of [1, 2, 3]) if (s.sector >= n) record(`Warp to ${sectorName(n)} (sector ${n})`);
    if (Object.keys(s.research).length >= RESEARCH_NODES.length) record('All research complete');
  };

  const effectiveRate = (): number => {
    const s = get();
    // Even an "idle" player must tap to bootstrap their first generator;
    // after that they rely on the chosen tap rate (0 = pure passive).
    const genTotal = GENERATORS.reduce((n, g) => n + s.generators[g.id], 0);
    const taps = genTotal === 0 ? Math.max(tapsPerSec, 2) : tapsPerSec;
    // An active player taps continuously; idle (tapsPerSec 0) relies on passive.
    return s.cachedCps + s.cachedTapValue * taps;
  };

  const buyPhase = () => {
    for (let guard = 0; guard < 5000; guard++) {
      let bought = false;
      const s = get();
      // Research (spent with Research Points).
      for (const node of RESEARCH_NODES) {
        if (!s.research[node.id] && isResearchUnlocked(node, s.research) && s.researchPoints >= node.cost) {
          get().buyResearch(node.id);
          bought = true;
        }
      }
      // Mineral upgrades (cheap, always worth it).
      for (const u of UPGRADES) {
        const cur = get();
        if (!cur.upgrades[u.id] && isUnlockMet(u.unlock, cur) && cur.minerals >= u.cost) {
          get().buyUpgrade(u.id);
          bought = true;
        }
      }
      // Best-payback affordable generator.
      const cur = get();
      let best: { id: string; payback: number } | null = null;
      for (const g of GENERATORS) {
        const owned = cur.generators[g.id];
        const cost = costOfNext(g, owned);
        if (cost > cur.minerals) continue;
        const marginal = generatorProduction(g, owned + 1, cur) - generatorProduction(g, owned, cur);
        const payback = marginal > 0 ? cost / marginal : Infinity;
        if (!best || payback < best.payback) best = { id: g.id, payback };
      }
      if (best) {
        get().buyGenerator(best.id as never, 1);
        bought = true;
      }
      if (!bought) break;
    }
  };

  const spendDarkMatter = () => {
    for (let guard = 0; guard < 2000; guard++) {
      const s = get();
      let cheapest: { id: string; cost: number } | null = null;
      for (const def of DM_UPGRADES) {
        const lvl = s.dmUpgrades[def.id] ?? 0;
        if (lvl >= def.maxLevel) continue;
        const cost = darkMatterUpgradeCost(def, lvl);
        if (cost <= s.darkMatter && (!cheapest || cost < cheapest.cost)) cheapest = { id: def.id, cost };
      }
      if (!cheapest) break;
      get().buyDarkMatterUpgrade(cheapest.id);
    }
  };

  const maybePrestige = () => {
    const s = get();
    const pending = pendingDarkMatter(s.lifetimeThisRun);
    if (pending < 1) return false;
    if (s.totalDarkMatter > 0 && pending < PRESTIGE_GROWTH * s.totalDarkMatter) return false;
    get().doPrestige();
    spendDarkMatter();
    return true;
  };

  const maybeAscend = () => {
    const s = get();
    const pending = pendingSingularityCores(s.dmSinceAscension);
    if (pending < 1) return false;
    if (s.totalSingularityCores > 0 && pending < ASCEND_GROWTH * s.totalSingularityCores) return false;
    get().doAscend();
    return true;
  };

  // Warp to the next sector as soon as the ascension gate allows; the sector's
  // ×50 production gain is always worth taking.
  const maybeWarp = () => {
    if (!canWarp(get().ascensionsSinceWarp)) return false;
    get().doWarp();
    return true;
  };

  const nextMineralTarget = (): number => {
    const s = get();
    let min = Infinity;
    for (const g of GENERATORS) min = Math.min(min, costOfNext(g, s.generators[g.id]));
    for (const u of UPGRADES) {
      if (!s.upgrades[u.id] && isUnlockMet(u.unlock, s)) min = Math.min(min, u.cost);
    }
    return min;
  };

  const advance = (targetCost: number) => {
    const s = get();
    const rate = effectiveRate();
    if (rate <= 0) return false;
    // Step straight to the next purchase; the offline path chain-shatters the
    // belt within that step, so the sim measures macro pacing (buy-to-buy)
    // instead of crawling one asteroid at a time.
    const need = targetCost - s.minerals;
    let dt = need > 0 ? need / rate : MAX_STEP_SECONDS;
    if (!isFinite(dt) || dt <= 0) dt = MAX_STEP_SECONDS;
    dt = Math.min(Math.max(dt, 0.001), MAX_STEP_SECONDS);
    simMs += dt * 1000;
    get().applyOffline(rate * dt, simMs);
    return true;
  };

  const capMs = SIM_CAP_YEARS * 31_536_000 * 1000;
  checkMilestones();
  for (let iter = 0; iter < 5_000_000; iter++) {
    buyPhase();
    while (maybePrestige()) buyPhase();
    if (maybeAscend()) buyPhase();
    if (maybeWarp()) buyPhase();
    checkMilestones();
    if (
      get().ascensionCount >= STOP_AT_ASCENSIONS ||
      get().sector >= STOP_AT_SECTOR ||
      simMs >= capMs
    )
      break;
    if (!advance(nextMineralTarget())) break;
    checkMilestones();
  }
  return events;
}

function printReport(events: Event[], title: string) {
  events.sort((a, b) => a.t - b.t);
  out('');
  out('═══════════════════════════════════════════════════════════════');
  out(`  ASTEROID TYCOON — BALANCE PLAYTHROUGH (${title})`);
  out('═══════════════════════════════════════════════════════════════');
  out('');
  out('  TIMELINE  (cumulative game-time · gap since previous · event)');
  out('  ───────────────────────────────────────────────────────────');
  let prev = 0;
  for (const e of events) {
    const gap = e.t - prev;
    prev = e.t;
    out(
      `  ${fmtDur(e.t).padStart(6)}  ${('+' + fmtDur(gap)).padStart(8)}  ` +
        `${e.label.padEnd(34)} ${formatNumber(e.cps)}/s`,
    );
  }

  // Phase bar chart: time spent between consecutive milestones.
  out('');
  out('  TIME PER PHASE  (gap to reach each milestone)');
  out('  ───────────────────────────────────────────────────────────');
  const maxGap = Math.max(...events.map((e, i) => e.t - (i ? events[i - 1].t : 0)), 1);
  prev = 0;
  for (const e of events) {
    const gap = e.t - prev;
    prev = e.t;
    const bars = Math.round((gap / maxGap) * 40);
    out(`  ${e.label.padEnd(34)} ${'█'.repeat(bars).padEnd(40)} ${fmtDur(gap)}`);
  }

  // Headline summary.
  const find = (re: RegExp) => events.find((e) => re.test(e.label));
  out('');
  out('  SUMMARY');
  out('  ───────────────────────────────────────────────────────────');
  const p1 = find(/Prestige #1/);
  const a1 = find(/Ascension #1/);
  const a5 = find(/Ascension #5/);
  const w1 = find(/Warp to .*sector 1/);
  const w2 = find(/Warp to .*sector 2/);
  out(`  First prestige:   ${p1 ? fmtDur(p1.t) : '—'}`);
  out(`  First ascension:  ${a1 ? fmtDur(a1.t) : '—'}`);
  out(`  Fifth ascension:  ${a5 ? fmtDur(a5.t) : '—'}`);
  out(`  First warp:       ${w1 ? fmtDur(w1.t) : '—'}`);
  out(`  Second warp:      ${w2 ? fmtDur(w2.t) : '—'}`);
  out(`  Total simulated:  ${fmtDur(events.length ? events[events.length - 1].t : 0)}`);
  out('');
}

function printComparison(active: Event[], idle: Event[]) {
  const at = (evs: Event[], re: RegExp) => {
    const e = evs.find((x) => re.test(x.label));
    return e ? fmtDur(e.t) : '—';
  };
  const rows: [string, RegExp][] = [
    ['First prestige', /Prestige #1/],
    ['First ascension', /Ascension #1/],
    ['Third ascension', /Ascension #3/],
    ['Fifth ascension', /Ascension #5/],
    ['First warp', /Warp to .*sector 1/],
    ['Second warp', /Warp to .*sector 2/],
    ['Total simulated', /.*/],
  ];
  out('');
  out('  ACTIVE vs IDLE  (time to reach milestone)');
  out('  ───────────────────────────────────────────────────────────');
  out(`  ${'milestone'.padEnd(20)} ${'active'.padStart(9)} ${'idle'.padStart(9)}`);
  for (const [label, re] of rows) {
    const a = label === 'Total simulated' ? fmtDur(active.at(-1)?.t ?? 0) : at(active, re);
    const i = label === 'Total simulated' ? fmtDur(idle.at(-1)?.t ?? 0) : at(idle, re);
    out(`  ${label.padEnd(20)} ${a.padStart(9)} ${i.padStart(9)}`);
  }
  out('');
}

describe('balance playthrough', () => {
  it('prints a timeline (no assertions — output is the report)', () => {
    const active = runSimulation(TAPS_PER_SEC);
    const idle = runSimulation(0); // pure passive/offline player, never taps
    printReport(active, `ACTIVE · ${TAPS_PER_SEC} taps/s`);
    printComparison(active, idle);
    expect(active.length).toBeGreaterThan(0);
  }, 120_000);
});
