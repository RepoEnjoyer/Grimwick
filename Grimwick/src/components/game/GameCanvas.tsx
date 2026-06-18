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

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [upgradeChoices, setUpgradeChoices] = useState<Upgrade[]>([]);
  const [relicChoices, setRelicChoices] = useState<Relic[]>([]);
  const [relicMode, setRelicMode] = useState(false);
  const [deathResult, setDeathResult] = useState<{
    soulsCollected: number;
    roomsCleared: number;
    bossesDefeated: number;
    reachedVictory: boolean;
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
        onDeath: (r) => {
          setDeathResult(r);
          // record run for permanent progression
          const updated: PermanentProgress = {
            ...prog,
            soulShards: prog.soulShards + r.soulsCollected,
            totalSouls: prog.totalSouls + r.soulsCollected,
            runsCompleted: prog.runsCompleted + 1,
            bossesDefeated: prog.bossesDefeated + r.bossesDefeated,
            highestRoom: Math.max(prog.highestRoom, r.roomsCleared),
          };
          // persist
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
    engine.permanentBonuses = {
      healthBonus: prog.upgrades.startHealth,
      wandPowerBonus: prog.upgrades.wandPower,
      soulGainBonus: prog.upgrades.soulGain,
      minionPowerBonus: prog.upgrades.minionPower,
      moveSpeedBonus: prog.upgrades.moveSpeed,
      relicLuck: prog.upgrades.relicLuck,
      wandType: selectedWandType,
    };
    engine.startRun();
    setShowCrypt(false);
  }, [selectedWandType]);

  const handleChooseUpgrade = (idx: number) => {
    engineRef.current?.chooseUpgrade(idx);
  };
  const handleChooseRelic = (idx: number) => {
    engineRef.current?.chooseRelic(idx);
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
            isRelic={false}
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
            isRelic={true}
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
