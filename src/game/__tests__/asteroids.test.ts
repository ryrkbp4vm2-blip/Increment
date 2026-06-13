import {
  applyDamage,
  ASTEROID_BASE_HP,
  ASTEROID_HP_GROWTH,
  BOSS_HP_MULT,
  BOSS_REWARD_MULT,
  asteroidHp,
  asteroidName,
  asteroidRichness,
  asteroidType,
  isBoss,
  rpFromShatter,
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

describe('boss asteroids', () => {
  it('marks every 10th asteroid as a boss', () => {
    expect(isBoss(0)).toBe(false);
    expect(isBoss(8)).toBe(false);
    expect(isBoss(9)).toBe(true); // #10
    expect(isBoss(19)).toBe(true); // #20
  });

  it('gives bosses much more HP and bigger rewards', () => {
    const normalHp = Math.ceil(ASTEROID_BASE_HP * ASTEROID_HP_GROWTH ** 9);
    expect(asteroidHp(9)).toBe(normalHp * BOSS_HP_MULT);
    // shatter bonus and RP are boss-multiplied
    expect(shatterBonus(9)).toBe(Math.ceil(asteroidHp(9) * 0.1) * BOSS_REWARD_MULT);
    expect(rpFromShatter(9)).toBe((1 + Math.floor(9 / 2)) * BOSS_REWARD_MULT);
  });

  it('names bosses distinctly', () => {
    expect(asteroidName(9)).toMatch(/#10/);
    expect(asteroidName(9)).not.toMatch(/Asteroid/);
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
