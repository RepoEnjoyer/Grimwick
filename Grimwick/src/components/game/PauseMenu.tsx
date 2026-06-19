'use client';

import { useState, useEffect } from 'react';

interface BuildSummary {
  hp: number;
  maxHp: number;
  souls: number;
  wandLevel: number;
  wandType: string;
  kills: number;
  minions: number;
  maxMinions: number;
  room: number;
  zone: 'crypt' | 'void' | 'abyss';
  wave: string;
  skills: string[];
  relics: { id: string; name: string; icon: string; description: string }[];
  // QOL: extended stats
  timeSurvived: number;
  damageTaken: number;
  damageDealt: number;
  elitesKilled: number;
  maxCombo: number;
}

const ZONE_LABELS: Record<'crypt' | 'void' | 'abyss', string> = {
  crypt: 'THE CRYPT',
  void: 'THE VOID DEPTHS',
  abyss: 'THE ABYSSAL THRONE',
};

interface Props {
  getSummary: () => BuildSummary;
  onResume: () => void;
  onRestart: () => void;
  onReturnToMenu: () => void;
}

const SKILL_NAMES: Record<string, string> = {
  fire_rate: 'Cursed Cadence',
  extra_projectile: 'Twin Bones',
  wand_damage: 'Soul Edge',
  soul_spark: 'Soul Spark',
  skull_missile: 'Skull Missile',
  grave_beam: 'Grave Beam',
  cursed_barrage: 'Cursed Barrage',
  piercing_bone: 'Piercing Bone',
  soul_burn: 'Soul Burn',
  death_ray: 'Death Ray',
  proj_speed: 'Spectral Velocity',
  raise_bones: 'Raise Bones',
  raise_bones_2: 'Restless Dead',
  bone_servant: 'Bone Servant',
  grave_call: 'Grave Call',
  rotting_familiar: 'Rotting Familiar',
  soul_binding: 'Soul Binding',
  undead_swarm: 'Undead Swarm',
  necromancer_command: "Necromancer's Command",
  army_of_dead: 'Army of the Dead',
  minion_damage: 'Bone Sharpening',
  bone_shield: 'Bone Shield',
  soul_drain: 'Soul Drain',
  soul_drain_2: 'Deeper Drain',
  cursed_ground: 'Cursed Ground',
  phantom_dash: 'Phantom Dash',
  last_laugh: 'Last Laugh',
  grave_armor: 'Grave Armor',
  lich_form: 'Lich Form',
  max_hp: 'Tough Bones',
  move_speed: 'Swift Bones',
  soul_pickup: 'Soul Magnet',
  soul_gain: 'Soul Hoarder',
  homing_soul: 'Homing Soul',
  splitter_bolt: 'Splitter Bolt',
  volatile_bones: 'Volatile Bones',
  bone_beast: 'Bone Beast',
  wraith: 'Wraith Servant',
  minion_hp: 'Sturdy Bones',
  aura_of_decay: 'Aura of Decay',
  vampiric_aura: 'Vampiric Aura',
  spirit_walk: 'Spirit Walk',
  bone_storm: 'Bone Storm',
  soul_nova: 'Soul Nova',
  soul_battery: 'Soul Battery',
  echo_wand: 'Echo Wand',
  crown_of_thorns: 'Crown of Thorns',
  undying_heart: 'Undying Heart',
  chain_lightning: 'Chain Lightning',
  frost_bolt: 'Frost Bolt',
  critical_strike: 'Critical Strike',
  execute: 'Execute',
  ricochet: 'Ricochet',
  bone_golem: 'Bone Golem',
  plague_bats: 'Plague Bats',
  necrotic_explosion: 'Necrotic Explosion',
  mark_of_death: 'Mark of Death',
  soul_link: 'Soul Link',
  bone_wall: 'Bone Wall',
  iron_bones: 'Iron Bones',
  vampiric_touch: 'Vampiric Touch',
  black_hole: 'Black Hole',
  meteor_strike: 'Meteor Strike',
  time_warp: 'Time Warp',
  earthquake: 'Earthquake',
  blessed_by_god: 'I AM BLESSED BY GOD',
  soul_harvest: 'Soul Harvest',
  undead_frenzy: 'Undead Frenzy',
  phoenix_will: 'Phoenix Will',
  soul_magnet_aura: 'Soul Magnet Aura',
  overcharge: 'Overcharge',
  twin_souls: 'Twin Souls',
  // ===== NEW COMBO SKILLS =====
  soul_resonance: 'Soul Resonance',
  frostbite_curse: 'Frostbite Curse',
  chain_reaction: 'Chain Reaction',
  bone_storm_surge: 'Bone Storm Surge',
  vampiric_hunger: 'Vampiric Hunger',
  soul_battery_overload: 'Soul Battery Overload',
  grave_echo: 'Grave Echo',
  phantom_resonance: 'Phantom Resonance',
  crit_cascade: 'Crit Cascade',
  toxic_synergy: 'Toxic Synergy',
  shattered_bone: 'Shattered Bone',
  soul_conduit: 'Soul Conduit',
  bloodlust: 'Bloodlust',
  arcane_amplifier: 'Arcane Amplifier',
  temporal_echo: 'Temporal Echo',
  necrotic_bloom: 'Necrotic Bloom',
};

export function PauseMenu({ getSummary, onResume, onRestart, onReturnToMenu }: Props) {
  const [summary, setSummary] = useState<BuildSummary>(() => getSummary());

  // Refresh summary when opened
  useEffect(() => {
    setSummary(getSummary());
  }, [getSummary]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm font-mono text-white">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-zinc-950/95 to-purple-950/60 border-2 border-purple-700 rounded-sm p-6">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-xs uppercase tracking-[0.4em] text-purple-400 mb-1">
            Game Paused
          </div>
          <h2
            className="text-4xl font-black"
            style={{
              background: 'linear-gradient(180deg,#e0c0ff,#9060ff)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 0 12px rgba(150,80,255,0.6))',
            }}
          >
            ⏸ PAUSED
          </h2>
          <div className="text-[10px] text-zinc-500 mt-1">
            Press ESC to resume
          </div>
        </div>

        {/* Build summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
          <StatCard label="Room" value={`${summary.room} (${ZONE_LABELS[summary.zone].split(' ').slice(-1)[0]})`} color="text-amber-300" />
          <StatCard label="Wave" value={summary.wave} color="text-amber-200" />
          <StatCard label="HP" value={`${summary.hp}/${summary.maxHp}`} color="text-rose-300" />
          <StatCard label="Souls" value={summary.souls} color="text-purple-300" />
          <StatCard label="Wand Lv" value={summary.wandLevel} color="text-purple-200" />
          <StatCard label="Kills" value={summary.kills} color="text-zinc-200" />
          <StatCard label="Minions" value={`${summary.minions}/${summary.maxMinions}`} color="text-zinc-300" />
          <StatCard label="Wand" value={summary.wandType} color="text-zinc-300" />
        </div>

        {/* QOL: Extended combat stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
          <StatCard
            label="Time"
            value={`${Math.floor(summary.timeSurvived / 60)}:${Math.floor(summary.timeSurvived % 60).toString().padStart(2, '0')}`}
            color="text-cyan-300"
          />
          <StatCard label="Elites" value={summary.elitesKilled} color="text-amber-300" />
          <StatCard label="Max Combo" value={`${summary.maxCombo}x`} color="text-orange-300" />
          <StatCard label="DMG Dealt" value={summary.damageDealt.toLocaleString()} color="text-green-300" />
          <StatCard label="DMG Taken" value={summary.damageTaken.toLocaleString()} color="text-rose-300" />
        </div>

        {/* Skills */}
        {summary.skills.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
              Powers ({summary.skills.length})
            </div>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto bg-zinc-950/50 border border-zinc-800 p-2 rounded-sm">
              {summary.skills.map((sk) => (
                <span
                  key={sk}
                  title={SKILL_NAMES[sk] ?? sk}
                  className="text-[10px] bg-zinc-900 border border-purple-800 text-purple-200 px-2 py-0.5 rounded-sm"
                >
                  {SKILL_NAMES[sk] ?? sk}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Relics */}
        {summary.relics.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
              Cursed Relics ({summary.relics.length})
            </div>
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto bg-zinc-950/50 border border-amber-900/50 p-2 rounded-sm">
              {summary.relics.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 text-xs bg-zinc-900/60 border border-amber-800/50 px-2 py-1 rounded-sm"
                >
                  <span className="text-lg">{r.icon}</span>
                  <span className="font-bold text-amber-200">{r.name}</span>
                  <span className="text-zinc-400 text-[10px]">{r.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={onResume}
            className="w-full py-3 text-sm font-bold tracking-widest bg-gradient-to-b from-purple-700 to-purple-900 border-2 border-purple-400 text-white rounded-sm hover:from-purple-600 hover:to-purple-800 transition-all shadow-[0_0_20px_rgba(150,80,255,0.4)]"
          >
            ▶ RESUME (ESC)
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onRestart}
              className="py-2.5 text-xs font-bold tracking-widest border-2 border-zinc-600 text-zinc-300 bg-zinc-900/60 rounded-sm hover:border-amber-500 hover:text-amber-300 transition-all"
            >
              ↻ RESTART RUN <span className="text-[10px] ml-1 opacity-70">[R]</span>
            </button>
            <button
              onClick={onReturnToMenu}
              className="py-2.5 text-xs font-bold tracking-widest border-2 border-zinc-600 text-zinc-300 bg-zinc-900/60 rounded-sm hover:border-rose-500 hover:text-rose-300 transition-all"
            >
              ⚱ QUIT TO MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-zinc-950/60 border border-zinc-800 p-2 rounded-sm text-center">
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
    </div>
  );
}
