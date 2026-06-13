import {
  applyDamage,
  ASTEROID_BASE_HP,
  ASTEROID_HP_GROWTH,
  asteroidHp,
  asteroidName,
  asteroidRichness,
  asteroidType,
  shatterBonus,
} from '../asteroids';

describe('asteroid curve', () => {
  it('grows HP exponentially', () => {
    expect(asteroidHp(0)).toBe(ASTEROID_BASE_HP);
    expect(asteroidHp(1)).toBe(Math.ceil(ASTEROID_BASE_HP * ASTEROID_HP_GROWTH));
    expect(asteroidHp(3)).toBe(Math.ceil(ASTEROID_BASE_HP * ASTEROID_HP_GROWTH ** 3));
  });

  it('compounds richness per asteroid', () => {
    expect(asteroidRichness(0)).toBe(1);
    expect(asteroidRichness(2)).toBeCloseTo(1.15 ** 2);
  });

  it('cycles types and numbers names', () => {
    expect(asteroidType(0).name).toBe('Rocky');
    expect(asteroidType(6).name).toBe('Rocky'); // 6 types, wraps
    expect(asteroidName(1)).toBe('Glacial Asteroid #2');
  });
});

describe('applyDamage', () => {
  it('accumulates damage without shattering below HP', () => {
    const result = applyDamage(0, 100, 200);
    expect(result).toEqual({ asteroidIndex: 0, asteroidDamage: 300, bonus: 0, shattered: 0 });
  });

  it('shatters and pays the bonus when HP is reached', () => {
    const result = applyDamage(0, 350, 100); // 450 vs 400 HP
    expect(result.asteroidIndex).toBe(1);
    expect(result.asteroidDamage).toBe(50);
    expect(result.bonus).toBe(shatterBonus(0));
    expect(result.shattered).toBe(1);
  });

  it('chain-shatters across multiple asteroids on huge damage', () => {
    const huge = asteroidHp(0) + asteroidHp(1) + asteroidHp(2) + 10;
    const result = applyDamage(0, 0, huge);
    expect(result.asteroidIndex).toBe(3);
    expect(result.asteroidDamage).toBe(10);
    expect(result.bonus).toBe(shatterBonus(0) + shatterBonus(1) + shatterBonus(2));
    expect(result.shattered).toBe(3);
  });
});
