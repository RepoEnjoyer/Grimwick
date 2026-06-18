// ===== Core game types =====

export type GamePhase =
  | 'menu'
  | 'playing'
  | 'upgrade'
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
  | 'bonebeast';

export type BossKind = 'bell_knight' | 'twins' | 'sun_priest' | 'bone_dragon';

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

  // bookkeeping
  lastFireTime: number;
  iframes: number;
  skills: Set<string>;
  kills: number;
  soulsCollected: number; // this run
  wandType: string;
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
  kind: 'bolt' | 'skull' | 'holy' | 'knife' | 'familiar' | 'beam' | 'deathray' | 'sunbeam' | 'homing' | 'splitter' | 'soul_nova';
  dotChance?: number;
  dotDamage?: number;
  color: string;
  homing?: boolean;
  target?: number; // enemy id
  splitterLevel?: number; // bolts split on hit
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
  damage: number;
  speed: number;
  radius: number;
  life: number;
  attackCooldown: number;
  attackInterval: number;
  kind: 'skeleton' | 'servant' | 'crawler' | 'familiar' | 'army' | 'beast' | 'wraith';
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
  kind: 'normal' | 'heal';
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
  kind: 'spark' | 'bone' | 'soul' | 'smoke' | 'magic';
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

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  vy: number;
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
  };
  ultimatesActive: {
    army: number;
    deathRay: number;
    lich: number;
  };
  room: RoomSnapshot;
}
