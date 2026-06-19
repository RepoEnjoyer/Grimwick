'use client';

import { useState } from 'react';
import {
  PERMANENT_UPGRADE_DEFS,
  STAGE2_UPGRADE_DEFS,
  buyUpgrade,
  buyStage2Upgrade,
  buySkin,
  isStage2Unlocked,
  type PermanentProgress,
} from '@/lib/game/persistence';
import { SKINS } from '@/lib/game/content';

interface Props {
  progress: PermanentProgress;
  onClose: () => void;
  onProgressChange: (p: PermanentProgress) => void;
}

export function CryptHub({ progress, onClose, onProgressChange }: Props) {
  const [error, setError] = useState<string>('');
  const stage2Unlocked = isStage2Unlocked(progress);

  const handleBuy = (
    id: keyof PermanentProgress['upgrades']
  ) => {
    // Try Stage 2 first if it's a stage2 ID
    if (String(id).startsWith('stage2')) {
      const newProgress = buyStage2Upgrade(progress, id);
      if (newProgress) {
        onProgressChange(newProgress);
        setError('');
        return;
      } else {
        const def = STAGE2_UPGRADE_DEFS.find((d) => d.id === id);
        const currentLevel = progress.upgrades[id];
        if (def && currentLevel >= def.maxLevel) {
          setError(`${def.name} is already at max level.`);
        } else {
          const cost = def ? def.cost(currentLevel) : 0;
          setError(`Need ${cost} soul shards.`);
        }
        return;
      }
    }
    // Regular upgrade
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
            const upgradeId = def.id as keyof PermanentProgress['upgrades'];
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

        {/* ===== STAGE 2 UPGRADES SECTION ===== */}
        <div className="max-w-6xl mx-auto mt-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-[10px] uppercase tracking-wider text-fuchsia-400">
              Stage 2 Upgrades · Void Power
            </div>
            <div className="flex-1 h-px bg-fuchsia-900/50" />
            <div className={`text-[10px] uppercase tracking-wider ${stage2Unlocked ? 'text-emerald-400' : 'text-zinc-600'}`}>
              {stage2Unlocked ? '✓ Unlocked' : '🔒 Clear Crypt to unlock'}
            </div>
          </div>
          {stage2Unlocked ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {STAGE2_UPGRADE_DEFS.map((def) => {
                const upgradeId = def.id as keyof PermanentProgress['upgrades'];
                const level = progress.upgrades[upgradeId];
                const maxed = level >= def.maxLevel;
                const cost = def.cost(level);
                const canAfford = progress.soulShards >= cost && !maxed;
                return (
                  <div
                    key={def.id}
                    className={`relative bg-gradient-to-b from-fuchsia-950/40 to-zinc-950/90 border-2 ${
                      maxed
                        ? 'border-amber-600'
                        : canAfford
                          ? 'border-fuchsia-700'
                          : 'border-zinc-800'
                    } p-4 rounded-sm flex flex-col gap-3`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-3xl">{def.icon}</div>
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-500 uppercase">Level</div>
                        <div className="text-sm font-bold text-fuchsia-200">
                          {level} / {def.maxLevel}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{def.name}</h3>
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
                            i < level ? 'bg-fuchsia-500' : 'bg-zinc-800'
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
                            ? 'bg-fuchsia-800 text-white border border-fuchsia-500 hover:bg-fuchsia-700 hover:shadow-[0_0_12px_rgba(200,80,255,0.4)]'
                            : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                      }`}
                    >
                      {maxed ? '★ MAXED' : `✦ ${cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-zinc-950/60 border border-zinc-800 p-6 rounded-sm text-center">
              <div className="text-zinc-500 text-sm italic">
                🔒 Defeat the Bone Dragon in The Crypt to unlock Stage 2 upgrades.
                <br />
                These upgrades provide the power needed to survive The Void Depths and The Abyssal Throne.
              </div>
            </div>
          )}
        </div>

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
            hint="Earn by clearing zones or buy below"
          />
          <UnlockCard
            title="Dungeon Zones"
            items={progress.unlockedZones}
            hint="Unlock by clearing previous zone's final boss"
          />
        </div>

        {/* ===== SKIN SHOP ===== */}
        <SkinShop progress={progress} onProgressChange={onProgressChange} />

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

// ===== SKIN SHOP component =====
function SkinShop({
  progress,
  onProgressChange,
}: {
  progress: PermanentProgress;
  onProgressChange: (p: PermanentProgress) => void;
}) {
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Skins that are purchasable with soul shards (not zone-unlock skins)
  const purchasableSkins = SKINS.filter((s) =>
    ['frost_mage', 'shadow_reaper', 'blood_mage', 'cosmic_horror'].includes(s.id)
  );

  // Parse cost from unlockHint (e.g. "Buy from Crypt Hub (500 soul shards)" → 500)
  const getSkinCost = (skinId: string): number => {
    const skin = SKINS.find((s) => s.id === skinId);
    if (!skin) return 9999;
    const match = skin.unlockHint.match(/\((\d+)\s+soul shards\)/);
    return match ? parseInt(match[1], 10) : 9999;
  };

  const handleBuy = (skinId: string) => {
    const skin = SKINS.find((s) => s.id === skinId);
    if (!skin) return;
    if (progress.unlockedSkins.includes(skin.name)) {
      setError(`${skin.name} already owned.`);
      setSuccess('');
      return;
    }
    const cost = getSkinCost(skinId);
    const newProgress = buySkin(progress, skin.name, cost);
    if (newProgress) {
      onProgressChange(newProgress);
      setSuccess(`✓ Unlocked ${skin.name}!`);
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(`Need ${cost} soul shards.`);
      setSuccess('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-[10px] uppercase tracking-wider text-emerald-400">
          Skin Shop · Cosmetic Skins
        </div>
        <div className="flex-1 h-px bg-emerald-900/50" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {purchasableSkins.map((skin) => {
          const owned = progress.unlockedSkins.includes(skin.name);
          const cost = getSkinCost(skin.id);
          const canAfford = progress.soulShards >= cost && !owned;
          return (
            <div
              key={skin.id}
              className={`bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border-2 p-4 rounded-sm flex flex-col gap-2 ${
                owned ? 'border-emerald-600' : canAfford ? 'border-emerald-700' : 'border-zinc-800'
              }`}
            >
              {/* Skin preview swatch */}
              <div className="flex gap-1 mb-1">
                <div className="w-6 h-6 rounded-sm border border-zinc-700" style={{ background: skin.boneColor }} title="Bones" />
                <div className="w-6 h-6 rounded-sm border border-zinc-700" style={{ background: skin.robeColor }} title="Robe" />
                <div className="w-6 h-6 rounded-sm border border-zinc-700" style={{ background: skin.robeTrim }} title="Trim" />
                <div className="w-6 h-6 rounded-sm border border-zinc-700" style={{ background: skin.eyeColor }} title="Eyes" />
                <div className="w-6 h-6 rounded-sm border border-zinc-700" style={{ background: skin.wandTipColor }} title="Wand" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{skin.name}</h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{skin.description}</p>
              </div>
              <button
                disabled={owned || !canAfford}
                onClick={() => handleBuy(skin.id)}
                className={`w-full py-2 text-xs font-bold tracking-wider rounded-sm transition-all ${
                  owned
                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700 cursor-default'
                    : canAfford
                      ? 'bg-emerald-800 text-white border border-emerald-500 hover:bg-emerald-700 hover:shadow-[0_0_12px_rgba(80,200,140,0.4)]'
                      : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                }`}
              >
                {owned ? '✓ OWNED' : `✦ ${cost}`}
              </button>
            </div>
          );
        })}
      </div>
      {/* Zone-unlock skins info */}
      <div className="mt-4 bg-zinc-950/60 border border-zinc-800 p-3 rounded-sm text-[11px] text-zinc-500">
        <div className="text-zinc-400 font-bold mb-1">Earnable Skins (cannot be purchased):</div>
        <div>• <span style={{ color: '#ffd040' }}>Golden Lich</span> — Clear The Crypt (defeat Bone Dragon)</div>
        <div>• <span style={{ color: '#a040ff' }}>Void Walker</span> — Clear The Void Depths (defeat Void Leviathan)</div>
        <div>• <span style={{ color: '#ff4060' }}>Bone King</span> — Clear The Abyssal Throne (defeat Lich King)</div>
      </div>
      {error && <div className="text-center mt-3 text-rose-400 text-xs">{error}</div>}
      {success && <div className="text-center mt-3 text-emerald-400 text-xs font-bold animate-pulse">{success}</div>}
    </div>
  );
}
