'use client';

import type { PermanentProgress } from '@/lib/game/persistence';

type Zone = 'crypt' | 'void' | 'abyss';

interface Props {
  progress: PermanentProgress;
  onStart: () => void;
  onOpenCrypt: () => void;
  onOpenNecrominion: () => void;
  wandType: string;
  onWandTypeChange: (w: string) => void;
  selectedZone: Zone;
  onZoneChange: (z: Zone) => void;
  unlockedZones: string[];
}

const ZONE_INFO: Record<Zone, { name: string; subtitle: string; color: string; description: string; bossName: string; roomRange: string }> = {
  crypt: {
    name: 'THE CRYPT',
    subtitle: 'Stage 1',
    color: '#a08060',
    description: 'Bone-filled dungeon. 6 bosses, 16 rooms. Final foe: The Bone Dragon.',
    bossName: 'Bone Dragon',
    roomRange: 'Rooms 1-16',
  },
  void: {
    name: 'THE VOID DEPTHS',
    subtitle: 'Stage 2',
    color: '#a040ff',
    description: 'Cosmic void. All enemies are ELITE. 2 bosses, 8 rooms. Final foe: The Void Leviathan.',
    bossName: 'Void Leviathan',
    roomRange: 'Rooms 1-8',
  },
  abyss: {
    name: 'THE ABYSSAL THRONE',
    subtitle: 'Stage 3',
    color: '#ff4040',
    description: 'Pitch black with limited vision. 1 final boss, 2 rooms. Final foe: The Lich King.',
    bossName: 'Lich King',
    roomRange: 'Rooms 1-2',
  },
};

export function StartScreen({
  progress,
  onStart,
  onOpenCrypt,
  onOpenNecrominion,
  wandType,
  onWandTypeChange,
  selectedZone,
  onZoneChange,
  unlockedZones,
}: Props) {
  const isUnlocked = (z: Zone) => unlockedZones.includes(z.charAt(0).toUpperCase() + z.slice(1));
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/95 via-purple-950/80 to-black/95 font-mono text-white overflow-y-auto py-8">
      {/* Title */}
      <div className="text-center mb-6">
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
      <div className="max-w-md text-center text-zinc-400 text-xs mb-6 px-6">
        Buried for centuries, you wake with only your skull, your bones, and a
        cracked wand. Survive the dungeon, raise the dead, collect souls, and
        become the undead lord you were always meant to be.
      </div>

      {/* ===== ZONE SELECTION ===== */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">
          Select Zone
        </div>
        <div className="flex gap-2 flex-wrap justify-center max-w-2xl">
          {(Object.keys(ZONE_INFO) as Zone[]).map((z) => {
            const unlocked = isUnlocked(z);
            const info = ZONE_INFO[z];
            const selected = selectedZone === z;
            return (
              <button
                key={z}
                disabled={!unlocked}
                onClick={() => unlocked && onZoneChange(z)}
                title={unlocked ? info.description : 'Locked — clear previous zone to unlock'}
                className={`relative px-4 py-2 text-xs border-2 rounded-sm transition-all min-w-[160px] ${
                  selected
                    ? 'bg-zinc-900/80'
                    : unlocked
                      ? 'bg-zinc-900/40 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                      : 'bg-zinc-950/80 border-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
                style={
                  selected
                    ? {
                        borderColor: info.color,
                        color: info.color,
                        boxShadow: `0 0 16px ${info.color}66, inset 0 0 8px ${info.color}22`,
                      }
                    : {}
                }
              >
                <div className="font-bold tracking-wider">{info.name}</div>
                <div className="text-[9px] opacity-70 mt-0.5">{info.subtitle}</div>
                {!unlocked && (
                  <div className="text-[9px] text-zinc-600 mt-1">🔒 LOCKED</div>
                )}
                {unlocked && (
                  <div className="text-[9px] opacity-60 mt-1">{info.roomRange}</div>
                )}
              </button>
            );
          })}
        </div>
        {/* Selected zone description */}
        <div className="text-center text-[10px] text-zinc-400 max-w-md mt-2 italic min-h-[28px]">
          {ZONE_INFO[selectedZone].description}
        </div>
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
          ENTER {ZONE_INFO[selectedZone].name}
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
        <button
          onClick={onOpenNecrominion}
          className="px-6 py-2 text-xs border border-emerald-800 text-emerald-300 bg-emerald-950/40 rounded-sm hover:border-emerald-500 hover:text-emerald-200 transition-all"
        >
          ☠ Necrominion · Offline Soul Farming
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
        <div className="mt-1 text-zinc-500 uppercase tracking-wider">Unlocked Zones</div>
        <div>{progress.unlockedZones.join(', ')}</div>
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
        <div>R — Quick Restart / Reroll (context-sensitive)</div>
        <div className="mt-2 text-zinc-500 uppercase tracking-wider">
          Auto Systems
        </div>
        <div>✦ Wand auto-fires (smart target: boss &gt; elite &gt; nearest)</div>
        <div>✦ All abilities auto-cast</div>
        <div>✦ Soul meter charges from kills → Soul Nova</div>
        <div>✦ Minions raise automatically from kills</div>
        <div>✦ Boss specials telegraph 1.5s before firing</div>
        <div>✦ Elite enemies (⚡) drop bonus souls &amp; relics</div>
        <div>✦ Bullets vanish on wall hit (Ricochet bounces!)</div>
      </div>
    </div>
  );
}
