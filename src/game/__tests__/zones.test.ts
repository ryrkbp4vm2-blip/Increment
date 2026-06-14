import {
  SECTOR_PRODUCTION_MULT,
  ZONE_WARP_ASCENSIONS,
  canWarp,
  sectorMult,
  sectorName,
  sectorTrait,
} from '../zones';

describe('canWarp', () => {
  it('needs the required ascensions since the last warp', () => {
    expect(canWarp(0)).toBe(false);
    expect(canWarp(ZONE_WARP_ASCENSIONS - 1)).toBe(false);
    expect(canWarp(ZONE_WARP_ASCENSIONS)).toBe(true);
  });
});

describe('sectorMult', () => {
  it('compounds the production multiplier per sector', () => {
    expect(sectorMult(0)).toBe(1);
    expect(sectorMult(1)).toBe(SECTOR_PRODUCTION_MULT);
    expect(sectorMult(2)).toBe(SECTOR_PRODUCTION_MULT ** 2);
  });
});

describe('sectorName', () => {
  it('names sectors and laps the list', () => {
    expect(sectorName(0)).toBe('Orion Belt');
    expect(sectorName(6)).toBe('Orion Belt 2');
  });
});

describe('sectorTrait', () => {
  it('makes the home belt (sector 0) the neutral baseline', () => {
    const home = sectorTrait(0);
    expect(home.productionMult).toBe(1);
    expect(home.tapMult).toBe(1);
    expect(home.hpMult).toBe(1);
  });

  it('cycles distinct personalities with the sector name', () => {
    // Same lap, different sectors -> different traits.
    expect(sectorTrait(1).trait).not.toBe(sectorTrait(2).trait);
    // A lap later, the same flavour repeats.
    expect(sectorTrait(6)).toEqual(sectorTrait(0));
    expect(sectorTrait(7)).toEqual(sectorTrait(1));
  });

  it('every trait stays within sane, non-stalling bounds', () => {
    for (let s = 0; s < 6; s++) {
      const t = sectorTrait(s);
      expect(t.productionMult).toBeGreaterThan(0);
      expect(t.tapMult).toBeGreaterThan(0);
      expect(t.hpMult).toBeGreaterThan(0);
    }
  });
});
