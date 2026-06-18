'use client';

import type { HudSnapshot } from '@/lib/game/types';

interface Props {
  snapshot: HudSnapshot;
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
};

function AutoCooldownBar({
  label,
  value,
  max,
  color,
  auto = true,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  auto?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, 1 - value / max) : 1;
  const ready = value <= 0;
  return (
    <div className="flex items-center gap-1 text-[10px]">
      <span className="w-16 text-right text-zinc-400">{label}</span>
      <div className="relative w-20 h-3 bg-zinc-900 border border-zinc-700 rounded-sm overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full transition-all"
          style={{
            width: `${pct * 100}%`,
            background: ready ? color : '#3a3a3a',
            boxShadow: ready ? `0 0 6px ${color}` : 'none',
          }}
        />
        {auto && (
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-zinc-500">
            AUTO
          </span>
        )}
      </div>
    </div>
  );
}

export function HUD({ snapshot: s }: Props) {
  const hpPct = (s.hp / s.maxHp) * 100;
  const lowHp = s.hp / s.maxHp < 0.3;
  const soulPct = (s.soulMeter / s.soulMeterMax) * 100;
  return (
    <div className="absolute inset-0 pointer-events-none font-mono text-white">
      {/* ===== TOP LEFT: health, soul meter, souls ===== */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        {/* Health */}
        <div className="flex items-center gap-2">
          <span className="text-rose-400 text-xs">HP</span>
          <div className="relative w-56 h-5 bg-zinc-900/80 border border-rose-900 rounded-sm overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full transition-all"
              style={{
                width: `${hpPct}%`,
                background: lowHp
                  ? 'linear-gradient(90deg,#ff2040,#ff6080)'
                  : 'linear-gradient(90deg,#a02040,#e04060)',
                boxShadow: lowHp ? '0 0 10px #ff4060' : 'none',
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold drop-shadow">
              {s.hp} / {s.maxHp}
            </span>
          </div>
        </div>
        {/* Soul Meter (NEW) */}
        <div className="flex items-center gap-2">
          <span className="text-fuchsia-400 text-xs">✺</span>
          <div className="relative w-56 h-4 bg-zinc-900/80 border border-fuchsia-900 rounded-sm overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full transition-all"
              style={{
                width: `${soulPct}%`,
                background:
                  soulPct >= 100
                    ? 'linear-gradient(90deg,#ff40ff,#ffffff)'
                    : 'linear-gradient(90deg,#6020a0,#c060ff)',
                boxShadow:
                  soulPct >= 80
                    ? '0 0 10px rgba(192,96,255,0.8)'
                    : 'none',
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold drop-shadow">
              {soulPct >= 100 ? 'SOUL NOVA IMMINENT' : `Soul ${Math.floor(soulPct)}%`}
            </span>
          </div>
        </div>
        {/* Souls + Wand + Minions */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 bg-zinc-900/80 border border-purple-900 px-2 py-1 rounded-sm">
            <span className="text-purple-300">✦</span>
            <span className="text-purple-100 font-bold">{s.souls}</span>
            <span className="text-zinc-500 text-[10px]">souls</span>
          </div>
          <div className="flex items-center gap-1 bg-zinc-900/80 border border-purple-900 px-2 py-1 rounded-sm">
            <span className="text-purple-300">🪄</span>
            <span className="text-purple-100 font-bold">Lv {s.wandLevel}</span>
            <span className="text-zinc-500 text-[10px]">{s.wandType}</span>
          </div>
          <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-700 px-2 py-1 rounded-sm">
            <span className="text-zinc-300">☠</span>
            <span className="text-zinc-100 font-bold">
              {s.minions}/{s.maxMinions}
            </span>
          </div>
        </div>
      </div>

      {/* ===== TOP RIGHT: room info ===== */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 items-end text-xs">
        <div className="bg-zinc-900/80 border border-zinc-700 px-3 py-1 rounded-sm">
          <span className="text-zinc-500">Room </span>
          <span className="text-amber-300 font-bold">{s.room.roomNumber}</span>
          {s.room.isBoss ? (
            <span className="ml-2 text-rose-400 font-bold animate-pulse">
              ⚠ BOSS
            </span>
          ) : (
            <span className="ml-2 text-zinc-400">
              Wave {s.room.waveNumber}/{s.room.totalWaves}
            </span>
          )}
        </div>
        {!s.room.isBoss && (
          <div className="bg-zinc-900/80 border border-zinc-700 px-3 py-1 rounded-sm text-[10px]">
            <span className="text-zinc-500">Enemies: </span>
            <span className="text-rose-300 font-bold">
              {s.room.enemiesRemaining}
            </span>
          </div>
        )}
        <div className="bg-zinc-900/80 border border-zinc-700 px-3 py-1 rounded-sm text-[10px]">
          <span className="text-zinc-500">Kills: </span>
          <span className="text-purple-200 font-bold">{s.kills}</span>
        </div>
      </div>

      {/* ===== TOP CENTER: boss bar ===== */}
      {s.room.isBoss && s.room.bossHp !== undefined && s.room.bossMaxHp && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="text-rose-400 text-sm font-bold mb-1 drop-shadow tracking-widest">
            {s.room.bossName}
          </div>
          <div className="relative w-96 h-5 bg-zinc-900/90 border-2 border-rose-700 rounded-sm overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full transition-all"
              style={{
                width: `${(s.room.bossHp / s.room.bossMaxHp) * 100}%`,
                background: 'linear-gradient(90deg,#600020,#ff2040,#ff8080)',
                boxShadow: '0 0 12px #ff4060',
              }}
            />
          </div>
        </div>
      )}

      {/* ===== BOTTOM LEFT: auto-cast ability cooldowns ===== */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1 bg-zinc-950/60 border border-zinc-800 p-2 rounded-sm">
        <div className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wider flex items-center gap-1">
          <span className="text-fuchsia-400">⚙</span> Auto Abilities
        </div>
        {s.skills.includes('phantom_dash') && (
          <AutoCooldownBar
            label="Phantom"
            value={s.cooldowns.dash}
            max={s.cooldowns.dashMax}
            color="#b58cff"
          />
        )}
        {s.skills.includes('grave_call') && (
          <AutoCooldownBar
            label="Grave Call"
            value={s.cooldowns.graveCall}
            max={s.cooldowns.graveCallMax}
            color="#c8c0a8"
          />
        )}
        {s.skills.includes('army_of_dead') && (
          <AutoCooldownBar
            label="Army"
            value={s.cooldowns.army}
            max={s.cooldowns.armyMax}
            color="#a0ffa0"
          />
        )}
        {s.skills.includes('death_ray') && (
          <AutoCooldownBar
            label="Death Ray"
            value={s.cooldowns.deathRay}
            max={s.cooldowns.deathRayMax}
            color="#ff4080"
          />
        )}
        {s.skills.includes('lich_form') && (
          <AutoCooldownBar
            label="Lich Form"
            value={s.cooldowns.lich}
            max={s.cooldowns.lichMax}
            color="#ff60c0"
          />
        )}
        {!s.skills.includes('phantom_dash') &&
          !s.skills.includes('grave_call') &&
          !s.skills.includes('army_of_dead') &&
          !s.skills.includes('death_ray') &&
          !s.skills.includes('lich_form') && (
            <div className="text-[10px] text-zinc-600 italic">
              Unlock auto-abilities via upgrades
            </div>
          )}
        {/* Active ultimates indicator */}
        {s.ultimatesActive.army > 0 && (
          <div className="text-[10px] text-green-400 animate-pulse">
            ☠ ARMY ACTIVE {s.ultimatesActive.army.toFixed(1)}s
          </div>
        )}
        {s.ultimatesActive.deathRay > 0 && (
          <div className="text-[10px] text-pink-400 animate-pulse">
            ☠ DEATH RAY {s.ultimatesActive.deathRay.toFixed(1)}s
          </div>
        )}
        {s.ultimatesActive.lich > 0 && (
          <div className="text-[10px] text-fuchsia-400 animate-pulse">
            ☠ LICH FORM {s.ultimatesActive.lich.toFixed(1)}s
          </div>
        )}
      </div>

      {/* ===== BOTTOM RIGHT: passive skills + relics ===== */}
      <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
        {s.relics.length > 0 && (
          <div className="flex gap-1 bg-zinc-950/60 border border-amber-900/50 p-1.5 rounded-sm">
            {s.relics.map((r) => (
              <div
                key={r.id}
                title={`${r.name}`}
                className="w-7 h-7 flex items-center justify-center bg-zinc-900 border border-amber-700 rounded-sm text-base"
              >
                {r.icon}
              </div>
            ))}
          </div>
        )}
        {s.skills.length > 0 && (
          <div className="max-w-[320px] flex flex-wrap gap-1 justify-end bg-zinc-950/60 border border-zinc-800 p-1.5 rounded-sm">
            {s.skills.map((sk) => (
              <span
                key={sk}
                title={SKILL_NAMES[sk] ?? sk}
                className="text-[9px] bg-zinc-900 border border-purple-800 text-purple-200 px-1.5 py-0.5 rounded-sm"
              >
                {SKILL_NAMES[sk] ?? sk}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ===== CONTROLS HINT ===== */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-zinc-600 font-mono">
        WASD / Arrows — Move · Wand auto-fires · All abilities auto-cast
      </div>
    </div>
  );
}
