'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GAME_W, GAME_H } from '@/lib/game/engine';
import type { GamePhase, HudSnapshot, Relic, Upgrade } from '@/lib/game/types';
import { loadProgress, type PermanentProgress } from '@/lib/game/persistence';
import { HUD } from './HUD';
import { StartScreen } from './StartScreen';
import { UpgradeScreen } from './UpgradeScreen';
import { DeathScreen } from './DeathScreen';
import { CryptHub } from './CryptHub';
import { PauseMenu } from './PauseMenu';

// Build the permanent bonuses object from saved progress + selected wand
function buildBonuses(prog: PermanentProgress, wandType: string) {
  return {
    healthBonus: prog.upgrades.startHealth,
    wandPowerBonus: prog.upgrades.wandPower,
    soulGainBonus: prog.upgrades.soulGain,
    minionPowerBonus: prog.upgrades.minionPower,
    moveSpeedBonus: prog.upgrades.moveSpeed,
    relicLuck: prog.upgrades.relicLuck,
    wandType,
    startingSouls: prog.upgrades.startingSouls,
    iframeBonus: prog.upgrades.iframeDuration,
    pickupRangeBonus: prog.upgrades.pickupRange,
    critChanceBonus: prog.upgrades.critChance,
    fireRateBonus: prog.upgrades.fireRate,
    projectileSpeedBonus: prog.upgrades.projectileSpeed,
    extraLives: prog.upgrades.extraLife,
    eliteSoulBonus: prog.upgrades.eliteSoulBonus,
    startingRelicChance: prog.upgrades.startingRelic,
    soulMeterReduction: prog.upgrades.soulMeterSize,
  };
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [upgradeChoices, setUpgradeChoices] = useState<Upgrade[]>([]);
  const [relicChoices, setRelicChoices] = useState<Relic[]>([]);
  const [chestChoices, setChestChoices] = useState<Upgrade[]>([]);
  const [relicMode, setRelicMode] = useState(false);
  const [deathResult, setDeathResult] = useState<{
    soulsCollected: number;
    roomsCleared: number;
    bossesDefeated: number;
    reachedVictory: boolean;
    timeSurvived: number;
    damageTaken: number;
    damageDealt: number;
    kills: number;
    elitesKilled: number;
    maxCombo: number;
    skillsCount: number;
  } | null>(null);
  const [progress, setProgress] = useState<PermanentProgress>(() =>
    loadProgress()
  );
  const [showCrypt, setShowCrypt] = useState(false);
  const [selectedWandType, setSelectedWandType] = useState<string>(
    () => loadProgress().unlockedWandTypes[0] || 'Bone Wand'
  );

  // Initialize engine on mount
  useEffect(() => {
    if (!canvasRef.current) return;
    const prog = loadProgress();
    const engine = new GameEngine(
      canvasRef.current,
      {
        onPhaseChange: (p) => setPhase(p),
        onHudUpdate: (s) => setHud(s),
        onUpgradeChoices: (c) => {
          setUpgradeChoices(c);
          setRelicMode(false);
        },
        onRelicChoices: (r) => {
          setRelicChoices(r);
          setRelicMode(true);
        },
        onChestChoices: (c) => {
          setChestChoices(c);
        },
        onDeath: (r) => {
          setDeathResult(r);
          // Re-load FRESH progress from localStorage (prog closure may be stale
          // if player bought Crypt Hub upgrades after mount)
          const fresh = loadProgress();
          const updated: PermanentProgress = {
            ...fresh,
            soulShards: fresh.soulShards + r.soulsCollected,
            totalSouls: fresh.totalSouls + r.soulsCollected,
            runsCompleted: fresh.runsCompleted + 1,
            bossesDefeated: fresh.bossesDefeated + r.bossesDefeated,
            highestRoom: Math.max(fresh.highestRoom, r.roomsCleared),
          };
          // persist immediately (auto-save)
          try {
            localStorage.setItem('grimwick_save_v1', JSON.stringify(updated));
          } catch {
            // ignore
          }
          setProgress(updated);
        },
      },
      {
        healthBonus: prog.upgrades.startHealth,
        wandPowerBonus: prog.upgrades.wandPower,
        soulGainBonus: prog.upgrades.soulGain,
        minionPowerBonus: prog.upgrades.minionPower,
        moveSpeedBonus: prog.upgrades.moveSpeed,
        relicLuck: prog.upgrades.relicLuck,
        wandType: selectedWandType,
        startingSouls: prog.upgrades.startingSouls,
        iframeBonus: prog.upgrades.iframeDuration,
        pickupRangeBonus: prog.upgrades.pickupRange,
        critChanceBonus: prog.upgrades.critChance,
        fireRateBonus: prog.upgrades.fireRate,
        projectileSpeedBonus: prog.upgrades.projectileSpeed,
        extraLives: prog.upgrades.extraLife,
        eliteSoulBonus: prog.upgrades.eliteSoulBonus,
        startingRelicChance: prog.upgrades.startingRelic,
        soulMeterReduction: prog.upgrades.soulMeterSize,
      }
    );
    engineRef.current = engine;
    engine.start();

    const kd = (e: KeyboardEvent) => engine.handleKeyDown(e);
    const ku = (e: KeyboardEvent) => engine.handleKeyUp(e);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // Debug hook for testing (accessible via window.__grimwick)
    if (typeof window !== 'undefined') {
      (window as unknown as { __grimwick?: GameEngine }).__grimwick = engine;
    }

    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      engine.stop();
    };
  }, []);

  // Restart engine when wand selection changes (only before run starts)
  const startNewRun = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    // update wand type and bonuses
    const prog = loadProgress();
    engine.permanentBonuses = buildBonuses(prog, selectedWandType);
    engine.startRun();
    setShowCrypt(false);
  }, [selectedWandType]);

  // QOL: Global R hotkey — Restart from death/pause, or Reroll in upgrade/chest screen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k !== 'r') return;
      const engine = engineRef.current;
      if (!engine) return;
      if (engine.phase === 'dead') {
        e.preventDefault();
        startNewRun();
      } else if (engine.phase === 'paused') {
        e.preventDefault();
        engine.resume();
        startNewRun();
      } else if (engine.phase === 'upgrade' || engine.phase === 'chest') {
        e.preventDefault();
        engine.rerollChoices();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [startNewRun]);

  const handleChooseUpgrade = (idx: number) => {
    engineRef.current?.chooseUpgrade(idx);
  };
  const handleChooseRelic = (idx: number) => {
    engineRef.current?.chooseRelic(idx);
  };
  const handleChooseChest = (idx: number) => {
    engineRef.current?.chooseChestUpgrade(idx);
  };
  const handleReroll = () => {
    engineRef.current?.rerollChoices();
  };

  const handleReturnToMenu = () => {
    setPhase('menu');
    setDeathResult(null);
  };

  const handleOpenCrypt = () => {
    setShowCrypt(true);
  };
  const handleCloseCrypt = () => {
    setShowCrypt(false);
    setProgress(loadProgress());
  };

  // Pause menu handlers
  const handlePauseResume = () => {
    engineRef.current?.resume();
  };
  const handlePauseRestart = () => {
    engineRef.current?.resume();
    startNewRun();
  };
  const handlePauseQuit = () => {
    engineRef.current?.returnToMenu();
  };
  const getBuildSummary = useCallback(() => {
    return (
      engineRef.current?.getBuildSummary() ?? {
        hp: 0,
        maxHp: 0,
        souls: 0,
        wandLevel: 1,
        wandType: 'Bone Wand',
        kills: 0,
        minions: 0,
        maxMinions: 0,
        room: 1,
        wave: '1/2',
        skills: [],
        relics: [],
        timeSurvived: 0,
        damageTaken: 0,
        damageDealt: 0,
        elitesKilled: 0,
        maxCombo: 0,
      }
    );
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center select-none">
      <div
        className="relative"
        style={{
          width: 'min(100vw, calc(100vh * 16 / 9))',
          height: 'min(100vh, calc(100vw * 9 / 16))',
        }}
      >
        <canvas
          ref={canvasRef}
          width={GAME_W}
          height={GAME_H}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* HUD overlay */}
        {phase === 'playing' && hud && <HUD snapshot={hud} />}

        {/* Start screen */}
        {phase === 'menu' && !showCrypt && (
          <StartScreen
            progress={progress}
            onStart={startNewRun}
            onOpenCrypt={handleOpenCrypt}
            wandType={selectedWandType}
            onWandTypeChange={setSelectedWandType}
          />
        )}

        {/* Upgrade screen */}
        {phase === 'upgrade' && !relicMode && upgradeChoices.length > 0 && (
          <UpgradeScreen
            choices={upgradeChoices}
            onChoose={handleChooseUpgrade}
            onReroll={handleReroll}
            isRelic={false}
            soulsCollected={hud?.souls ?? 0}
          />
        )}
        {phase === 'upgrade' && relicMode && relicChoices.length > 0 && (
          <UpgradeScreen
            choices={relicChoices.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description,
              path: 'generic' as const,
              rarity: r.rarity,
              apply: () => {},
              icon: r.icon,
            }))}
            onChoose={handleChooseRelic}
            onReroll={handleReroll}
            isRelic={true}
            soulsCollected={hud?.souls ?? 0}
          />
        )}

        {/* Chest reward screen (Blessed by God) */}
        {phase === 'chest' && chestChoices.length > 0 && (
          <UpgradeScreen
            choices={chestChoices}
            onChoose={handleChooseChest}
            onReroll={handleReroll}
            isRelic={false}
            isChest={true}
            soulsCollected={hud?.souls ?? 0}
          />
        )}

        {/* Death screen */}
        {phase === 'dead' && deathResult && (
          <DeathScreen
            result={deathResult}
            onReturn={handleReturnToMenu}
            onRestart={startNewRun}
          />
        )}

        {/* Pause menu */}
        {phase === 'paused' && (
          <PauseMenu
            getSummary={getBuildSummary}
            onResume={handlePauseResume}
            onRestart={handlePauseRestart}
            onReturnToMenu={handlePauseQuit}
          />
        )}

        {/* Crypt hub */}
        {showCrypt && (
          <CryptHub
            progress={progress}
            onClose={handleCloseCrypt}
            onProgressChange={setProgress}
          />
        )}
      </div>
    </div>
  );
}
