'use client';

import { useState } from 'react';
import {
  PERMANENT_UPGRADE_DEFS,
  buyUpgrade,
  type PermanentProgress,
} from '@/lib/game/persistence';

interface Props {
  progress: PermanentProgress;
  onClose: () => void;
  onProgressChange: (p: PermanentProgress) => void;
}

export function CryptHub({ progress, onClose, onProgressChange }: Props) {
  const [error, setError] = useState<string>('');

  const handleBuy = (
    id: 'startHealth' | 'wandPower' | 'soulGain' | 'minionPower' | 'moveSpeed' | 'relicLuck'
  ) => {
    const newProgress = buyUpgrade(progress, id);
    if (newProgress) {
      onProgressChange(newProgress);
      setError('');
    } else {
      const def = PERMANENT_UPGRADE_DEFS.find((d) => d.id === id);
      const currentLevel = progress.upgrades[id];
      if (def && currentLevel >= def.maxLevel) {
        setError(`${def.name} is already at max level.`);
      } else {
        const cost = def ? def.cost(currentLevel) : 0;
        setError(`Need ${cost} soul shards.`);
      }
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-zinc-950 via-purple-950/40 to-zinc-950 font-mono text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-zinc-800 bg-zinc-950/60">
        <div>
          <h2
            className="text-3xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(180deg,#e0c0ff,#9060ff)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 0 12px rgba(150,80,255,0.5))',
            }}
          >
            ⚱ THE CRYPT
          </h2>
          <div className="text-xs text-zinc-500 mt-0.5">
            Spend soul shards to empower your next incarnation.
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Soul Shards
            </div>
            <div className="text-3xl text-purple-300 font-bold drop-shadow-[0_0_8px_rgba(150,80,255,0.6)]">
              ✦ {progress.soulShards}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs border border-zinc-700 text-zinc-300 bg-zinc-900/60 rounded-sm hover:border-purple-500 hover:text-purple-200 transition-all"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Upgrade grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {PERMANENT_UPGRADE_DEFS.map((def) => {
            const upgradeId = def.id as
              | 'startHealth'
              | 'wandPower'
              | 'soulGain'
              | 'minionPower'
              | 'moveSpeed'
              | 'relicLuck';
            const level = progress.upgrades[upgradeId];
            const maxed = level >= def.maxLevel;
            const cost = def.cost(level);
            const canAfford = progress.soulShards >= cost && !maxed;
            return (
              <div
                key={def.id}
                className={`relative bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border-2 ${
                  maxed
                    ? 'border-amber-600'
                    : canAfford
                    ? 'border-purple-700'
                    : 'border-zinc-800'
                } p-4 rounded-sm flex flex-col gap-3`}
              >
                <div className="flex items-start justify-between">
                  <div className="text-3xl">{def.icon}</div>
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-500 uppercase">
                      Level
                    </div>
                    <div className="text-sm font-bold text-purple-200">
                      {level} / {def.maxLevel}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {def.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    {def.description}
                  </p>
                </div>
                {/* Level bars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: def.maxLevel }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 ${
                        i < level ? 'bg-purple-500' : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
                <button
                  disabled={maxed || !canAfford}
                  onClick={() => handleBuy(upgradeId)}
                  className={`w-full py-2 text-xs font-bold tracking-wider rounded-sm transition-all ${
                    maxed
                      ? 'bg-amber-900/30 text-amber-400 border border-amber-700 cursor-default'
                      : canAfford
                      ? 'bg-purple-800 text-white border border-purple-500 hover:bg-purple-700 hover:shadow-[0_0_12px_rgba(150,80,255,0.4)]'
                      : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                  }`}
                >
                  {maxed ? '★ MAXED' : `✦ ${cost}`}
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="text-center mt-4 text-rose-400 text-xs">{error}</div>
        )}

        {/* Unlocks section */}
        <div className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <UnlockCard
            title="Wand Types"
            items={progress.unlockedWandTypes}
            hint="Unlock by leveling Wand Power"
          />
          <UnlockCard
            title="Skins"
            items={progress.unlockedSkins}
            hint="Future update"
          />
          <UnlockCard
            title="Dungeon Zones"
            items={progress.unlockedZones}
            hint="Future update"
          />
        </div>

        {/* Legacy stats */}
        <div className="max-w-6xl mx-auto mt-8 bg-zinc-950/60 border border-zinc-800 p-4 rounded-sm">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
            Legacy
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Total Runs" value={progress.runsCompleted} />
            <Stat label="Bosses Slain" value={progress.bossesDefeated} />
            <Stat label="Highest Room" value={progress.highestRoom} />
            <Stat label="Total Souls" value={progress.totalSouls} />
          </div>
        </div>
      </div>
    </div>
  );
}

function UnlockCard({
  title,
  items,
  hint,
}: {
  title: string;
  items: string[];
  hint: string;
}) {
  return (
    <div className="bg-zinc-950/60 border border-zinc-800 p-3 rounded-sm">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
        {title}
      </div>
      <div className="flex flex-wrap gap-1">
        {items.length === 0 ? (
          <span className="text-xs text-zinc-600">None yet</span>
        ) : (
          items.map((it) => (
            <span
              key={it}
              className="text-[11px] bg-zinc-900 border border-zinc-700 text-zinc-200 px-2 py-0.5 rounded-sm"
            >
              {it}
            </span>
          ))
        )}
      </div>
      <div className="text-[10px] text-zinc-600 mt-2 italic">{hint}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
      <div className="text-xl font-bold text-purple-200">{value}</div>
    </div>
  );
}
