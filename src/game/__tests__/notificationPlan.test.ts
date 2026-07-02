import { OFFLINE_CAP_MS } from '../balance';
import { DAILY_COOLDOWN_MS } from '../daily';
import { planNotifications } from '../notificationPlan';

const NOW = 1_000_000_000;

const base = {
  expedition: null as { defId: string; startedAt: number; endsAt: number; loot: number } | null,
  lastDailyAt: 0,
  transcendCount: 0,
  artifacts: {} as Record<string, true>,
  dmUpgrades: {} as Record<string, number>,
  research: {} as Record<string, true>,
  cachedCps: 0,
  cachedCrystalCps: 0,
};

describe('planNotifications', () => {
  it('plans nothing for a fresh, idle game', () => {
    expect(planNotifications(base, NOW)).toEqual([]);
  });

  it('schedules the expedition return at its exact end time', () => {
    const plans = planNotifications(
      { ...base, expedition: { defId: 'scout', startedAt: NOW, endsAt: NOW + 60_000, loot: 5 } },
      NOW,
    );
    expect(plans).toHaveLength(1);
    expect(plans[0].id).toBe('expedition');
    expect(plans[0].fireAt).toBe(NOW + 60_000);
  });

  it('skips an expedition that already ended', () => {
    const plans = planNotifications(
      { ...base, expedition: { defId: 'scout', startedAt: 0, endsAt: NOW - 1, loot: 5 } },
      NOW,
    );
    expect(plans).toEqual([]);
  });

  it('schedules the offline cap only while producing, honoring Temporal Vault', () => {
    expect(planNotifications({ ...base, cachedCps: 10 }, NOW)[0]).toMatchObject({
      id: 'offline_cap',
      fireAt: NOW + OFFLINE_CAP_MS,
    });
    // Temporal Vault (+1h per level) pushes the cap notification later.
    const vaulted = planNotifications(
      { ...base, cachedCps: 10, dmUpgrades: { temporal_vault: 2 } },
      NOW,
    );
    expect(vaulted[0].fireAt).toBeGreaterThan(NOW + OFFLINE_CAP_MS);
  });

  it('uses crystal production and the flat cap in crystal mode', () => {
    // Mineral CPS is stale post-Transcend; only crystal CPS counts, and the
    // Temporal Vault (wiped by Transcendence) must not extend the window.
    const idle = planNotifications({ ...base, transcendCount: 1, cachedCps: 99 }, NOW);
    expect(idle).toEqual([]);
    const plans = planNotifications(
      { ...base, transcendCount: 1, cachedCrystalCps: 5, dmUpgrades: { temporal_vault: 9 } },
      NOW,
    );
    expect(plans[0]).toMatchObject({ id: 'offline_cap', fireAt: NOW + OFFLINE_CAP_MS });
    expect(plans[0].body).toContain('crystal');
  });

  it('schedules the daily bonus off cooldown, but never for first-timers', () => {
    // Never claimed → no nag; the first daily is discovered in-app.
    expect(planNotifications({ ...base, lastDailyAt: 0 }, NOW)).toEqual([]);
    const plans = planNotifications({ ...base, lastDailyAt: NOW - 1000 }, NOW);
    expect(plans[0]).toMatchObject({ id: 'daily', fireAt: NOW - 1000 + DAILY_COOLDOWN_MS });
    // Already claimable right now → no instant notification.
    expect(planNotifications({ ...base, lastDailyAt: NOW - DAILY_COOLDOWN_MS }, NOW)).toEqual([]);
  });

  it('returns all plans sorted soonest-first', () => {
    const plans = planNotifications(
      {
        ...base,
        cachedCps: 10, // fires at +8h
        lastDailyAt: NOW - DAILY_COOLDOWN_MS + 60_000, // fires at +1min
        expedition: { defId: 'scout', startedAt: NOW, endsAt: NOW + 3_600_000, loot: 5 }, // +1h
      },
      NOW,
    );
    expect(plans.map((p) => p.id)).toEqual(['daily', 'expedition', 'offline_cap']);
  });
});
