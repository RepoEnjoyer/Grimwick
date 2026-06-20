'use client';

import { useState } from 'react';
import {
  PERMANENT_UPGRADE_DEFS,
  STAGE2_UPGRADE_DEFS,
  NECROMINION_UPGRADE_DEFS,
  buyUpgrade,
  buyStage2Upgrade,
  buyNecrominionUpgrade,
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

  const handleBuy = (id: keyof PermanentProgress['upgrades']) => {
    if (String(id).startsWith('stage2')) {
      const newProgress = buyStage2Upgrade(progress, id);
      if (newProgress) {
        onProgressChange(newProgress);
        setError('');
      } else {
        const def = STAGE2_UPGRADE_DEFS.find((d) => d.id === id);
        const currentLevel = progress.upgrades[id];
        if (def && currentLevel >= def.maxLevel) {
          setError(`${def.name} is already at max level.`);
        } else {
          const cost = def ? def.cost(currentLevel) : 0;
          setError(`Need ${cost} soul shards.`);
        }
      }
      return;
    }
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

  const getSkinCost = (skinId: string): number => {
    const skin = SKINS.find((s) => s.id === skinId);
    if (!skin) return 9999;
    const match = skin.unlockHint.match(/\((\d+)\s+soul shards\)/);
    return match ? parseInt(match[1], 10) : 9999;
  };

  const handleBuySkin = (skinId: string) => {
    const skin = SKINS.find((s) => s.id === skinId);
    if (!skin) return;
    if (progress.unlockedSkins.includes(skin.name)) {
      setError(`${skin.name} already owned.`);
      return;
    }
    const cost = getSkinCost(skinId);
    const newProgress = buySkin(progress, skin.name, cost);
    if (newProgress) {
      onProgressChange(newProgress);
      setError('');
    } else {
      setError(`Need ${cost} soul shards.`);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-zinc-950 via-purple-950/40 to-zinc-950 font-mono text-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-zinc-800 bg-zinc-950/60 sticky top-0 z-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight" style={{
            background: 'linear-gradient(180deg,#e0c0ff,#9060ff)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            filter: 'drop-shadow(0 0 12px rgba(150,80,255,0.5))',
          }}>⚱ THE CRYPT</h2>
          <div className="text-xs text-zinc-500 mt-0.5">Spend soul shards to empower your next incarnation.</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Soul Shards</div>
            <div className="text-3xl text-purple-300 font-bold drop-shadow-[0_0_8px_rgba(150,80,255,0.6)]">✦ {progress.soulShards}</div>
          </div>
          <button onClick={onClose} className="px-5 py-2 text-xs border border-zinc-700 text-zinc-300 bg-zinc-900/60 rounded-sm hover:border-purple-500 hover:text-purple-200 transition-all">✕ Close</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* ===== PERMANENT UPGRADES ===== */}
        <div className="max-w-6xl mx-auto">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3">Permanent Upgrades</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PERMANENT_UPGRADE_DEFS.map((def) => {
              const upgradeId = def.id as keyof PermanentProgress['upgrades'];
              const level = progress.upgrades[upgradeId];
              const maxed = level >= def.maxLevel;
              const cost = def.cost(level);
              const canAfford = progress.soulShards >= cost && !maxed;
              return (
                <div key={def.id} className={`relative bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border-2 ${maxed ? 'border-amber-600' : canAfford ? 'border-purple-700' : 'border-zinc-800'} p-4 rounded-sm flex flex-col gap-3`}>
                  <div className="flex items-start justify-between">
                    <div className="text-3xl">{def.icon}</div>
                    <div className="text-right"><div className="text-[10px] text-zinc-500 uppercase">Level</div><div className="text-sm font-bold text-purple-200">{level} / {def.maxLevel}</div></div>
                  </div>
                  <div><h3 className="text-base font-bold text-white">{def.name}</h3><p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{def.description}</p></div>
                  <div className="flex gap-0.5">{Array.from({ length: def.maxLevel }).map((_, i) => (<div key={i} className={`flex-1 h-1.5 ${i < level ? 'bg-purple-500' : 'bg-zinc-800'}`} />))}</div>
                  <button disabled={maxed || !canAfford} onClick={() => handleBuy(upgradeId)} className={`w-full py-2 text-xs font-bold tracking-wider rounded-sm transition-all ${maxed ? 'bg-amber-900/30 text-amber-400 border border-amber-700 cursor-default' : canAfford ? 'bg-purple-800 text-white border border-purple-500 hover:bg-purple-700 hover:shadow-[0_0_12px_rgba(150,80,255,0.4)]' : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'}`}>{maxed ? '★ MAXED' : `✦ ${cost}`}</button>
                </div>
              );
            })}
          </div>
        </div>

        {error && <div className="text-center mt-4 text-rose-400 text-xs">{error}</div>}

        {/* ===== STAGE 2 UPGRADES ===== */}
        <div className="max-w-6xl mx-auto mt-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-[10px] uppercase tracking-wider text-fuchsia-400">Stage 2 Upgrades · Void Power</div>
            <div className="flex-1 h-px bg-fuchsia-900/50" />
            <div className={`text-[10px] uppercase tracking-wider ${stage2Unlocked ? 'text-emerald-400' : 'text-zinc-600'}`}>{stage2Unlocked ? '✓ Unlocked' : '🔒 Clear Crypt to unlock'}</div>
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
                  <div key={def.id} className={`relative bg-gradient-to-b from-fuchsia-950/40 to-zinc-950/90 border-2 ${maxed ? 'border-amber-600' : canAfford ? 'border-fuchsia-700' : 'border-zinc-800'} p-4 rounded-sm flex flex-col gap-3`}>
                    <div className="flex items-start justify-between"><div className="text-3xl">{def.icon}</div><div className="text-right"><div className="text-[10px] text-zinc-500 uppercase">Level</div><div className="text-sm font-bold text-fuchsia-200">{level} / {def.maxLevel}</div></div></div>
                    <div><h3 className="text-base font-bold text-white">{def.name}</h3><p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{def.description}</p></div>
                    <div className="flex gap-0.5">{Array.from({ length: def.maxLevel }).map((_, i) => (<div key={i} className={`flex-1 h-1.5 ${i < level ? 'bg-fuchsia-500' : 'bg-zinc-800'}`} />))}</div>
                    <button disabled={maxed || !canAfford} onClick={() => handleBuy(upgradeId)} className={`w-full py-2 text-xs font-bold tracking-wider rounded-sm transition-all ${maxed ? 'bg-amber-900/30 text-amber-400 border border-amber-700 cursor-default' : canAfford ? 'bg-fuchsia-800 text-white border border-fuchsia-500 hover:bg-fuchsia-700 hover:shadow-[0_0_12px_rgba(200,80,255,0.4)]' : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'}`}>{maxed ? '★ MAXED' : `✦ ${cost}`}</button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-zinc-950/60 border border-zinc-800 p-6 rounded-sm text-center">
              <div className="text-zinc-500 text-sm italic">🔒 Defeat the Bone Dragon in The Crypt to unlock Stage 2 upgrades.<br />These upgrades provide the power needed to survive The Void Depths and The Abyssal Throne.</div>
            </div>
          )}
        </div>

        {/* ===== SKIN SHOP (IMPROVED with live preview) ===== */}
        <SkinShop progress={progress} onBuySkin={handleBuySkin} getSkinCost={getSkinCost} />

        {/* ===== UNLOCKS ===== */}
        <div className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <UnlockCard title="Wand Types" items={progress.unlockedWandTypes} hint="Unlock by leveling Wand Power" />
          <UnlockCard title="Skins" items={progress.unlockedSkins} hint="Earn by clearing zones or buy above" />
          <UnlockCard title="Dungeon Zones" items={progress.unlockedZones} hint="Unlock by clearing previous zone's final boss" />
        </div>

        {/* ===== LEGACY ===== */}
        <div className="max-w-6xl mx-auto mt-8 bg-zinc-950/60 border border-zinc-800 p-4 rounded-sm">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Legacy</div>
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

// ===== SKIN SHOP with live player preview =====
function SkinShop({
  progress,
  onBuySkin,
  getSkinCost,
}: {
  progress: PermanentProgress;
  onBuySkin: (id: string) => void;
  getSkinCost: (id: string) => number;
}) {
  const [previewSkin, setPreviewSkin] = useState<string>('default');
  const skin = SKINS.find((s) => s.id === previewSkin) ?? SKINS[0];

  const purchasableSkins = SKINS.filter((s) =>
    ['frost_mage', 'shadow_reaper', 'blood_mage', 'cosmic_horror'].includes(s.id)
  );
  const earnableSkins = SKINS.filter((s) =>
    ['golden_lich', 'void_walker', 'bone_king'].includes(s.id)
  );

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-[10px] uppercase tracking-wider text-emerald-400">Skin Shop · Customize Your Necromancer</div>
        <div className="flex-1 h-px bg-emerald-900/50" />
      </div>

      {/* Live Preview + Skin Grid side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ===== LIVE PLAYER PREVIEW ===== */}
        <div className="bg-gradient-to-b from-zinc-950/80 to-zinc-950/90 border-2 border-zinc-700 rounded-sm p-6 flex flex-col items-center gap-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Live Preview</div>
          {/* Canvas-based skeleton preview */}
          <SkinPreviewCanvas skin={skin} />
          <div className="text-center">
            <h3 className="text-lg font-bold" style={{ color: skin.eyeColor }}>{skin.name}</h3>
            <p className="text-[11px] text-zinc-400 mt-1">{skin.description}</p>
          </div>
          {/* Color palette swatches */}
          <div className="flex gap-1.5 mt-1">
            {[
              { color: skin.boneColor, label: 'Bones' },
              { color: skin.robeColor, label: 'Robe' },
              { color: skin.robeTrim, label: 'Trim' },
              { color: skin.eyeColor, label: 'Eyes' },
              { color: skin.wandTipColor, label: 'Wand' },
            ].map((sw) => (
              <div key={sw.label} className="flex flex-col items-center gap-0.5">
                <div className="w-8 h-8 rounded-sm border border-zinc-700" style={{ background: sw.color, boxShadow: `0 0 6px ${sw.color}55` }} />
                <div className="text-[8px] text-zinc-600">{sw.label}</div>
              </div>
            ))}
          </div>
          {skin.auraColor && (
            <div className="text-[10px] text-zinc-500 mt-1">✨ Aura: <span style={{ color: skin.auraColor }}>{skin.auraColor}</span></div>
          )}
        </div>

        {/* ===== SKIN GRID (purchasable) ===== */}
        <div className="lg:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Purchasable Skins</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {purchasableSkins.map((s) => {
              const owned = progress.unlockedSkins.includes(s.name);
              const cost = getSkinCost(s.id);
              const canAfford = progress.soulShards >= cost && !owned;
              const isPreviewing = previewSkin === s.id;
              return (
                <div key={s.id} className={`bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border-2 p-3 rounded-sm flex flex-col gap-2 cursor-pointer transition-all ${isPreviewing ? 'border-emerald-500 shadow-[0_0_12px_rgba(80,200,140,0.3)]' : owned ? 'border-emerald-700' : canAfford ? 'border-zinc-700 hover:border-zinc-500' : 'border-zinc-800'}`} onClick={() => setPreviewSkin(s.id)}>
                  {/* Mini swatch preview */}
                  <div className="flex gap-1 mb-1">
                    <div className="w-5 h-5 rounded-sm" style={{ background: s.boneColor }} />
                    <div className="w-5 h-5 rounded-sm" style={{ background: s.robeColor }} />
                    <div className="w-5 h-5 rounded-sm" style={{ background: s.robeTrim }} />
                    <div className="w-5 h-5 rounded-sm" style={{ background: s.eyeColor }} />
                    <div className="w-5 h-5 rounded-sm" style={{ background: s.wandTipColor }} />
                  </div>
                  <div className="font-bold text-sm" style={{ color: s.eyeColor }}>{s.name}</div>
                  <div className="text-[10px] text-zinc-500">{s.description}</div>
                  <button disabled={owned || !canAfford} onClick={(e) => { e.stopPropagation(); onBuySkin(s.id); }} className={`w-full py-1.5 text-[11px] font-bold tracking-wider rounded-sm transition-all ${owned ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700 cursor-default' : canAfford ? 'bg-emerald-800 text-white border border-emerald-500 hover:bg-emerald-700' : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'}`}>{owned ? '✓ OWNED' : `✦ ${cost}`}</button>
                </div>
              );
            })}
          </div>

          {/* Earnable skins */}
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-4 mb-2">Earnable Skins (clear zones to unlock)</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {earnableSkins.map((s) => {
              const owned = progress.unlockedSkins.includes(s.name);
              const isPreviewing = previewSkin === s.id;
              return (
                <div key={s.id} className={`bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border-2 p-3 rounded-sm flex flex-col gap-1 cursor-pointer transition-all ${isPreviewing ? 'border-amber-500 shadow-[0_0_12px_rgba(255,180,60,0.3)]' : owned ? 'border-amber-700/50' : 'border-zinc-800'}`} onClick={() => setPreviewSkin(s.id)}>
                  <div className="flex gap-1 mb-1">
                    <div className="w-5 h-5 rounded-sm" style={{ background: s.boneColor }} />
                    <div className="w-5 h-5 rounded-sm" style={{ background: s.robeColor }} />
                    <div className="w-5 h-5 rounded-sm" style={{ background: s.eyeColor }} />
                  </div>
                  <div className="font-bold text-sm" style={{ color: s.eyeColor }}>{s.name}</div>
                  <div className="text-[10px] text-zinc-500">{s.unlockHint}</div>
                  <div className={`text-[10px] font-bold ${owned ? 'text-emerald-400' : 'text-zinc-600'}`}>{owned ? '✓ UNLOCKED' : '🔒 LOCKED'}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Canvas-based skin preview =====
function SkinPreviewCanvas({ skin }: { skin: typeof SKINS[0] }) {
  return (
    <div className="relative w-32 h-40 bg-gradient-to-b from-zinc-900 to-black border border-zinc-700 rounded-sm flex items-center justify-center overflow-hidden">
      {/* Aura glow */}
      {skin.auraColor && (
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse at center, ${skin.auraColor}33 0%, transparent 70%)`,
        }} />
      )}
      {/* Skeleton mage SVG */}
      <svg viewBox="0 0 64 80" className="w-24 h-32 relative z-10" style={{ filter: `drop-shadow(0 0 4px ${skin.auraColor ?? skin.eyeColor}44)` }}>
        {/* Shadow */}
        <ellipse cx="32" cy="76" rx="14" ry="3" fill="rgba(0,0,0,0.5)" />
        {/* Body bones */}
        <rect x="24" y="40" width="16" height="14" rx="2" fill={skin.boneColor} />
        {/* Spine */}
        <rect x="30" y="32" width="4" height="10" fill={skin.boneColor} opacity="0.8" />
        {/* Arms */}
        <rect x="18" y="38" width="6" height="3" rx="1" fill={skin.boneColor} />
        <rect x="40" y="38" width="6" height="3" rx="1" fill={skin.boneColor} />
        {/* Robe */}
        <path d={`M22 42 L20 68 L44 68 L42 42 Z`} fill={skin.robeColor} />
        <rect x="22" y="42" width="20" height="2" fill={skin.robeTrim} />
        {/* Hood */}
        <path d={`M22 36 L24 22 L40 22 L42 36 Z`} fill={skin.robeColor} />
        {/* Skull */}
        <rect x="25" y="18" width="14" height="11" rx="2" fill={skin.boneColor} />
        {/* Eye sockets */}
        <rect x="27" y="21" width="4" height="3" fill="#000" />
        <rect x="33" y="21" width="4" height="3" fill="#000" />
        {/* Glowing eyes */}
        <circle cx="29" cy="22.5" r="1.5" fill={skin.eyeColor} style={{ filter: `drop-shadow(0 0 3px ${skin.eyeColor})` }} />
        <circle cx="35" cy="22.5" r="1.5" fill={skin.eyeColor} style={{ filter: `drop-shadow(0 0 3px ${skin.eyeColor})` }} />
        {/* Teeth */}
        <rect x="28" y="27" width="8" height="1" fill="#000" />
        {/* Wand */}
        <line x1="46" y1="48" x2="50" y2="32" stroke="#5a4030" strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="30" r="3" fill={skin.wandTipColor} style={{ filter: `drop-shadow(0 0 4px ${skin.wandTipColor})` }} />
        <circle cx="50" cy="30" r="1.5" fill="#fff" />
        {/* Bone King crown */}
        {skin.id === 'bone_king' && (
          <>
            <path d="M26 18 L28 14 L30 18 L32 14 L34 18 L36 14 L38 18" stroke="#ffd040" strokeWidth="1.5" fill="none" />
            <circle cx="32" cy="15" r="1" fill="#ff4040" />
          </>
        )}
        {/* Golden Lich pauldrons */}
        {skin.id === 'golden_lich' && (
          <>
            <rect x="16" y="36" width="4" height="4" fill="#ffd040" />
            <rect x="44" y="36" width="4" height="4" fill="#ffd040" />
          </>
        )}
        {/* Cosmic Horror stars */}
        {skin.id === 'cosmic_horror' && (
          <>
            <circle cx="28" cy="44" r="0.5" fill="#fff" />
            <circle cx="34" cy="48" r="0.5" fill="#fff" />
            <circle cx="30" cy="52" r="0.5" fill="#fff" />
          </>
        )}
      </svg>
    </div>
  );
}

function UnlockCard({ title, items, hint }: { title: string; items: string[]; hint: string }) {
  return (
    <div className="bg-zinc-950/60 border border-zinc-800 p-3 rounded-sm">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">{title}</div>
      <div className="flex flex-wrap gap-1">
        {items.length === 0 ? <span className="text-xs text-zinc-600">None yet</span> : items.map((it) => (
          <span key={it} className="text-[11px] bg-zinc-900 border border-zinc-700 text-zinc-200 px-2 py-0.5 rounded-sm">{it}</span>
        ))}
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
