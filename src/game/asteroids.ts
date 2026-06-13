/** Asteroid belt progression: finite rocks that shatter and get richer. */

export const ASTEROID_BASE_HP = 400;
export const ASTEROID_HP_GROWTH = 3.0;
/** Each asteroid deeper in the belt multiplies all production by this. */
export const ASTEROID_RICHNESS_GROWTH = 1.15;
/** Fraction of an asteroid's HP paid out as minerals when it shatters. */
export const SHATTER_BONUS_FRACTION = 0.1;

export interface AsteroidType {
  name: string;
  emoji: string;
}

export const ASTEROID_TYPES: AsteroidType[] = [
  { name: 'Rocky', emoji: '🪨' },
  { name: 'Glacial', emoji: '🧊' },
  { name: 'Ferrous', emoji: '🟤' },
  { name: 'Auric', emoji: '🟡' },
  { name: 'Crystalline', emoji: '💠' },
  { name: 'Voidstone', emoji: '🟣' },
];

export function asteroidType(index: number): AsteroidType {
  return ASTEROID_TYPES[index % ASTEROID_TYPES.length];
}

export function asteroidName(index: number): string {
  return `${asteroidType(index).name} Asteroid #${index + 1}`;
}

export function asteroidHp(index: number): number {
  return Math.ceil(ASTEROID_BASE_HP * ASTEROID_HP_GROWTH ** index);
}

export function asteroidRichness(index: number): number {
  return ASTEROID_RICHNESS_GROWTH ** index;
}

export function shatterBonus(index: number): number {
  return Math.ceil(asteroidHp(index) * SHATTER_BONUS_FRACTION);
}

/** Research Points awarded for shattering the asteroid at `index`. */
export function rpFromShatter(index: number): number {
  return 1 + Math.floor(index / 2);
}

export interface ShatterResult {
  asteroidIndex: number;
  asteroidDamage: number;
  bonus: number;
  shattered: number;
}

/**
 * Apply mining damage to the belt. Damage spills over into deeper asteroids,
 * so a large offline haul can chain-shatter several. Shatter bonuses are pure
 * payout and deal no damage themselves.
 */
export function applyDamage(
  asteroidIndex: number,
  asteroidDamage: number,
  damage: number,
): ShatterResult {
  let index = asteroidIndex;
  let accumulated = asteroidDamage + damage;
  let bonus = 0;
  let shattered = 0;
  while (accumulated >= asteroidHp(index)) {
    accumulated -= asteroidHp(index);
    bonus += shatterBonus(index);
    index++;
    shattered++;
  }
  return { asteroidIndex: index, asteroidDamage: accumulated, bonus, shattered };
}
