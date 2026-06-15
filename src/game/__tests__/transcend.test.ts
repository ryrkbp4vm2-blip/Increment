import {
  CRYSTAL_BONUS,
  CRYSTAL_UPGRADES_BY_ID,
  TRANSCEND_ASCENSIONS,
  canTranscend,
  crystalFormationBonusMult,
  crystalGain,
  crystalMult,
  crystalPowers,
  crystalTotalEffect,
  crystalUpgradeCost,
  crystalYieldMult,
  nextTranscendIn,
  pendingCrystals,
  resonancePowerMult,
  transcendUnlocked,
} from '../transcend';

describe('transcend gating', () => {
  it('unlocks the layer at the 5th lifetime ascension', () => {
    expect(transcendUnlocked(TRANSCEND_ASCENSIONS - 1)).toBe(false);
    expect(transcendUnlocked(TRANSCEND_ASCENSIONS)).toBe(true);
  });

  it('allows a transcend once enough ascensions are banked since the last one', () => {
    expect(canTranscend(TRANSCEND_ASCENSIONS - 1)).toBe(false);
    expect(canTranscend(TRANSCEND_ASCENSIONS)).toBe(true);
    expect(nextTranscendIn(2)).toBe(TRANSCEND_ASCENSIONS - 2);
    expect(nextTranscendIn(TRANSCEND_ASCENSIONS + 3)).toBe(0);
  });
});

describe('pendingCrystals', () => {
  it('is zero below the gate and one per ascension past it', () => {
    expect(pendingCrystals(TRANSCEND_ASCENSIONS - 1)).toBe(0);
    expect(pendingCrystals(TRANSCEND_ASCENSIONS)).toBe(1);
    expect(pendingCrystals(TRANSCEND_ASCENSIONS + 4)).toBe(5);
  });
});

describe('crystalGain', () => {
  it('applies the Crystal Lattice yield bonus and floors', () => {
    // base 4 crystals, +25%/level: 2 levels -> x1.5 -> 6
    expect(crystalGain(TRANSCEND_ASCENSIONS + 3, { crystal_lattice: 2 })).toBe(6);
    // below the gate yields nothing regardless of upgrades
    expect(crystalGain(0, { crystal_lattice: 9 })).toBe(0);
  });
});

describe('crystalYieldMult', () => {
  it('adds 25% per Crystal Lattice level', () => {
    expect(crystalYieldMult({})).toBe(1);
    expect(crystalYieldMult({ crystal_lattice: 4 })).toBeCloseTo(2);
  });
});

describe('crystalMult', () => {
  it('grants a permanent global bonus per total Crystal', () => {
    expect(crystalMult(0)).toBe(1);
    expect(crystalMult(3)).toBeCloseTo(1 + CRYSTAL_BONUS * 3);
  });
});

describe('crystal matrix upgrades', () => {
  it('scales cost linearly with level', () => {
    const def = CRYSTAL_UPGRADES_BY_ID.crystal_resonance;
    expect(crystalUpgradeCost(def, 0)).toBe(def.baseCost);
    expect(crystalUpgradeCost(def, 3)).toBe(def.baseCost * 4);
  });

  it('turns global and tap levels into multipliers, ignoring yield', () => {
    const p = crystalPowers({ crystal_resonance: 2, crystal_clarity: 1, crystal_lattice: 5 });
    expect(p.globalMult).toBeCloseTo(1 + 1 * 2); // +100%/level
    expect(p.tapMult).toBeCloseTo(1 + 1.5 * 1); // +150%/level
  });

  it('Singularity Core (deep global) stacks multiplicatively', () => {
    // crystal_singularity is +200%/level, multiplicative with other globals.
    const p = crystalPowers({ crystal_resonance: 1, crystal_singularity: 1 });
    expect(p.globalMult).toBeCloseTo((1 + 1) * (1 + 2));
  });
});

describe('deep-tier Matrix upgrades', () => {
  it('Resonance Amplifier raises the per-level Resonance bonus by 20%/level', () => {
    expect(resonancePowerMult({})).toBe(1);
    expect(resonancePowerMult({ crystal_amplifier: 3 })).toBeCloseTo(1.6);
  });

  it('Fracture Engine adds to the formation shatter bonus alongside Crystal Prism', () => {
    // crystal_prism +50%/level, crystal_fracture +100%/level.
    expect(crystalFormationBonusMult({ crystal_prism: 2, crystal_fracture: 1 })).toBeCloseTo(
      1 + 0.5 * 2 + 1 * 1,
    );
  });

  it('describes the resonancePower effect', () => {
    const def = CRYSTAL_UPGRADES_BY_ID.crystal_amplifier;
    expect(crystalTotalEffect(def, 2)).toBe('+40% Resonance power');
  });

  it('gates the deep tier behind Resonance milestones', () => {
    expect(CRYSTAL_UPGRADES_BY_ID.crystal_amplifier.unlockResonance).toBe(3);
    expect(CRYSTAL_UPGRADES_BY_ID.crystal_fracture.unlockResonance).toBe(5);
    expect(CRYSTAL_UPGRADES_BY_ID.crystal_singularity.unlockResonance).toBe(8);
    // The starter tier has no gate.
    expect(CRYSTAL_UPGRADES_BY_ID.crystal_lattice.unlockResonance).toBeUndefined();
  });
});
