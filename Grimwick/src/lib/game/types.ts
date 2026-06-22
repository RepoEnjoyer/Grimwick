// ===== Core game types =====

export type GamePhase =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'upgrade'
  | 'chest'
  | 'dead'
  | 'crypt';

export type BuildPath = 'necromancy' | 'wand' | 'survival' | 'generic';

export type EnemyKind =
  | 'knight'
  | 'priest'
  | 'robber'
  | 'slime'
  | 'ghost'
  | 'gargoyle'
  | 'mage'
  | 'paladin'
  | 'cultist'
  | 'banshee'
  | 'bonebeast'
  // ===== VOID STAGE (Stage 2) enemies =====
  | 'void_horror' // floating eye that teleports and fires void bolts
  | 'void_wraith' // phasing ghost that ignores walls
  | 'void_leviathan' // huge tanky serpent with multi-shot
  | 'void_reaper'; // fast scythe-wielder with lifesteal

export type BossKind =
  | 'bell_knight'
  | 'twins'
  | 'sun_priest'
  | 'bone_dragon'
  | 'wraith_queen'
  | 'bone_colossus'
  // ===== VOID & ABYSS BOSSES =====
  | 'void_reaper_king' // Stage 2 mid-boss: teleporting scythe flurry
  | 'void_leviathan' // Stage 2 final: multi-phase sea serpent
  | 'lich_king'; // Stage 3 final: boss rush + ultimate lich

// Stage identifiers for thematic progression
export type Stage = 'crypt' | 'void' | 'abyss';

// Elite enemy affixes — champions spawn with 1-2 of these modifiers
export type EliteAffix =
  | 'swift' // +60% move/attack speed
  | 'colossal' // +200% HP, +50% size, -30% speed
  | 'volatile' // explodes on death (AoE damage)
  | 'vampiric' // heals on hit, drops 2x souls
  | 'splitter' // spawns 2 smaller versions on death
  | 'resurrective' // revives once at 50% HP
  | 'ethereal' // 30% chance to phase through attacks
  | 'vengeful' // gains enrage speed boost at low HP; +30% damage
  | 'toxic' // leaves poison trail; applies DoT on hit
  | 'shielded'; // has a regenerating damage shield

export interface Vec2 {
  x: number;
  y: number;
}

// ===== Player =====
export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  facing: number; // radians
  radius: number;

  // wand
  wandLevel: number;
  fireRate: number; // shots per second
  damage: number;
  projectileSpeed: number;
  projectileCount: number;
  pierce: number;
  chainCount: number;
  projectileSpread: number; // radians
  dotChance: number; // soul burn
  dotDamage: number;
  beamActive: boolean; // grave beam
  skullMissileLevel: number;
  cursedBarrageLevel: number;
  homingSoulLevel: number; // new: homing soul projectiles
  volatileBonesLevel: number; // new: minions explode on death
  splitterBoltLevel: number; // new: bolts split on hit
  // ===== NEW WAND POWERS =====
  chainLightningLevel: number; // wand shots arc lightning
  frostBoltLevel: number; // hits slow enemies
  critChance: number; // % chance for crit
  critMult: number; // crit damage multiplier
  executeThreshold: number; // instant-kill enemies below this HP fraction
  ricochetLevel: number; // bounces off walls
  minionHpMult: number; // multiplier for minion HP (from Sturdy Bones)

  // soul
  soulPickupRange: number;
  soulGainMult: number;

  // minions
  minionDamage: number;
  minionDuration: number; // seconds, -1 = permanent
  raiseChance: number;
  maxMinions: number;
  boneServantActive: boolean;
  rottingFamiliarActive: boolean;
  graveCallLevel: number;
  graveCallAutoTimer: number; // auto-cast timer
  soulBinding: boolean;
  swarmKillCounter: number;
  swarmThreshold: number;
  commandActive: boolean;
  boneBeastActive: boolean; // new: tanky bone beast minion
  wraithActive: boolean; // new: fast flying wraith minion
  // ===== NEW NECROMANCY POWERS =====
  boneGolemActive: boolean; // huge tanky golem minion
  plagueBatsLevel: number; // number of plague bats
  necroticExplosionLevel: number; // corpses explode on death
  markOfDeathLevel: number; // chance to mark enemies for +50% dmg

  // survival
  soulDrainChance: number;
  soulDrainAmount: number;
  boneShieldCount: number;
  boneShieldTimer: number;
  boneShieldInterval: number;
  cursedGroundLevel: number;
  dashCooldown: number;
  dashTimer: number;
  dashCooldownTimer: number;
  phantomDashLevel: number;
  lastLaughActive: boolean;
  graveArmorActive: boolean;
  auraOfDecayLevel: number; // new: passive damage aura
  auraOfDecayTimer: number;
  vampiricAuraLevel: number; // new: passive lifesteal aura
  spiritWalkLevel: number; // new: passive dodge chance
  boneStormLevel: number; // new: bones orbit player damaging enemies
  // ===== NEW SURVIVAL POWERS =====
  soulLinkLevel: number; // % damage redirected to minions
  boneWallLevel: number; // periodically spawn bone walls
  boneWallTimer: number;
  ironBonesLevel: number; // flat damage reduction
  vampiricTouchLevel: number; // heal when enemies die near you

  // ultimates (all auto-triggered now)
  armyOfDeadTimer: number;
  armyOfDeadCooldown: number;
  deathRayTimer: number;
  deathRayCooldown: number;
  deathRayAutoTimer: number; // auto-cast timer
  lichFormTimer: number;
  lichFormCooldown: number;

  // soul meter (new) - fills as you collect souls, triggers Soul Nova when full
  soulMeter: number;
  soulMeterMax: number;

  // ===== NEW UNIQUE POWERS (all auto-triggered) =====
  blackHoleLevel: number;
  blackHoleTimer: number;
  meteorLevel: number;
  meteorTimer: number;
  timeWarpLevel: number; // periodic slow aura
  timeWarpTimer: number;
  timeWarpActive: number; // active slow timer
  earthquakeLevel: number;
  earthquakeTimer: number;
  // ===== BLESSED BY GOD =====
  blessedByGodLevel: number; // chance for enemies to drop golden chests

  // ===== COMBO SYSTEM =====
  comboCount: number; // current kill streak
  comboTimer: number; // seconds remaining before combo resets
  comboMax: number; // highest combo this run

  // ===== NEW COMBO SKILL FLAGS =====
  soulResonanceActive: boolean; // minions deal +50% dmg if 3+ minions
  frostbiteCurseActive: boolean; // frost slows also mark enemies
  chainReactionActive: boolean; // chain lightning bounces explode
  boneStormSurgeActive: boolean; // bone storm doubles if aura active
  vampiricHungerActive: boolean; // vampiric aura also heals minions
  soulBatteryOverloadActive: boolean; // soul nova triggers meteor
  graveEchoActive: boolean; // minion death chance to cast mini grave call
  phantomResonanceActive: boolean; // spirit walk gives 1s iframes
  critCascadeActive: boolean; // crits trigger chain lightning
  toxicSynergyActive: boolean; // marked enemies take 2x DoT
  shatteredBoneActive: boolean; // bone wall shatters into shards on expire
  soulConduitActive: boolean; // every 5th soul pickup triggers mini nova
  bloodlustActive: boolean; // combo milestones enrage minions temporarily
  arcaneAmplifierActive: boolean; // wands fire 1 extra shot when souls full
  temporalEchoActive: boolean; // time warp also slows enemy projectiles
  necroticBloomActive: boolean; // necrotic explosion chains if kills enemy

  // bookkeeping
  lastFireTime: number;
  iframes: number;
  skills: Set<string>;
  kills: number;
  soulsCollected: number; // this run
  wandType: string;
  skin: string; // active skin id (e.g. 'default', 'golden_lich', 'void_walker')
}

// ===== SKIN DEFINITIONS =====
export interface SkinDef {
  id: string;
  name: string;
  description: string;
  // color palette
  boneColor: string;
  robeColor: string;
  robeTrim: string;
  eyeColor: string;
  wandTipColor: string;
  // unlock requirement
  unlockHint: string;
  // special VFX flag
  auraColor?: string;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  life: number;
  pierceLeft: number;
  chainLeft: number;
  hitSet: Set<number>;
  fromPlayer: boolean;
  kind: 'bolt' | 'skull' | 'holy' | 'knife' | 'familiar' | 'beam' | 'deathray' | 'sunbeam' | 'homing' | 'splitter' | 'soul_nova' | 'meteor' | 'soulbomb' | 'lightning';
  dotChance?: number;
  dotDamage?: number;
  color: string;
  homing?: boolean;
  target?: number; // enemy id
  splitterLevel?: number; // bolts split on hit
  frostLevel?: number; // applies slow on hit
  chainLightningLevel?: number; // arcs lightning on hit
  isCrit?: boolean;
  ricochetLeft?: number; // bounces remaining
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  radius: number;
  attackCooldown: number;
  attackInterval: number;
  hitFlash: number;
  dotTimer: number;
  dotDamage: number;
  phaseTimer: number; // for ghost phase in/out
  phaseActive: boolean;
  shielded: boolean;
  shieldHp: number;
  slowTimer: number; // frost/time warp slow effect
  slowMult: number; // multiplier when slowed (0.5 = half speed)
  markedTimer: number; // marked for death (takes bonus damage)
  // ===== ELITE FIELDS =====
  isElite: boolean;
  eliteAffixes: EliteAffix[];
  eliteShieldHp: number; // for shielded affix
  eliteShieldMax: number;
  eliteShieldRegenTimer: number; // delay before shield regenerates
  resurrectedOnce: boolean; // for resurrective affix
  poisonTrailTimer: number; // for toxic affix
  enraged: boolean; // for vengeful affix
  baseSpeed: number; // for enrage calculations
  baseDamage: number; // for enrage calculations
  isBoss?: boolean;
  bossKind?: BossKind;
  bossPhase?: number;
  bossAttackTimer?: number;
  bossSpecialTimer?: number;
  // for twins
  siblingId?: number;
  spawnTimer?: number;
  color: string;
  soulValue: number;
}

export interface Minion {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  radius: number;
  life: number;
  attackCooldown: number;
  attackInterval: number;
  kind: 'skeleton' | 'servant' | 'crawler' | 'familiar' | 'army' | 'beast' | 'wraith' | 'golem' | 'bat';
  target?: number;
  shootCooldown?: number;
  isFamiliar?: boolean;
  phaseTimer?: number;
}

export interface Soul {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  kind: 'normal' | 'heal' | 'chest';
  life: number;
  collected: boolean;
  magnetized: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  kind: 'spark' | 'bone' | 'soul' | 'smoke' | 'magic' | 'lightning' | 'frost' | 'meteor_trail';
}

export interface CursedGroundCircle {
  x: number;
  y: number;
  radius: number;
  damage: number;
  life: number;
  tickInterval: number;
  tickTimer: number;
  hitSet: Set<number>;
}

// ===== New entity types for unique powers =====
export interface BlackHole {
  x: number;
  y: number;
  radius: number;
  pullRadius: number;
  damage: number;
  life: number;
  maxLife: number;
  tickInterval: number;
  tickTimer: number;
}

export interface BoneWall {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  life: number;
  angle: number; // orientation
}

export interface Meteor {
  x: number; // current x
  y: number; // current y
  targetX: number;
  targetY: number;
  startY: number;
  damage: number;
  radius: number;
  life: number; // time until impact
  exploded: boolean;
}

export interface LightningArc {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  vy: number;
  size?: number; // font size in px
  bold?: boolean;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  path: BuildPath;
  rarity: 'common' | 'rare' | 'epic';
  apply: (p: Player) => void;
  requires?: (p: Player) => boolean;
  icon: string; // emoji or short text label
}

export interface Relic {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic';
  apply: (p: Player) => void;
  icon: string;
}

export interface PermanentProgress {
  soulShards: number;
  totalSouls: number;
  runsCompleted: number;
  bossesDefeated: number;
  highestRoom: number;
  unlockedWandTypes: string[];
  unlockedSkins: string[];
  unlockedZones: string[];
  // permanent stat upgrades (each level adds effect)
  upgrades: {
    startHealth: number;
    wandPower: number;
    soulGain: number;
    minionPower: number;
    relicLuck: number;
    moveSpeed: number;
    // ===== NEW PERMANENT UPGRADES =====
    startingSouls: number; // begin each run with bonus souls
    iframeDuration: number; // longer invuln after taking a hit
    pickupRange: number; // larger soul pickup radius
    critChance: number; // base crit chance %
    fireRate: number; // base wand fire rate
    projectileSpeed: number; // faster wand bolts
    extraLife: number; // revives per run
    eliteSoulBonus: number; // +bonus souls from elites
    startingRelic: number; // chance to start with a random relic
    soulMeterSize: number; // smaller soul meter (faster novas)
    // ===== STAGE 2 UNLOCKS (locked until Void zone is unlocked) =====
    stage2Damage: number; // +5% all damage per level
    stage2Health: number; // +30 max HP per level
    stage2EliteResist: number; // -10% damage from elites per level
    stage2SoulMult: number; // +20% soul gain per level
  };
  // ===== NECROMINION: offline soul farming system =====
  necrominion: {
    lastCollectedAt: number; // timestamp (ms) of last collection
    storedSouls: number; // souls waiting to be collected
    upgradeLevels: {
      generationRate: number; // souls per hour generated (base 10)
      storageCap: number; // max stored souls (base 100)
      conversionEfficiency: number; // % conversion to soul shards (base 50%)
      autoCollect: number; // auto-collect threshold (0 = manual, levels increase auto %)
    };
  };
}

export interface RoomSnapshot {
  roomNumber: number;
  waveNumber: number;
  totalWaves: number;
  enemiesRemaining: number;
  isBoss: boolean;
  bossName?: string;
  bossHp?: number;
  bossMaxHp?: number;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  souls: number;
  wandLevel: number;
  wandType: string;
  minions: number;
  maxMinions: number;
  kills: number;
  skills: string[];
  relics: { id: string; name: string; icon: string }[];
  // soul meter (new)
  soulMeter: number;
  soulMeterMax: number;
  // combo system (internal — no UI bar, but Bloodlust combo skill triggers on milestones)
  comboCount: number;
  comboTimer: number;
  comboMax: number;
  // elites slain this run
  elitesKilled: number;
  // ===== QOL FIELDS =====
  timeSurvived: number; // seconds since run start
  damageTaken: number; // total damage taken this run
  damageDealt: number; // total damage dealt this run
  buildPaths: {
    necromancy: number;
    wand: number;
    survival: number;
    generic: number;
  };
  // Stage info
  stage: 'crypt' | 'void' | 'abyss';
  stageName: string;
  stageColor: string;
  targetId: number | null; // current wand target enemy id (for target indicator)
  targetX: number; // target enemy x
  targetY: number; // target enemy y
  bossSpecialTelegraph: {
    name: string;
    timer: number; // seconds until special fires
  } | null;
  cooldowns: {
    dash: number;
    dashMax: number;
    army: number;
    armyMax: number;
    deathRay: number;
    deathRayMax: number;
    lich: number;
    lichMax: number;
    boneShield: number;
    boneShieldMax: number;
    graveCall: number;
    graveCallMax: number;
    blackHole: number;
    blackHoleMax: number;
    meteor: number;
    meteorMax: number;
    timeWarp: number;
    timeWarpMax: number;
    earthquake: number;
    earthquakeMax: number;
    boneWall: number;
    boneWallMax: number;
  };
  ultimatesActive: {
    army: number;
    deathRay: number;
    lich: number;
  };
  room: RoomSnapshot;
}
