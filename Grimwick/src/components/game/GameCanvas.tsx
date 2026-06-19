'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GAME_W, GAME_H } from '@/lib/game/engine';
import type { GamePhase, HudSnapshot, Relic, Upgrade } from '@/lib/game/types';
import { loadProgress, unlockZone, necrominionAutoCollect, type PermanentProgress } from '@/lib/game/persistence';
import { HUD } from './HUD';
import { StartScreen } from './StartScreen';
import { UpgradeScreen } from './UpgradeScreen';
import { DeathScreen } from './DeathScreen';
import { CryptHub } from './CryptHub';
import { NecrominionTab } from './NecrominionTab';
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
    // Stage 2 upgrades (only have effect if Void zone is unlocked)
    stage2Damage: prog.upgrades.stage2Damage,
    stage2Health: prog.upgrades.stage2Health,
    stage2EliteResist: prog.upgrades.stage2EliteResist,
    stage2SoulMult: prog.upgrades.stage2SoulMult,
  };
}

// (Zone unlock state is read inline from progress.unlockedZones in StartScreen)

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
    zoneCleared: 'crypt' | 'void' | 'abyss' | null;
    nextZoneUnlocked: 'crypt' | 'void' | 'abyss' | null;
    isTrueVictory: boolean;
  } | null>(null);
  const [progress, setProgress] = useState<PermanentProgress>(() =>
    loadProgress()
  );
  const [showCrypt, setShowCrypt] = useState(false);
  const [showNecrominion, setShowNecrominion] = useState(false);
  const [selectedWandType, setSelectedWandType] = useState<string>(
    () => loadProgress().unlockedWandTypes[0] || 'Bone Wand'
  );
  // ZONE SYSTEM: selected zone for next run (defaults to Crypt, always unlocked)
  const [selectedZone, setSelectedZone] = useState<'crypt' | 'void' | 'abyss'>('crypt');

  // ===== NECROMINION: auto-collect on mount and periodically (every 60s) =====
  useEffect(() => {
    const autoCollect = () => {
      const prog = loadProgress();
      const newProg = necrominionAutoCollect(prog);
      if (newProg !== prog) {
        setProgress(newProg);
      }
    };
    autoCollect(); // run on mount
    const interval = setInterval(autoCollect, 60000); // check every 60s
    return () => clearInterval(interval);
  }, []);

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
          let updated: PermanentProgress = {
            ...fresh,
            soulShards: fresh.soulShards + r.soulsCollected,
            totalSouls: fresh.totalSouls + r.soulsCollected,
            runsCompleted: fresh.runsCompleted + 1,
            bossesDefeated: fresh.bossesDefeated + r.bossesDefeated,
            highestRoom: Math.max(fresh.highestRoom, r.roomsCleared),
          };
          // ZONE SYSTEM: unlock next zone if zone was cleared
          if (r.nextZoneUnlocked) {
            updated = unlockZone(updated, r.nextZoneUnlocked);
          }
          // persist immediately (auto-save)
          try {
            localStorage.setItem('grimwick_save_v1', JSON.stringify(updated));
          } catch {
            // ignore
          }
          setProgress(updated);
        },
      },
      buildBonuses(prog, selectedWandType),
      selectedZone
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
    // ZONE SYSTEM: set the current zone before starting the run
    engine.currentZone = selectedZone;
    engine.startRun();
    setShowCrypt(false);
  }, [selectedWandType, selectedZone]);

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

  const [zoneUnlockNotification, setZoneUnlockNotification] = useState<string | null>(null);

  const handleReturnToMenu = () => {
    // If a new zone was unlocked, show notification banner
    if (deathResult?.nextZoneUnlocked) {
      const zoneName = deathResult.nextZoneUnlocked.charAt(0).toUpperCase() + deathResult.nextZoneUnlocked.slice(1);
      const fullZoneName =
        deathResult.nextZoneUnlocked === 'void' ? 'THE VOID DEPTHS' :
        deathResult.nextZoneUnlocked === 'abyss' ? 'THE ABYSSAL THRONE' : 'THE CRYPT';
      setZoneUnlockNotification(`⚔ NEW ZONE UNLOCKED: ${fullZoneName}`);
      // Auto-clear notification after 6 seconds
      setTimeout(() => setZoneUnlockNotification(null), 6000);
    }
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

  const handleOpenNecrominion = () => {
    setShowNecrominion(true);
  };
  const handleCloseNecrominion = () => {
    setShowNecrominion(false);
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
        zone: 'crypt' as const,
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
        {phase === 'menu' && !showCrypt && !showNecrominion && (
          <StartScreen
            progress={progress}
            onStart={startNewRun}
            onOpenCrypt={handleOpenCrypt}
            onOpenNecrominion={handleOpenNecrominion}
            wandType={selectedWandType}
            onWandTypeChange={setSelectedWandType}
            selectedZone={selectedZone}
            onZoneChange={setSelectedZone}
            unlockedZones={progress.unlockedZones}
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
        {showCrypt && !showNecrominion && (
          <CryptHub
            progress={progress}
            onClose={handleCloseCrypt}
            onProgressChange={setProgress}
          />
        )}

        {/* Necrominion tab */}
        {showNecrominion && (
          <NecrominionTab
            progress={progress}
            onClose={handleCloseNecrominion}
            onProgressChange={setProgress}
          />
        )}

        {/* ===== Zone unlock notification banner ===== */}
        {zoneUnlockNotification && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div
              className="px-6 py-3 bg-gradient-to-r from-amber-900 via-amber-700 to-amber-900 border-2 border-amber-400 rounded-sm font-mono font-bold tracking-widest text-amber-100 text-sm animate-pulse"
              style={{
                boxShadow: '0 0 30px rgba(255,180,60,0.8)',
                textShadow: '0 0 8px rgba(255,180,60,0.8)',
              }}
            >
              {zoneUnlockNotification}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
