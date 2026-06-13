import { EVENT_COUNT, pickEvent } from '../cosmicEvents';

const ctx = { cps: 100, minerals: 1e6, totalResearch: 40 };

describe('pickEvent', () => {
  it('selects each builder across the random range', () => {
    const ids = new Set<string>();
    for (let i = 0; i < EVENT_COUNT; i++) {
      const r = (i + 0.5) / EVENT_COUNT;
      ids.add(pickEvent(ctx, () => r).id);
    }
    expect(ids.size).toBe(EVENT_COUNT);
  });

  it('resolves reward amounts from production at spawn time', () => {
    const derelict = pickEvent(ctx, () => 2 / EVENT_COUNT + 0.001); // index 2
    expect(derelict.id).toBe('derelict');
    const windfall = derelict.options.find((o) => o.outcome.kind === 'windfall')!;
    expect(windfall.outcome).toEqual({ kind: 'windfall', amount: 100 * 240 });
    const rp = derelict.options.find((o) => o.outcome.kind === 'rp')!;
    // max(5, round(40*0.05)+6) = 8
    expect(rp.outcome).toEqual({ kind: 'rp', amount: 8 });
  });

  it('the pirate event carries a timeout penalty', () => {
    let pirate = pickEvent(ctx, () => 0.999);
    // find the pirate event deterministically
    for (let i = 0; i < EVENT_COUNT; i++) {
      const ev = pickEvent(ctx, () => (i + 0.5) / EVENT_COUNT);
      if (ev.id === 'pirates') pirate = ev;
    }
    expect(pirate.id).toBe('pirates');
    expect(pirate.timeoutOutcome).toEqual({ kind: 'loseMineralsPct', pct: 0.05 });
  });
});
