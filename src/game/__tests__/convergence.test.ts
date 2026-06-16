import {
  CONVERGENCE_ATTUNEMENT,
  EON_BONUS,
  EON_UPGRADES_BY_ID,
  EON_UPGRADE_GROWTH,
  canConverge,
  convergeRemaining,
  eonAttuneMult,
  eonCrystalMult,
  eonMult,
  eonResonanceMult,
  eonTotalEffect,
  eonUpgradeCost,
  eonYieldMult,
  pendingEons,
} from '../convergence';

describe('Convergence gating', () => {
  it('cannot converge below the channelled-Attunement gate', () => {
    expect(canConverge(CONVERGENCE_ATTUNEMENT - 1)).toBe(false);
    expect(canConverge(CONVERGENCE_ATTUNEMENT)).toBe(true);
  });

  it('reports the Attunement still needed to Converge', () => {
    expect(convergeRemaining(0)).toBe(CONVERGENCE_ATTUNEMENT);
    expect(convergeRemaining(CONVERGENCE_ATTUNEMENT)).toBe(0);
    expect(convergeRemaining(CONVERGENCE_ATTUNEMENT * 2)).toBe(0);
  });

  it('pays no Eons below the gate and at least one at it', () => {
    expect(pendingEons(CONVERGENCE_ATTUNEMENT - 1)).toBe(0);
    expect(pendingEons(CONVERGENCE_ATTUNEMENT)).toBe(1);
  });

  it('scales Eons with the square root of channelled Attunement over the gate', () => {
    // sqrt(attunement / gate): ×4 -> 2, ×9 -> 3, ×16 -> 4.
    expect(pendingEons(CONVERGENCE_ATTUNEMENT * 4)).toBe(2);
    expect(pendingEons(CONVERGENCE_ATTUNEMENT * 9)).toBe(3);
    expect(pendingEons(CONVERGENCE_ATTUNEMENT * 16)).toBe(4);
  });

  it('Convergent Will multiplies the Eon payout', () => {
    // +20%/level. At ×16 (raw 4), 5 levels -> ×2 -> 8.
    expect(pendingEons(CONVERGENCE_ATTUNEMENT * 16, { eon_will: 5 })).toBe(8);
  });
});

describe('eonMult', () => {
  it('grants a permanent crystal-production bonus per Eon ever earned', () => {
    expect(eonMult(0)).toBe(1);
    expect(eonMult(3)).toBeCloseTo(1 + EON_BONUS * 3);
  });
});

describe('Convergence tree multipliers', () => {
  it('Stellar Flux raises crystal production', () => {
    expect(eonCrystalMult({})).toBe(1);
    expect(eonCrystalMult({ eon_flux: 4 })).toBeCloseTo(1 + 0.5 * 4);
  });

  it('Resonant Echo raises Resonance gained per Cascade', () => {
    expect(eonResonanceMult({ eon_echo: 2 })).toBeCloseTo(1 + 0.25 * 2);
  });

  it('Deep Attunement raises Attunement gained per Cascade', () => {
    expect(eonAttuneMult({ eon_deep: 3 })).toBeCloseTo(1 + 0.5 * 3);
  });

  it('Convergent Will raises Eon yield', () => {
    expect(eonYieldMult({ eon_will: 2 })).toBeCloseTo(1 + 0.2 * 2);
  });

  it('costs grow geometrically and stay strictly increasing', () => {
    const def = EON_UPGRADES_BY_ID.eon_flux;
    expect(eonUpgradeCost(def, 0)).toBe(def.baseCost);
    expect(eonUpgradeCost(def, 3)).toBe(Math.ceil(def.baseCost * EON_UPGRADE_GROWTH ** 3));
    expect(eonUpgradeCost(def, 10)).toBeGreaterThan(eonUpgradeCost(def, 5));
  });

  it('describes each effect', () => {
    expect(eonTotalEffect(EON_UPGRADES_BY_ID.eon_flux, 2)).toBe('+100% crystal production');
    expect(eonTotalEffect(EON_UPGRADES_BY_ID.eon_echo, 2)).toBe('+50% Resonance per Cascade');
  });
});
