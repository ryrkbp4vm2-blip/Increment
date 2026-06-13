import { ARTIFACTS, artifactPowers } from '../artifacts';
import {
  EXPEDITIONS_BY_ID,
  expeditionDuration,
  expeditionFuel,
  expeditionLoot,
  rollExpeditionResult,
} from '../expeditions';

const scout = EXPEDITIONS_BY_ID.scout;
const noPowers = artifactPowers({});

describe('expedition economics', () => {
  it('scales fuel and loot with production, with floors', () => {
    expect(expeditionFuel(scout, 0, noPowers)).toBe(scout.fuelMin);
    expect(expeditionFuel(scout, 10, noPowers)).toBe(10 * scout.fuelSeconds);
    expect(expeditionLoot(scout, 0, noPowers)).toBe(scout.lootMin);
    expect(expeditionLoot(scout, 10, noPowers)).toBe(10 * scout.lootSeconds);
  });

  it('applies artifact fuel/loot/speed bonuses', () => {
    const powers = artifactPowers({
      ghost_hull: true, // fuel x0.5
      star_chart: true, // loot x1.5
      ancient_beacon: true, // duration x0.8
    });
    expect(expeditionFuel(scout, 10, powers)).toBe(Math.ceil(10 * scout.fuelSeconds * 0.5));
    expect(expeditionLoot(scout, 10, powers)).toBe(Math.ceil(10 * scout.lootSeconds * 1.5));
    expect(expeditionDuration(scout, powers)).toBe(Math.round(scout.durationMs * 0.8));
  });
});

describe('rollExpeditionResult', () => {
  const expedition = { defId: 'scout', startedAt: 0, endsAt: 1, loot: 1000 };

  it('returns plain loot when the artifact roll misses', () => {
    const result = rollExpeditionResult(expedition, {}, () => 0.99);
    expect(result).toEqual({ loot: 1000, artifactId: null });
  });

  it('awards a not-yet-owned artifact on a hit', () => {
    const owned: Record<string, true> = {};
    const result = rollExpeditionResult(expedition, owned, () => 0.01);
    expect(result.artifactId).not.toBeNull();
    expect(owned[result.artifactId!]).toBeUndefined();
  });

  it('never awards duplicates and boosts loot when collection is complete', () => {
    const all = Object.fromEntries(ARTIFACTS.map((a) => [a.id, true as const]));
    const result = rollExpeditionResult(expedition, all, () => 0.01);
    expect(result.artifactId).toBeNull();
    expect(result.loot).toBe(1500);
  });
});
