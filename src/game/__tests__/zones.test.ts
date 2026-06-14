import {
  SECTOR_PRODUCTION_MULT,
  ZONE_WARP_ASCENSIONS,
  canWarp,
  sectorMult,
  sectorName,
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
