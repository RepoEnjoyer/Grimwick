'use client';

import type { PermanentProgress } from '@/lib/game/persistence';

interface Props {
  progress: PermanentProgress;
  onStart: () => void;
  onOpenCrypt: () => void;
  wandType: string;
  onWandTypeChange: (w: string) => void;
}

export function StartScreen({
  progress,
  onStart,
  onOpenCrypt,
  wandType,
  onWandTypeChange,
}: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/95 via-purple-950/80 to-black/95 font-mono text-white">
      {/* Title */}
      <div className="text-center mb-8">
        <div className="text-purple-400 text-xs tracking-[0.6em] mb-2 uppercase">
          A Necromancer Roguelike
        </div>
        <h1
          className="text-6xl md:text-7xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(180deg,#e8c0ff,#9050ff 60%,#4020a0)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(150,80,255,0.6))',
          }}
        >
          GRIMWICK
        </h1>
        <div className="text-zinc-400 text-sm mt-2 italic">
          The Bones of a Failed Royal Wizard
        </div>
      </div>

      {/* Subtitle / lore */}
      <div className="max-w-md text-center text-zinc-400 text-xs mb-8 px-6">
        Buried for centuries, you wake with only your skull, your bones, and a
        cracked wand. Survive the dungeon, raise the dead, collect souls, and
        become the undead lord you were always meant to be.
      </div>

      {/* Wand selection */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">
          Select Wand
        </div>
        <div className="flex gap-2">
          {progress.unlockedWandTypes.map((w) => (
            <button
              key={w}
              onClick={() => onWandTypeChange(w)}
              className={`px-3 py-1.5 text-xs border rounded-sm transition-all ${
                wandType === w
                  ? 'bg-purple-900/60 border-purple-500 text-purple-100 shadow-[0_0_12px_rgba(150,80,255,0.4)]'
                  : 'bg-zinc-900/60 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 items-center">
        <button
          onClick={onStart}
          className="group relative px-12 py-3 text-lg font-bold tracking-widest bg-gradient-to-b from-purple-700 to-purple-900 border-2 border-purple-400 text-white rounded-sm hover:from-purple-600 hover:to-purple-800 transition-all shadow-[0_0_30px_rgba(150,80,255,0.5)]"
        >
          ENTER THE CRYPT
          <span className="absolute -top-2 -right-2 text-xs bg-amber-500 text-black px-1.5 py-0.5 rounded-sm">
            ▶
          </span>
        </button>
        <button
          onClick={onOpenCrypt}
          className="px-6 py-2 text-xs border border-zinc-700 text-zinc-300 bg-zinc-900/60 rounded-sm hover:border-amber-600 hover:text-amber-300 transition-all"
        >
          ⚱ Crypt Hub · Permanent Upgrades
        </button>
      </div>

      {/* Stats */}
      <div className="absolute bottom-6 left-6 text-[10px] text-zinc-600">
        <div className="text-zinc-500 uppercase tracking-wider mb-1">
          Legacy
        </div>
        <div>Runs: {progress.runsCompleted}</div>
        <div>Bosses Slain: {progress.bossesDefeated}</div>
        <div>Highest Room: {progress.highestRoom}</div>
        <div>Total Souls: {progress.totalSouls}</div>
      </div>

      {/* Soul shards */}
      <div className="absolute bottom-6 right-6 text-right">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Soul Shards
        </div>
        <div className="text-3xl text-purple-300 font-bold drop-shadow-[0_0_8px_rgba(150,80,255,0.6)]">
          ✦ {progress.soulShards}
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute top-6 left-6 text-[10px] text-zinc-600 max-w-[200px]">
        <div className="uppercase tracking-wider mb-1 text-zinc-500">
          Controls
        </div>
        <div>WASD / Arrows — Move</div>
        <div>ESC — Pause</div>
        <div className="mt-2 text-zinc-500 uppercase tracking-wider">
          Auto Systems
        </div>
        <div>✦ Wand auto-fires nearest enemy</div>
        <div>✦ All abilities auto-cast</div>
        <div>✦ Soul meter charges from kills → Soul Nova</div>
        <div>✦ Minions raise automatically from kills</div>
        <div>✦ Chain kills for COMBO bonuses (10/25/50/100)</div>
        <div>✦ Elite enemies (⚡) drop bonus souls &amp; relics</div>
      </div>
    </div>
  );
}
