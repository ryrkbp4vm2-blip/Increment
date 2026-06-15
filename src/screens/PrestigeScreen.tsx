import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { BigButton } from '../components/BigButton';
import { ChallengesSection } from '../components/ChallengesSection';
import { Amount } from '../components/art/Amount';
import { Icon, IconName } from '../components/art/Icon';
import {
  ASCEND_BASE,
  CORE_UPGRADES,
  SINGULARITY_BONUS,
  SINGULARITY_PERKS,
  coreTotalEffect,
  coreUpgradeCost,
  nextAscensionAt,
  pendingSingularityCores,
  singularityMult,
} from '../game/ascension';
import {
  DM_UPGRADES,
  DarkMatterUpgradeDef,
  darkMatterUpgradeCost,
  dmTotalEffect,
} from '../game/darkmatter';
import { effectivePowers } from '../game/powers';
import { darkMatterGain, nextDarkMatterAt, pendingDarkMatter } from '../game/prestige';
import { PRESTIGE_BASE } from '../game/balance';
import {
  SECTOR_PRODUCTION_MULT,
  ZONE_WARP_ASCENSIONS,
  canWarp,
  sectorMult,
  sectorName,
  sectorTrait,
} from '../game/zones';
import {
  CRYSTAL_UPGRADES,
  TRANSCEND_ASCENSIONS,
  canTranscend,
  crystalGain,
  crystalMult,
  crystalTotalEffect,
  crystalUpgradeCost,
  nextTranscendIn,
  pendingCrystals,
  resonancePowerMult,
  transcendUnlocked,
} from '../game/transcend';
import {
  RESONANCE_BASE,
  RESONANCE_BONUS,
  attunementGain,
  canResonate,
  nextResonanceAt,
  resonanceGain,
  resonanceMult,
} from '../game/crystalGame';
import {
  CONVERGENCE_RESONANCE,
  EON_UPGRADES,
  canConverge,
  eonMult,
  eonTotalEffect,
  eonUpgradeCost,
  pendingEons,
} from '../game/convergence';
import { playSound } from '../audio/sound';
import { useGameStore } from '../store/gameStore';
import { colors, spacing } from '../theme';
import { formatNumber } from '../utils/format';

export function PrestigeScreen() {
  const lifetimeThisRun = useGameStore((s) => s.lifetimeThisRun);
  const darkMatter = useGameStore((s) => s.darkMatter);
  const totalDarkMatter = useGameStore((s) => s.totalDarkMatter);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const activeChallenge = useGameStore((s) => s.activeChallenge);
  const dmUpgrades = useGameStore((s) => s.dmUpgrades);
  const artifacts = useGameStore((s) => s.artifacts);
  const doPrestige = useGameStore((s) => s.doPrestige);
  const buyDarkMatterUpgrade = useGameStore((s) => s.buyDarkMatterUpgrade);
  const singularityCores = useGameStore((s) => s.singularityCores);
  const totalSingularityCores = useGameStore((s) => s.totalSingularityCores);
  const singularityPerks = useGameStore((s) => s.singularityPerks);
  const ascensionCount = useGameStore((s) => s.ascensionCount);
  const dmSinceAscension = useGameStore((s) => s.dmSinceAscension);
  const doAscend = useGameStore((s) => s.doAscend);
  const buySingularityPerk = useGameStore((s) => s.buySingularityPerk);
  const coreUpgrades = useGameStore((s) => s.coreUpgrades);
  const buyCoreUpgrade = useGameStore((s) => s.buyCoreUpgrade);
  const sector = useGameStore((s) => s.sector);
  const ascensionsSinceWarp = useGameStore((s) => s.ascensionsSinceWarp);
  const doWarp = useGameStore((s) => s.doWarp);
  const crystals = useGameStore((s) => s.crystals);
  const totalCrystals = useGameStore((s) => s.totalCrystals);
  const transcendCount = useGameStore((s) => s.transcendCount);
  const ascensionsSinceTranscend = useGameStore((s) => s.ascensionsSinceTranscend);
  const crystalUpgrades = useGameStore((s) => s.crystalUpgrades);
  const doTranscend = useGameStore((s) => s.doTranscend);
  const buyCrystalUpgrade = useGameStore((s) => s.buyCrystalUpgrade);
  const resonance = useGameStore((s) => s.resonance);
  const attunement = useGameStore((s) => s.attunement);
  const lifetimeCrystals = useGameStore((s) => s.lifetimeCrystals);
  const doResonate = useGameStore((s) => s.doResonate);
  const autoResonate = useGameStore((s) => s.autoResonate);
  const toggleAutoResonate = useGameStore((s) => s.toggleAutoResonate);
  const eons = useGameStore((s) => s.eons);
  const totalEons = useGameStore((s) => s.totalEons);
  const convergenceCount = useGameStore((s) => s.convergenceCount);
  const eonUpgrades = useGameStore((s) => s.eonUpgrades);
  const doConverge = useGameStore((s) => s.doConverge);
  const buyEonUpgrade = useGameStore((s) => s.buyEonUpgrade);
  const [confirming, setConfirming] = useState(false);
  const [confirmingAscend, setConfirmingAscend] = useState(false);
  const [confirmingWarp, setConfirmingWarp] = useState(false);
  const [confirmingTranscend, setConfirmingTranscend] = useState(false);

  const isCrystalMode = transcendCount > 0;

  const pendingCores = pendingSingularityCores(dmSinceAscension);
  const ascendNextAt = nextAscensionAt(dmSinceAscension);
  // Reveal the ascension layer once the player is at least halfway to it.
  const ascendRevealed = singularityCores > 0 || dmSinceAscension >= ASCEND_BASE * 0.5;

  const powers = effectivePowers(artifacts, dmUpgrades);
  const pending = pendingDarkMatter(lifetimeThisRun);
  const gain = darkMatterGain(lifetimeThisRun, powers.dmGainMult);
  const nextAt = nextDarkMatterAt(lifetimeThisRun);
  const progress = Math.min(lifetimeThisRun / PRESTIGE_BASE, 1);

  // In crystal mode, show a focused crystal-game prestige screen.
  if (isCrystalMode) {
    return (
      <CrystalPrestigeScreen
        crystals={crystals}
        totalCrystals={totalCrystals}
        attunement={attunement}
        resonance={resonance}
        lifetimeCrystals={lifetimeCrystals}
        crystalUpgrades={crystalUpgrades}
        buyCrystalUpgrade={buyCrystalUpgrade}
        doResonate={doResonate}
        autoResonate={autoResonate}
        toggleAutoResonate={toggleAutoResonate}
        confirmingTranscend={confirmingTranscend}
        setConfirmingTranscend={setConfirmingTranscend}
        eons={eons}
        totalEons={totalEons}
        convergenceCount={convergenceCount}
        eonUpgrades={eonUpgrades}
        doConverge={doConverge}
        buyEonUpgrade={buyEonUpgrade}
      />
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Icon name="prestige" size={22} />
        <Text style={styles.title}>Supernova Collapse</Text>
      </View>
      <Text style={styles.body}>
        Collapse your empire into Dark Matter — spend it below on permanent upgrades that
        persist through every future collapse. You keep artifacts and the shop; everything else
        in the run resets.
      </Text>

      <View style={styles.statsCard}>
        <StatRow label="Dark Matter to spend" currency="dm" value={darkMatter} />
        <StatRow label="Earned all-time" currency="dm" value={totalDarkMatter} />
        <StatRow label="Collapses so far" value={formatNumber(prestigeCount)} />
        <StatRow label="Mined this run" currency="mineral" value={lifetimeThisRun} />
        <StatRow
          label={pending > 0 ? 'Next Dark Matter at' : 'First Dark Matter at'}
          currency="mineral"
          value={pending > 0 ? nextAt : PRESTIGE_BASE}
        />
      </View>

      {pending < 1 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}

      {confirming ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>
            Collapse for +{formatNumber(gain)} Dark Matter? This resets your minerals,
            generators and upgrades.
          </Text>
          <View style={styles.confirmButtons}>
            <BigButton
              label="Collapse!"
              color={colors.darkMatter}
              onPress={() => {
                doPrestige();
                playSound('prestige');
                setConfirming(false);
              }}
              style={styles.confirmButton}
            />
            <BigButton
              label="Not yet"
              color={colors.panelLight}
              onPress={() => setConfirming(false)}
              style={styles.confirmButton}
            />
          </View>
        </View>
      ) : (
        <BigButton
          label={
            pending >= 1
              ? `Collapse for +${formatNumber(gain)} Dark Matter`
              : 'Not enough minerals mined yet'
          }
          color={colors.darkMatter}
          disabled={pending < 1}
          onPress={() => setConfirming(true)}
        />
      )}

      {ascendRevealed && (
        <View style={styles.ascendCard}>
          <View style={styles.titleRow}>
            <Icon name="prestige" size={18} color={colors.gold} accent={colors.gold} />
            <Text style={styles.ascendTitle}>Ascension</Text>
          </View>
          <Text style={styles.ascendBody}>
            Ascend to sacrifice your Dark Matter and its shop for Singularity Cores — each grants
            +{SINGULARITY_BONUS * 100}% production forever. Artifacts, research and goals remain.
          </Text>
          <StatRow label="Cores to spend" value={`${formatNumber(singularityCores)}`} />
          <StatRow
            label="Current bonus"
            value={`×${singularityMult(totalSingularityCores, singularityPerks).toFixed(2)}`}
          />
          <StatRow label="Ascensions" value={formatNumber(ascensionCount)} />
          <StatRow
            label="Dark Matter banked"
            value={`${formatNumber(dmSinceAscension)} / ${formatNumber(ascendNextAt)}`}
          />
          {confirmingAscend ? (
            <View style={styles.confirmButtons}>
              <BigButton
                label={`Ascend +${formatNumber(pendingCores)}`}
                color={colors.gold}
                onPress={() => {
                  doAscend();
                  playSound('prestige');
                  setConfirmingAscend(false);
                }}
                style={styles.confirmButton}
              />
              <BigButton
                label="Cancel"
                color={colors.panelLight}
                onPress={() => setConfirmingAscend(false)}
                style={styles.confirmButton}
              />
            </View>
          ) : (
            <BigButton
              label={
                pendingCores >= 1
                  ? `Ascend for +${formatNumber(pendingCores)} Cores`
                  : `Need ${formatNumber(ASCEND_BASE)} Dark Matter banked`
              }
              color={colors.gold}
              disabled={pendingCores < 1}
              onPress={() => setConfirmingAscend(true)}
              style={styles.ascendButton}
            />
          )}

          <Text style={styles.perksTitle}>Singularity Upgrades</Text>
          <Text style={styles.perksHint}>Repeatable, bought with Cores. Levels are permanent.</Text>
          {CORE_UPGRADES.map((def) => {
            const level = coreUpgrades[def.id] ?? 0;
            const maxed = level >= def.maxLevel;
            const cost = coreUpgradeCost(def, level);
            const affordable = !maxed && singularityCores >= cost;
            return (
              <View key={def.id} style={styles.dmRow}>
                <View style={styles.dmIconBox}>
                  <Icon name={def.icon as IconName} size={26} color={colors.gold} accent={colors.gold} />
                </View>
                <View style={styles.dmInfo}>
                  <Text style={styles.dmName}>
                    {def.name} <Text style={styles.dmLevel}>Lv {level}/{def.maxLevel}</Text>
                  </Text>
                  <Text style={styles.dmDesc}>{def.perLevel}</Text>
                  {level > 0 && <Text style={styles.dmCurrent}>Now: {coreTotalEffect(def, level)}</Text>}
                </View>
                <Pressable
                  onPress={() => {
                    buyCoreUpgrade(def.id);
                    playSound('buy');
                  }}
                  disabled={!affordable}
                  style={[styles.dmBuy, maxed && styles.dmMaxed, !affordable && !maxed && styles.dmBuyDisabled]}
                >
                  {maxed ? (
                    <Text style={styles.dmMaxedText}>MAX</Text>
                  ) : (
                    <Text style={[styles.dmBuyText, !affordable && styles.dmBuyTextDisabled]}>{cost}◆</Text>
                  )}
                </Pressable>
              </View>
            );
          })}

          <Text style={styles.perksTitle}>Singularity Perks</Text>
          <Text style={styles.perksHint}>One-time unlocks bought with Cores. Permanent — survive everything.</Text>
          {SINGULARITY_PERKS.map((perk) => {
            const owned = !!singularityPerks[perk.id];
            const affordable = !owned && singularityCores >= perk.cost;
            return (
              <View key={perk.id} style={[styles.perkRow, owned && styles.perkOwned]}>
                <View style={styles.perkIcon}>
                  <Icon name={perk.icon as IconName} size={24} color={colors.gold} accent={colors.gold} />
                </View>
                <View style={styles.perkInfo}>
                  <Text style={styles.perkName}>{perk.name}</Text>
                  <Text style={styles.perkDesc}>{perk.description}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    buySingularityPerk(perk.id);
                    playSound('buy');
                  }}
                  disabled={!affordable}
                  style={[styles.perkBuy, owned && styles.perkBuyOwned, !affordable && !owned && styles.perkBuyDisabled]}
                >
                  {owned ? (
                    <Icon name="check" size={18} accent={colors.gold} />
                  ) : (
                    <Text style={[styles.perkCost, !affordable && styles.perkCostDisabled]}>
                      {perk.cost}◆
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {(sector > 0 || ascensionsSinceWarp > 0) && (
        <View style={styles.warpCard}>
          <View style={styles.titleRow}>
            <Icon name="fleet" size={18} color={colors.accent} accent={colors.accent} />
            <Text style={styles.warpTitle}>Sector Warp</Text>
          </View>
          <Text style={styles.ascendBody}>
            Ascend {ZONE_WARP_ASCENSIONS}× in a sector, then warp onward for ×{SECTOR_PRODUCTION_MULT}{' '}
            permanent production. The run, Dark Matter and spendable cores reset; collections,
            research, perks and your singularity bonus carry over.
          </Text>
          <StatRow label="Current sector" value={sectorName(sector)} />
          <StatRow label="Sector bonus" value={`×${formatNumber(sectorMult(sector))}`} />
          <StatRow label="Sector trait" value={sectorTrait(sector).trait} />
          <StatRow
            label="Ascensions toward warp"
            value={`${ascensionsSinceWarp} / ${ZONE_WARP_ASCENSIONS}`}
          />
          <View style={styles.nextSectorBox}>
            <Text style={styles.nextSectorLabel}>
              Next: {sectorName(sector + 1)} — {sectorTrait(sector + 1).trait}
            </Text>
            <Text style={styles.nextSectorBlurb}>{sectorTrait(sector + 1).blurb}</Text>
          </View>
          {!canWarp(ascensionsSinceWarp) ? (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(ascensionsSinceWarp / ZONE_WARP_ASCENSIONS, 1) * 100}%`, backgroundColor: colors.accent },
                ]}
              />
            </View>
          ) : confirmingWarp ? (
            <View style={styles.confirmButtons}>
              <BigButton
                label={`Warp to ${sectorName(sector + 1)}`}
                color={colors.accent}
                onPress={() => {
                  doWarp();
                  playSound('prestige');
                  setConfirmingWarp(false);
                }}
                style={styles.confirmButton}
              />
              <BigButton
                label="Cancel"
                color={colors.panelLight}
                onPress={() => setConfirmingWarp(false)}
                style={styles.confirmButton}
              />
            </View>
          ) : (
            <BigButton
              label={`Warp for ×${SECTOR_PRODUCTION_MULT} production`}
              color={colors.accent}
              onPress={() => setConfirmingWarp(true)}
              style={styles.ascendButton}
            />
          )}
        </View>
      )}

      {transcendUnlocked(ascensionCount) && (
        <View style={styles.transcendCard}>
          <View style={styles.titleRow}>
            <Icon name="gem_outline" size={20} color={colors.darkMatter} accent={colors.darkMatter} />
            <Text style={styles.transcendTitle}>Transcendence</Text>
          </View>
          <Text style={styles.ascendBody}>
            Shatter the entire empire — minerals, Dark Matter, Cores, sectors, research and
            artifacts all reset — and crystallise your depth into Crystals. The Crystal Matrix you
            build with them is permanent and powers every future climb.
          </Text>
          <StatRow label="Crystals" value={`${formatNumber(crystals)} ✦`} />
          <StatRow label="Crystal bonus" value={`×${formatNumber(crystalMult(totalCrystals))}`} />
          <StatRow label="Transcends" value={formatNumber(transcendCount)} />
          <StatRow
            label="Ascensions toward Transcend"
            value={`${Math.min(ascensionsSinceTranscend, TRANSCEND_ASCENSIONS)} / ${TRANSCEND_ASCENSIONS}`}
          />
          {!canTranscend(ascensionsSinceTranscend) ? (
            <>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(ascensionsSinceTranscend / TRANSCEND_ASCENSIONS, 1) * 100}%`,
                      backgroundColor: colors.darkMatter,
                    },
                  ]}
                />
              </View>
              <Text style={styles.transcendHint}>
                Ascend {nextTranscendIn(ascensionsSinceTranscend)} more time
                {nextTranscendIn(ascensionsSinceTranscend) === 1 ? '' : 's'} to Transcend.
              </Text>
            </>
          ) : confirmingTranscend ? (
            <View style={styles.confirmButtons}>
              <BigButton
                label={`Transcend for ${crystalGain(ascensionsSinceTranscend, crystalUpgrades)} ✦`}
                color={colors.darkMatter}
                onPress={() => {
                  doTranscend();
                  playSound('prestige');
                  setConfirmingTranscend(false);
                }}
                style={styles.confirmButton}
              />
              <BigButton
                label="Cancel"
                color={colors.panelLight}
                onPress={() => setConfirmingTranscend(false)}
                style={styles.confirmButton}
              />
            </View>
          ) : (
            <BigButton
              label={`Transcend for ${crystalGain(ascensionsSinceTranscend, crystalUpgrades)} Crystals`}
              color={colors.darkMatter}
              onPress={() => setConfirmingTranscend(true)}
              style={styles.ascendButton}
            />
          )}

          <Text style={styles.perksTitle}>Crystal Matrix</Text>
          <Text style={styles.perksHint}>
            Leveled upgrades bought with Crystals. Permanent — survive every Transcend.
          </Text>
          {CRYSTAL_UPGRADES.map((def) => {
            const level = crystalUpgrades[def.id] ?? 0;
            const maxed = level >= def.maxLevel;
            const cost = crystalUpgradeCost(def, level);
            const affordable = !maxed && crystals >= cost;
            return (
              <View key={def.id} style={styles.dmRow}>
                <View style={styles.dmIconBox}>
                  <Icon name={def.icon as IconName} size={26} color={colors.darkMatter} accent={colors.darkMatter} />
                </View>
                <View style={styles.dmInfo}>
                  <Text style={styles.dmName}>
                    {def.name} <Text style={styles.dmLevel}>Lv {level}/{def.maxLevel}</Text>
                  </Text>
                  <Text style={styles.dmDesc}>{def.perLevel}</Text>
                  {level > 0 && <Text style={styles.dmCurrent}>Now: {crystalTotalEffect(def, level)}</Text>}
                </View>
                <Pressable
                  onPress={() => {
                    buyCrystalUpgrade(def.id);
                    playSound('buy');
                  }}
                  disabled={!affordable}
                  style={[styles.dmBuy, maxed && styles.dmMaxed, !affordable && !maxed && styles.dmBuyDisabled]}
                >
                  {maxed ? (
                    <Text style={styles.dmMaxedText}>MAX</Text>
                  ) : (
                    <Text style={[styles.dmBuyText, !affordable && styles.dmBuyTextDisabled]}>{cost} ✦</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.shopTitleRow}>
        <Icon name="darkmatter" size={18} />
        <Text style={styles.shopTitle}>Dark Matter Shop</Text>
      </View>
      <Text style={styles.shopHint}>Permanent upgrades. Effects stack and survive collapses.</Text>
      {DM_UPGRADES.map((def) => (
        <DarkMatterRow
          key={def.id}
          def={def}
          level={dmUpgrades[def.id] ?? 0}
          balance={darkMatter}
          onBuy={() => buyDarkMatterUpgrade(def.id)}
        />
      ))}

      {(prestigeCount > 0 || activeChallenge !== null) && <ChallengesSection />}
    </ScrollView>
  );
}

function CrystalPrestigeScreen({
  crystals,
  totalCrystals,
  attunement,
  resonance,
  lifetimeCrystals,
  crystalUpgrades,
  buyCrystalUpgrade,
  doResonate,
  autoResonate,
  toggleAutoResonate,
  confirmingTranscend,
  setConfirmingTranscend,
  eons,
  totalEons,
  convergenceCount,
  eonUpgrades,
  doConverge,
  buyEonUpgrade,
}: {
  crystals: number;
  totalCrystals: number;
  attunement: number;
  resonance: number;
  lifetimeCrystals: number;
  crystalUpgrades: Record<string, number>;
  buyCrystalUpgrade: (id: string) => void;
  doResonate: () => void;
  autoResonate: boolean;
  toggleAutoResonate: () => void;
  confirmingTranscend: boolean;
  setConfirmingTranscend: (v: boolean) => void;
  eons: number;
  totalEons: number;
  convergenceCount: number;
  eonUpgrades: Record<string, number>;
  doConverge: () => void;
  buyEonUpgrade: (id: string) => void;
}) {
  const [confirmingConverge, setConfirmingConverge] = useState(false);
  const pendingEon = pendingEons(resonance, eonUpgrades);
  const convergeReady = canConverge(resonance);
  // Reveal the Convergence layer as the player approaches the Resonance gate.
  const convergeRevealed = totalEons > 0 || convergenceCount > 0 || resonance >= CONVERGENCE_RESONANCE * 0.4;
  const pending = resonanceGain(lifetimeCrystals, crystalUpgrades, resonance);
  const pendingAttune = attunementGain(lifetimeCrystals);
  const ready = canResonate(lifetimeCrystals, resonance);
  const nextAt = nextResonanceAt(resonance);
  const progress = Math.min(lifetimeCrystals / nextAt, 1);
  // Per-Resonance-level production bonus, raised by the Resonance Amplifier.
  const perLevelBonus = RESONANCE_BONUS * resonancePowerMult(crystalUpgrades);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Icon name="gem_outline" size={22} color={colors.darkMatter} accent={colors.darkMatter} />
        <Text style={[styles.title, { color: colors.darkMatter }]}>Resonance Cascade</Text>
      </View>
      <Text style={styles.body}>
        Collapse your crystal harmonics into permanent Resonance — each level multiplies all
        crystal production forever. Your crystal balance, generators and formation depth reset.
        Every Cascade also pays out Attunement (◈) — the currency that buys the permanent
        Crystal Matrix below.
      </Text>

      <View style={styles.statsCard}>
        <StatRow label="Attunement to spend" value={`${formatNumber(attunement)} ◈`} />
        <StatRow label="Resonance" value={`Lv ${formatNumber(resonance)}`} />
        <StatRow label="Production bonus" value={`×${formatNumber(resonanceMult(resonance, perLevelBonus))}`} />
        <StatRow label="Crystals this run" value={`${formatNumber(crystals)} ✦`} />
        <StatRow label="Total Crystals earned" value={`${formatNumber(totalCrystals)} ✦`} />
        <StatRow
          label={ready ? 'Next Resonance at' : 'First Resonance at'}
          value={`${formatNumber(nextAt)} ✦ this run`}
        />
      </View>

      {ready ? (
        confirmingTranscend ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>
              Cascade for +{formatNumber(pending)} Resonance (×{formatNumber(
                resonanceMult(resonance + pending, perLevelBonus),
              )}{' '}
              production) and +{formatNumber(pendingAttune)} ◈ Attunement? Your crystals and
              generators reset.
            </Text>
            <View style={styles.confirmButtons}>
              <BigButton
                label={`Cascade +${formatNumber(pending)}`}
                color={colors.darkMatter}
                onPress={() => {
                  doResonate();
                  playSound('prestige');
                  setConfirmingTranscend(false);
                }}
                style={styles.confirmButton}
              />
              <BigButton
                label="Cancel"
                color={colors.panelLight}
                onPress={() => setConfirmingTranscend(false)}
                style={styles.confirmButton}
              />
            </View>
          </View>
        ) : (
          <BigButton
            label={`Cascade: +${formatNumber(pending)} Resonance, +${formatNumber(pendingAttune)} ◈`}
            color={colors.darkMatter}
            onPress={() => setConfirmingTranscend(true)}
          />
        )
      ) : (
        <>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: colors.darkMatter },
              ]}
            />
          </View>
          <Text style={styles.transcendHint}>
            Mine {formatNumber(RESONANCE_BASE)} crystals this run to earn your first Resonance.
          </Text>
        </>
      )}

      <View style={styles.autoRow}>
        <View style={styles.autoLabel}>
          <Icon name="gem_outline" size={18} color={colors.darkMatter} accent={colors.darkMatter} />
          <Text style={styles.autoText}>Auto-Cascade</Text>
        </View>
        <Switch
          value={autoResonate}
          onValueChange={toggleAutoResonate}
          trackColor={{ true: colors.darkMatter, false: colors.disabled }}
          thumbColor={colors.text}
        />
      </View>
      <Text style={styles.autoHint}>Automatically Cascade when the gate is met (spends crystals immediately).</Text>

      <Text style={styles.perksTitle}>Crystal Matrix</Text>
      <Text style={styles.perksHint}>Permanent upgrades bought with Attunement (◈). Survive every Cascade.</Text>
      {CRYSTAL_UPGRADES.map((def) => {
        const locked = def.unlockResonance !== undefined && resonance < def.unlockResonance;
        const level = crystalUpgrades[def.id] ?? 0;
        const maxed = level >= def.maxLevel;
        const cost = crystalUpgradeCost(def, level);
        const affordable = !locked && !maxed && attunement >= cost;
        return (
          <View key={def.id} style={[styles.dmRow, locked && styles.dmRowLocked]}>
            <View style={styles.dmIconBox}>
              <Icon
                name={(locked ? 'lock' : def.icon) as IconName}
                size={26}
                color={colors.darkMatter}
                accent={colors.darkMatter}
              />
            </View>
            <View style={styles.dmInfo}>
              <Text style={styles.dmName}>
                {def.name}{' '}
                {!locked && <Text style={styles.dmLevel}>Lv {level}/{def.maxLevel}</Text>}
              </Text>
              <Text style={styles.dmDesc}>{def.perLevel}</Text>
              {locked ? (
                <Text style={styles.dmLocked}>Unlocks at Resonance {def.unlockResonance}</Text>
              ) : (
                level > 0 && <Text style={styles.dmCurrent}>Now: {crystalTotalEffect(def, level)}</Text>
              )}
            </View>
            {!locked && (
              <Pressable
                onPress={() => {
                  buyCrystalUpgrade(def.id);
                  playSound('buy');
                }}
                disabled={!affordable}
                style={[styles.dmBuy, maxed && styles.dmMaxed, !affordable && !maxed && styles.dmBuyDisabled]}
              >
                {maxed ? (
                  <Text style={styles.dmMaxedText}>MAX</Text>
                ) : (
                  <Text style={[styles.dmBuyText, !affordable && styles.dmBuyTextDisabled]}>{cost} ◈</Text>
                )}
              </Pressable>
            )}
          </View>
        );
      })}

      {convergeRevealed && (
        <View style={styles.convergeCard}>
          <View style={styles.titleRow}>
            <Text style={styles.eonGlyph}>∞</Text>
            <Text style={styles.convergeTitle}>Convergence</Text>
          </View>
          <Text style={styles.ascendBody}>
            Collapse the entire crystal cosmos — your crystals, generators, Forge upgrades,
            Resonance, Attunement and the whole Crystal Matrix all reset — into Eons (∞). Each
            Eon permanently boosts all crystal production, so every re-climb is faster, and the
            Convergence tree below survives forever.
          </Text>
          <StatRow label="Eons to spend" value={`${formatNumber(eons)} ∞`} />
          <StatRow label="Crystal bonus" value={`×${formatNumber(eonMult(totalEons))}`} />
          <StatRow label="Convergences" value={formatNumber(convergenceCount)} />
          <StatRow
            label="Resonance toward Convergence"
            value={`${formatNumber(Math.min(resonance, CONVERGENCE_RESONANCE))} / ${CONVERGENCE_RESONANCE}`}
          />

          {!convergeReady ? (
            <>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(resonance / CONVERGENCE_RESONANCE, 1) * 100}%`,
                      backgroundColor: colors.gold,
                    },
                  ]}
                />
              </View>
              <Text style={styles.transcendHint}>
                Reach Resonance {CONVERGENCE_RESONANCE} to Converge for your first Eon.
              </Text>
            </>
          ) : confirmingConverge ? (
            <View style={styles.confirmButtons}>
              <BigButton
                label={`Converge +${formatNumber(pendingEon)} ∞`}
                color={colors.gold}
                onPress={() => {
                  doConverge();
                  playSound('prestige');
                  setConfirmingConverge(false);
                }}
                style={styles.confirmButton}
              />
              <BigButton
                label="Cancel"
                color={colors.panelLight}
                onPress={() => setConfirmingConverge(false)}
                style={styles.confirmButton}
              />
            </View>
          ) : (
            <BigButton
              label={`Converge for +${formatNumber(pendingEon)} Eons`}
              color={colors.gold}
              onPress={() => setConfirmingConverge(true)}
              style={styles.ascendButton}
            />
          )}

          <Text style={[styles.perksTitle, styles.eonPerksTitle]}>Convergence Tree</Text>
          <Text style={styles.perksHint}>Leveled upgrades bought with Eons (∞). Survive every Convergence.</Text>
          {EON_UPGRADES.map((def) => {
            const level = eonUpgrades[def.id] ?? 0;
            const maxed = level >= def.maxLevel;
            const cost = eonUpgradeCost(def, level);
            const affordable = !maxed && eons >= cost;
            return (
              <View key={def.id} style={styles.dmRow}>
                <View style={styles.dmIconBox}>
                  <Icon name={def.icon as IconName} size={26} color={colors.gold} accent={colors.gold} />
                </View>
                <View style={styles.dmInfo}>
                  <Text style={styles.dmName}>
                    {def.name} <Text style={styles.eonLevel}>Lv {level}/{def.maxLevel}</Text>
                  </Text>
                  <Text style={styles.dmDesc}>{def.perLevel}</Text>
                  {level > 0 && <Text style={styles.dmCurrent}>Now: {eonTotalEffect(def, level)}</Text>}
                </View>
                <Pressable
                  onPress={() => {
                    buyEonUpgrade(def.id);
                    playSound('buy');
                  }}
                  disabled={!affordable}
                  style={[styles.eonBuy, maxed && styles.dmMaxed, !affordable && !maxed && styles.dmBuyDisabled]}
                >
                  {maxed ? (
                    <Text style={styles.dmMaxedText}>MAX</Text>
                  ) : (
                    <Text style={[styles.eonBuyText, !affordable && styles.dmBuyTextDisabled]}>{cost} ∞</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function DarkMatterRow({
  def,
  level,
  balance,
  onBuy,
}: {
  def: DarkMatterUpgradeDef;
  level: number;
  balance: number;
  onBuy: () => void;
}) {
  const maxed = level >= def.maxLevel;
  const cost = darkMatterUpgradeCost(def, level);
  const affordable = !maxed && balance >= cost;

  const onBuyWithSound = () => {
    onBuy();
    playSound('buy');
  };
  return (
    <View style={styles.dmRow}>
      <View style={styles.dmIconBox}>
        <Icon name={def.id as IconName} size={26} color={colors.darkMatter} accent={colors.gold} />
      </View>
      <View style={styles.dmInfo}>
        <Text style={styles.dmName}>
          {def.name} <Text style={styles.dmLevel}>Lv {level}/{def.maxLevel}</Text>
        </Text>
        <Text style={styles.dmDesc}>{def.perLevel}</Text>
        {level > 0 && <Text style={styles.dmCurrent}>Now: {dmTotalEffect(def, level)}</Text>}
      </View>
      <Pressable
        onPress={onBuyWithSound}
        disabled={!affordable}
        style={[styles.dmBuy, maxed && styles.dmMaxed, !affordable && !maxed && styles.dmBuyDisabled]}
      >
        {maxed ? (
          <Text style={styles.dmMaxedText}>MAX</Text>
        ) : (
          <Amount
            kind="dm"
            value={cost}
            size={13}
            textStyle={[styles.dmBuyText, !affordable && styles.dmBuyTextDisabled]}
          />
        )}
      </Pressable>
    </View>
  );
}

function StatRow({
  label,
  value,
  currency,
}: {
  label: string;
  value: number | string;
  currency?: 'mineral' | 'dm';
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      {currency && typeof value === 'number' ? (
        <Amount kind={currency} value={value} size={14} textStyle={styles.statValue} />
      ) : (
        <Text style={styles.statValue}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.darkMatter,
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statsCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  statValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.darkMatter,
  },
  confirmBox: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.darkMatter,
    padding: spacing.lg,
  },
  confirmText: {
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmButton: {
    flex: 1,
  },
  ascendCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  ascendTitle: { color: colors.gold, fontSize: 18, fontWeight: '800' },
  warpCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  warpTitle: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  transcendCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.darkMatter,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  transcendTitle: { color: colors.darkMatter, fontSize: 18, fontWeight: '800' },
  transcendHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  convergeCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  convergeTitle: { color: colors.gold, fontSize: 18, fontWeight: '800' },
  eonGlyph: { color: colors.gold, fontSize: 22, fontWeight: '800' },
  eonPerksTitle: { color: colors.gold },
  eonLevel: { color: colors.gold, fontWeight: '700' },
  eonBuy: {
    backgroundColor: '#FACC1522',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 76,
  },
  eonBuyText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
  },
  ascendBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  ascendButton: { marginTop: spacing.md },
  nextSectorBox: {
    backgroundColor: colors.panelLight,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  nextSectorLabel: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  nextSectorBlurb: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  perksTitle: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '800',
    marginTop: spacing.lg,
  },
  perksHint: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.sm },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: 2,
  },
  autoLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  autoText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  autoHint: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.md },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  perkOwned: { borderColor: colors.gold },
  perkIcon: { width: 32, alignItems: 'center', marginRight: spacing.sm },
  perkInfo: { flex: 1 },
  perkName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  perkDesc: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  perkBuy: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#FACC1522',
  },
  perkBuyOwned: { backgroundColor: 'transparent' },
  perkBuyDisabled: { borderColor: colors.disabled, backgroundColor: 'transparent' },
  perkCost: { color: colors.gold, fontSize: 13, fontWeight: '800' },
  perkCostDisabled: { color: colors.disabled },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  shopTitle: {
    color: colors.darkMatter,
    fontSize: 18,
    fontWeight: '800',
  },
  shopHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  dmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dmRowLocked: {
    opacity: 0.55,
    borderStyle: 'dashed',
  },
  dmLocked: {
    color: colors.darkMatter,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  dmIconBox: {
    width: 34,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  dmInfo: {
    flex: 1,
  },
  dmName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  dmLevel: {
    color: colors.darkMatter,
    fontWeight: '700',
  },
  dmDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  dmCurrent: {
    color: colors.accent,
    fontSize: 11,
    marginTop: 2,
  },
  dmBuy: {
    backgroundColor: '#C084FC22',
    borderWidth: 1,
    borderColor: colors.darkMatter,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 76,
  },
  dmBuyDisabled: {
    borderColor: colors.disabled,
    backgroundColor: 'transparent',
  },
  dmMaxed: {
    borderColor: colors.gold,
    backgroundColor: 'transparent',
  },
  dmBuyText: {
    color: colors.darkMatter,
    fontSize: 13,
    fontWeight: '700',
  },
  dmBuyTextDisabled: {
    color: colors.disabled,
  },
  dmMaxedText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '800',
  },
});
