'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  NECROMINION_UPGRADE_DEFS,
  buyNecrominionUpgrade,
  necrominionStats,
  necrominionPending,
  necrominionCollect,
  necrominionAutoCollect,
  type PermanentProgress,
} from '@/lib/game/persistence';

interface Props {
  progress: PermanentProgress;
  onClose: () => void;
  onProgressChange: (p: PermanentProgress) => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function NecrominionTab({ progress, onClose, onProgressChange }: Props) {
  const [error, setError] = useState<string>('');
  const [collectFlash, setCollectFlash] = useState<string>('');
  // Re-render every second to update pending souls counter
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      // Auto-collect check: if auto-collect threshold is met, collect automatically
      const stats = necrominionStats(progress);
      if (stats.autoCollectThreshold > 0) {
        const pending = necrominionPending(progress);
        const thresholdSouls = stats.storageCap * stats.autoCollectThreshold;
        if (pending.total >= thresholdSouls) {
          const result = necrominionCollect(progress);
          if (result.soulsCollected > 0) {
            onProgressChange(result.newProgress);
            setCollectFlash(`Auto-collected: +${result.shardsGained} shards`);
            setTimeout(() => setCollectFlash(''), 3000);
          }
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [progress, onProgressChange]);

  const stats = useMemo(() => necrominionStats(progress), [progress]);
  const pending = useMemo(() => necrominionPending(progress), [progress, collectFlash]);

  const handleBuy = (id: keyof PermanentProgress['necrominion']['upgradeLevels']) => {
    const newProgress = buyNecrominionUpgrade(progress, id);
    if (newProgress) {
      onProgressChange(newProgress);
      setError('');
    } else {
      const def = NECROMINION_UPGRADE_DEFS.find((d) => d.id === id);
      const currentLevel = progress.necrominion.upgradeLevels[id];
      if (def && currentLevel >= def.maxLevel) {
        setError(`${def.name} is already at max level.`);
      } else {
        const cost = def ? def.cost(currentLevel) : 0;
        setError(`Need ${cost} soul shards.`);
      }
    }
  };

  const handleCollect = () => {
    const result = necrominionCollect(progress);
    if (result.soulsCollected > 0) {
      onProgressChange(result.newProgress);
      setCollectFlash(`+${result.shardsGained} soul shards!`);
      setError('');
      setTimeout(() => setCollectFlash(''), 3000);
    } else {
      setError('No souls to collect yet.');
    }
  };

  const fillPct = (pending.total / stats.storageCap) * 100;

  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-zinc-950 via-purple-950/40 to-zinc-950 font-mono text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-zinc-800 bg-zinc-950/60">
        <div>
          <h2
            className="text-3xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(180deg,#a0ffd0,#40c080)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 0 12px rgba(80,200,140,0.5))',
            }}
          >
            ☠ NECROMINION
          </h2>
          <div className="text-xs text-zinc-500 mt-0.5">
            Your undead servants farm souls offline. Collect and convert to soul shards.
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

      <div className="flex-1 overflow-y-auto p-6">
        {/* ===== Soul farming status panel ===== */}
        <div className="max-w-4xl mx-auto bg-gradient-to-b from-emerald-950/60 to-zinc-950/80 border-2 border-emerald-700 rounded-sm p-6 mb-6">
          <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2">
            Soul Vessel
          </div>
          {/* Storage progress bar */}
          <div className="relative w-full h-12 bg-zinc-900/80 border border-emerald-800 rounded-sm overflow-hidden mb-2">
            <div
              className="absolute left-0 top-0 h-full transition-all"
              style={{
                width: `${Math.min(100, fillPct)}%`,
                background: pending.capped
                  ? 'linear-gradient(90deg,#ff4040,#ff8040)'
                  : 'linear-gradient(90deg,#20a060,#80e0a0)',
                boxShadow: pending.capped ? '0 0 16px #ff4040' : '0 0 12px #40c080',
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-bold">
              <div className="text-base">
                {Math.floor(pending.total)} / {stats.storageCap} souls
              </div>
              <div className="text-[10px] opacity-70">
                {pending.capped
                  ? '⚠ STORAGE CAP — Collect now!'
                  : `+${stats.generationRatePerHour}/hr · ${formatDuration(pending.elapsedMs)} elapsed`}
              </div>
            </div>
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
            <Stat label="Generation" value={`${stats.generationRatePerHour}/hr`} color="text-emerald-300" />
            <Stat label="Storage Cap" value={stats.storageCap} color="text-cyan-300" />
            <Stat label="Conversion" value={`${Math.round(stats.conversionEfficiency * 100)}%`} color="text-amber-300" />
            <Stat label="Auto-Collect" value={`${Math.round(stats.autoCollectThreshold * 100)}%`} color="text-fuchsia-300" />
          </div>
          {/* Collect button */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleCollect}
              disabled={pending.total < 1}
              className={`px-6 py-2 text-sm font-bold tracking-widest rounded-sm transition-all ${
                pending.total >= 1
                  ? 'bg-gradient-to-b from-emerald-600 to-emerald-800 border-2 border-emerald-300 text-white hover:from-emerald-500 hover:to-emerald-700 shadow-[0_0_20px_rgba(80,200,140,0.5)]'
                  : 'bg-zinc-900 border-2 border-zinc-700 text-zinc-600 cursor-not-allowed'
              }`}
            >
              ⚗ COLLECT SOULS
            </button>
            {pending.total >= 1 && (
              <div className="text-xs">
                <span className="text-zinc-400">Will gain: </span>
                <span className="text-emerald-300 font-bold">
                  {Math.floor(pending.total)} souls → {Math.floor(pending.total * stats.conversionEfficiency)} shards
                </span>
              </div>
            )}
            {collectFlash && (
              <div className="text-emerald-300 text-sm font-bold animate-pulse">{collectFlash}</div>
            )}
            {error && <div className="text-rose-400 text-xs">{error}</div>}
          </div>
          {/* Auto-collect info */}
          <div className="mt-3 text-[10px] text-zinc-500 italic">
            {stats.autoCollectThreshold > 0
              ? `Auto-collect active: ${Math.round(stats.autoCollectThreshold * 100)}% of cap auto-converts when full.`
              : 'Auto-collect disabled. Buy "Auto Harvester" to auto-collect when storage is full.'}
          </div>
        </div>

        {/* ===== Necrominion Upgrades ===== */}
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
            Necrominion Upgrades
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {NECROMINION_UPGRADE_DEFS.map((def) => {
              const upgradeId = def.id as keyof PermanentProgress['necrominion']['upgradeLevels'];
              const level = progress.necrominion.upgradeLevels[upgradeId];
              const maxed = level >= def.maxLevel;
              const cost = def.cost(level);
              const canAfford = progress.soulShards >= cost && !maxed;
              return (
                <div
                  key={def.id}
                  className={`bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border-2 p-4 rounded-sm flex flex-col gap-2 ${
                    maxed
                      ? 'border-amber-600'
                      : canAfford
                        ? 'border-emerald-700'
                        : 'border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-2xl">{def.icon}</div>
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500 uppercase">Level</div>
                      <div className="text-sm font-bold text-emerald-200">{level} / {def.maxLevel}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{def.name}</h3>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{def.description}</p>
                  </div>
                  {/* Level bars */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: def.maxLevel }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 ${i < level ? 'bg-emerald-500' : 'bg-zinc-800'}`}
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
                          ? 'bg-emerald-800 text-white border border-emerald-500 hover:bg-emerald-700 hover:shadow-[0_0_12px_rgba(80,200,140,0.4)]'
                          : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                    }`}
                  >
                    {maxed ? '★ MAXED' : `✦ ${cost}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info panel */}
        <div className="max-w-4xl mx-auto mt-6 bg-zinc-950/60 border border-zinc-800 p-4 rounded-sm">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">How It Works</div>
          <div className="text-xs text-zinc-400 leading-relaxed space-y-1">
            <div>• Your Necrominion generates souls passively, even while you're not playing.</div>
            <div>• Souls accumulate up to your storage cap, then stop until you collect.</div>
            <div>• Collecting converts souls to soul shards at your conversion efficiency rate.</div>
            <div>• Spend soul shards on upgrades here or in the Crypt Hub.</div>
            <div>• Higher levels = more passive income = faster progression.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 px-3 py-2 rounded-sm">
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
