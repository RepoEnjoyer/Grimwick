// Core game engine: state, loop, update, spawning, combat, AI
import {
  BOSS_ROOM_SCHEDULE,
  BOSS_TEMPLATES,
  ELITE_AFFIXES,
  ENEMY_TEMPLATES,
  RELICS,
  STAGE_NAMES,
  UPGRADES,
  countSkillsInPath,
  createStartingPlayer,
  enemyDamageScale,
  enemyHpScale,
  generateWave,
  getStage,
  rollEliteAffixes,
  wavesPerRoom,
} from './content';
import type {
  BlackHole,
  BoneWall,
  BossKind,
  BuildPath,
  CursedGroundCircle,
  EliteAffix,
  Enemy,
  EnemyKind,
  FloatingText,
  GamePhase,
  HudSnapshot,
  LightningArc,
  Meteor,
  Minion,
  Particle,
  Player,
  Projectile,
  Relic,
  RoomSnapshot,
  Soul,
  Upgrade,
} from './types';
import { drawGame } from './render';

export interface EngineCallbacks {
  onPhaseChange: (phase: GamePhase) => void;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onUpgradeChoices: (choices: Upgrade[]) => void;
  onRelicChoices: (relics: Relic[]) => void;
  onChestChoices: (choices: Upgrade[]) => void;
  onDeath: (result: {
    soulsCollected: number;
    roomsCleared: number;
    bossesDefeated: number;
    reachedVictory: boolean;
    timeSurvived: number;
    damageTaken: number;
    damageDealt: number;
    kills: number;
    elitesKilled: number;
    maxCombo: number;
    skillsCount: number;
    zoneCleared: 'crypt' | 'void' | 'abyss' | null;
    nextZoneUnlocked: 'crypt' | 'void' | 'abyss' | null;
    isTrueVictory: boolean;
  }) => void;
  onVictory?: () => void;
}

export const GAME_W = 1280;
export const GAME_H = 720;

interface SpawnAnim {
  x: number;
  y: number;
  t: number;
  kind: EnemyKind;
  isBoss?: boolean;
  bossKind?: BossKind;
  siblingId?: number;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cb: EngineCallbacks;

  phase: GamePhase = 'menu';
  player: Player;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  enemyProjectiles: Projectile[] = [];
  minions: Minion[] = [];
  souls: Soul[] = [];
  particles: Particle[] = [];
  cursedGrounds: CursedGroundCircle[] = [];
  floatingTexts: FloatingText[] = [];
  relics: Relic[] = [];
  pendingSpawns: SpawnAnim[] = [];
  // NEW entity arrays for unique powers
  blackHoles: BlackHole[] = [];
  boneWalls: BoneWall[] = [];
  meteors: Meteor[] = [];
  lightningArcs: LightningArc[] = [];

  // room state
  roomNumber = 0; // local room number within current zone (1-based after first room)
  waveNumber = 0;
  totalWavesThisRoom = 0;
  betweenWaves = 0; // delay timer
  roomCleared = false;
  // ===== ZONE SYSTEM =====
  currentZone: 'crypt' | 'void' | 'abyss' = 'crypt';
  // Room offset per zone — used for difficulty scaling & boss schedule lookup
  // Crypt: rooms 1-16 (offset 0)
  // Void: rooms 1-8 (offset 16, internal 17-24)
  // Abyss: rooms 1-2+ (offset 24, internal 25-26+)
  static ZONE_ROOM_OFFSET: Record<'crypt' | 'void' | 'abyss', number> = {
    crypt: 0,
    void: 16,
    abyss: 24,
  };
  // Get the global room number (used for boss schedule, enemy scaling, etc.)
  get globalRoomNumber(): number {
    return this.roomNumber + GameEngine.ZONE_ROOM_OFFSET[this.currentZone];
  }
  upgradeChoices: Upgrade[] = [];
  relicChoices: Relic[] = [];
  chestChoices: Upgrade[] = [];
  pendingRelicChoice = false;
  pendingChestChoice = false;
  rerollsUsed = 0;
  currentBoss: Enemy | null = null;

  // input
  keys: Set<string> = new Set();
  mouseX = 0;
  mouseY = 0;

  // timing
  lastTime = 0;
  animationId = 0;
  gameTime = 0;
  bossSpecialTimer = 0;

  // misc
  nextEnemyId = 1;
  nextMinionId = 1;
  shotCounter = 0;
  boneServantSpawned = false;
  rottingFamiliarSpawned = false;
  boneShieldOrbs = 0;
  boneShieldRecharge = 0;
  grantedBoneShieldOrbs = 0;
  cursedGroundSpawnTimer = 0;
  // NEW minion spawn flags
  boneGolemSpawned = false;
  batsSpawned = 0;
  // NEW elite/combo tracking
  elitesKilled = 0;
  eliteSpawnCounter = 0; // increments per spawn; elites every N spawns
  soulConduitCounter = 0; // counts soul pickups for Soul Conduit combo
  bloodlustTimer = 0; // Bloodlust combo: enraged minions timer
  // ===== QOL TRACKING =====
  damageTaken = 0; // total damage taken this run
  damageDealt = 0; // total damage dealt this run
  currentTargetId: number | null = null; // current wand target enemy id

  permanentBonuses: {
    healthBonus: number;
    wandPowerBonus: number;
    soulGainBonus: number;
    minionPowerBonus: number;
    moveSpeedBonus: number;
    relicLuck: number;
    wandType: string;
    // NEW bonuses
    startingSouls: number;
    iframeBonus: number;
    pickupRangeBonus: number;
    critChanceBonus: number;
    fireRateBonus: number;
    projectileSpeedBonus: number;
    extraLives: number;
    eliteSoulBonus: number;
    startingRelicChance: number;
    soulMeterReduction: number;
    // Stage 2 upgrades
    stage2Damage: number;
    stage2Health: number;
    stage2EliteResist: number;
    stage2SoulMult: number;
  };

  extraLivesRemaining = 0; // runtime counter for extra lives

  constructor(
    canvas: HTMLCanvasElement,
    cb: EngineCallbacks,
    permanentBonuses: {
      healthBonus: number;
      wandPowerBonus: number;
      soulGainBonus: number;
      minionPowerBonus: number;
      moveSpeedBonus: number;
      relicLuck: number;
      wandType: string;
      startingSouls: number;
      iframeBonus: number;
      pickupRangeBonus: number;
      critChanceBonus: number;
      fireRateBonus: number;
      projectileSpeedBonus: number;
      extraLives: number;
      eliteSoulBonus: number;
      startingRelicChance: number;
      soulMeterReduction: number;
      stage2Damage: number;
      stage2Health: number;
      stage2EliteResist: number;
      stage2SoulMult: number;
    },
    startingZone: 'crypt' | 'void' | 'abyss' = 'crypt'
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
    this.cb = cb;
    this.permanentBonuses = permanentBonuses;
    this.player = createStartingPlayer(permanentBonuses);
  }

  // ---------------- lifecycle ----------------
  startRun() {
    this.player = createStartingPlayer(this.permanentBonuses);
    this.player.x = GAME_W / 2;
    this.player.y = GAME_H / 2;
    // Apply starting souls bonus
    this.player.soulsCollected = (this.permanentBonuses.startingSouls ?? 0) * 15;
    // Apply extra lives
    this.extraLivesRemaining = this.permanentBonuses.extraLives ?? 0;
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.minions = [];
    this.souls = [];
    this.particles = [];
    this.cursedGrounds = [];
    this.floatingTexts = [];
    this.relics = [];
    // Apply starting relic chance (Heirloom permanent upgrade) — AFTER relics reset
    const relicChance = (this.permanentBonuses.startingRelicChance ?? 0) * 0.2;
    if (Math.random() < relicChance) {
      const pool = RELICS.filter((r) => !this.relics.find((x) => x.id === r.id));
      if (pool.length > 0) {
        const r = pool[Math.floor(Math.random() * pool.length)];
        this.relics.push(r);
        r.apply(this.player);
      }
    }
    this.pendingSpawns = [];
    this.blackHoles = [];
    this.boneWalls = [];
    this.meteors = [];
    this.lightningArcs = [];
    this.roomNumber = 0; // local zone room number, reset to 0 (becomes 1 after startNextRoom)
    this.waveNumber = 0;
    // Announce zone at run start
    const zoneInfo = STAGE_NAMES[this.currentZone];
    this.spawnFloatingText(GAME_W / 2, GAME_H / 2 - 100, zoneInfo.name, zoneInfo.color);
    this.spawnFloatingText(GAME_W / 2, GAME_H / 2 - 60, zoneInfo.subtitle, zoneInfo.color);
    this.spawnParticles(GAME_W / 2, GAME_H / 2, 40, zoneInfo.color, 'magic', 1.2);
    this.boneServantSpawned = false;
    this.rottingFamiliarSpawned = false;
    this.boneBeastSpawned = false;
    this.wraithSpawned = false;
    this.boneGolemSpawned = false;
    this.batsSpawned = 0;
    this.boneShieldOrbs = this.player.boneShieldCount;
    this.grantedBoneShieldOrbs = this.player.boneShieldCount;
    this.boneShieldRecharge = 0;
    this.cursedGroundSpawnTimer = 0;
    this.currentBoss = null;
    this.shotCounter = 0;
    this.elitesKilled = 0;
    this.eliteSpawnCounter = 0;
    this.soulConduitCounter = 0;
    this.bloodlustTimer = 0;
    this.damageTaken = 0;
    this.damageDealt = 0;
    this.currentTargetId = null;
    this.gameTime = 0;
    this.setPhase('playing');
    this.startNextRoom();
    this.emitHud();
  }

  start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    cancelAnimationFrame(this.animationId);
  }

  setPhase(p: GamePhase) {
    this.phase = p;
    this.cb.onPhaseChange(p);
  }

  // Pause controls (called from React UI)
  pause() {
    if (this.phase === 'playing') this.setPhase('paused');
  }
  resume() {
    if (this.phase === 'paused') this.setPhase('playing');
  }
  returnToMenu() {
    this.setPhase('menu');
  }

  // Get build summary for pause menu
  getBuildSummary() {
    const p = this.player;
    return {
      hp: Math.max(0, Math.round(p.hp)),
      maxHp: Math.round(p.maxHp),
      souls: p.soulsCollected,
      wandLevel: p.wandLevel,
      wandType: p.wandType,
      kills: p.kills,
      minions: this.minions.length,
      maxMinions: p.maxMinions,
      room: this.roomNumber, // local zone room number
      zone: this.currentZone, // current zone
      wave: `${this.waveNumber}/${this.totalWavesThisRoom}`,
      skills: Array.from(p.skills),
      relics: this.relics.map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        description: r.description,
      })),
      // QOL: extra stats for pause menu
      timeSurvived: this.gameTime,
      damageTaken: Math.round(this.damageTaken),
      damageDealt: Math.round(this.damageDealt),
      elitesKilled: this.elitesKilled,
      maxCombo: p.comboMax,
    };
  }

  // ---------------- input ----------------
  handleKeyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    // ESC toggles pause (works in playing or paused)
    if (k === 'escape') {
      e.preventDefault();
      if (this.phase === 'playing') {
        this.setPhase('paused');
      } else if (this.phase === 'paused') {
        this.setPhase('playing');
      }
      return;
    }
    this.keys.add(k);
    // All abilities are now auto-triggered — no manual keys
    if (this.phase !== 'playing') return;
    if (k === ' ') {
      e.preventDefault(); // prevent page scroll
    }
  }

  handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase());
  }

  // ---------------- main loop ----------------
  loop = (time: number) => {
    this.animationId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    if (this.phase === 'playing') {
      this.update(dt);
    }
    drawGame(this);
    if (this.phase === 'playing') {
      // throttle HUD updates to ~5/sec to avoid React thrash (was 10/sec — too frequent for late game)
      if (Math.floor(time / 200) !== Math.floor((time - dt * 1000) / 200)) {
        this.emitHud();
      }
    }
  };

  // ---------------- update ----------------
  update(dt: number) {
    this.gameTime += dt;
    this.updatePlayer(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateMinions(dt);
    this.updateSouls(dt);
    this.updateCursedGrounds(dt);
    this.updateBlackHoles(dt);
    this.updateBoneWalls(dt);
    this.updateMeteors(dt);
    this.updateLightningArcs(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.updateSpawns(dt);
    this.updateWaves(dt);
    this.updateBoss(dt);
  }

  // ---------------- player ----------------
  updatePlayer(dt: number) {
    const p = this.player;
    let dx = 0;
    let dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
      p.facing = Math.atan2(dy, dx);
    }

    let speedMult = 1;
    if (p.lichFormTimer > 0) speedMult *= 1.3;
    if (p.dashTimer > 0) {
      speedMult *= 2.6;
      p.iframes = Math.max(p.iframes, 0.05);
    }

    p.vx = dx * p.speed * speedMult;
    p.vy = dy * p.speed * speedMult;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = Math.max(p.radius, Math.min(GAME_W - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(GAME_H - p.radius, p.y));

    if (p.iframes > 0) p.iframes -= dt;
    if (p.dashTimer > 0) p.dashTimer -= dt;
    if (p.dashCooldownTimer > 0) p.dashCooldownTimer -= dt;

    // combo timer countdown (internal — no UI bar)
    if (p.comboTimer > 0) {
      p.comboTimer -= dt;
      if (p.comboTimer <= 0) {
        p.comboCount = 0;
        p.comboTimer = 0;
      }
    }
    // bloodlust timer countdown
    if (this.bloodlustTimer > 0) this.bloodlustTimer -= dt;

    // ultimates countdown
    if (p.armyOfDeadTimer > 0) p.armyOfDeadTimer -= dt;
    if (p.armyOfDeadCooldown > 0) p.armyOfDeadCooldown -= dt;
    if (p.deathRayTimer > 0) p.deathRayTimer -= dt;
    if (p.deathRayCooldown > 0) p.deathRayCooldown -= dt;
    if (p.lichFormTimer > 0) {
      p.lichFormTimer -= dt;
      if (p.lichFormTimer <= 0) {
        // revert lich form
        p.fireRate /= 1.5;
        p.damage /= 1.4;
        p.soulDrainChance /= 2;
      }
    }
    if (p.lichFormCooldown > 0) p.lichFormCooldown -= dt;

    // auto-fire wand
    const interval = 1 / p.fireRate;
    if (this.gameTime - p.lastFireTime >= interval) {
      this.fireWand();
      p.lastFireTime = this.gameTime;
    }

    // bone shield: grant immediate orbs when count increases (upgrade picked)
    if (p.boneShieldCount > this.grantedBoneShieldOrbs) {
      const diff = p.boneShieldCount - this.grantedBoneShieldOrbs;
      this.grantedBoneShieldOrbs = p.boneShieldCount;
      this.boneShieldOrbs = Math.min(
        p.boneShieldCount,
        this.boneShieldOrbs + diff
      );
    }
    // bone shield recharge
    if (p.boneShieldCount > 0) {
      this.boneShieldRecharge += dt;
      if (this.boneShieldRecharge >= p.boneShieldInterval) {
        this.boneShieldRecharge = 0;
        this.boneShieldOrbs = Math.min(
          p.boneShieldCount,
          this.boneShieldOrbs + 1
        );
      }
    }

    // cursed ground spawn
    if (p.cursedGroundLevel > 0) {
      this.cursedGroundSpawnTimer += dt;
      const intervalCg = Math.max(2, 6 - p.cursedGroundLevel);
      if (this.cursedGroundSpawnTimer >= intervalCg) {
        this.cursedGroundSpawnTimer = 0;
        this.spawnCursedGround(p.x, p.y);
      }
    }

    // summon bone servant (respawn if dead)
    if (
      p.boneServantActive &&
      !this.minions.some((m) => m.kind === 'servant')
    ) {
      this.spawnMinion('servant', p.x, p.y, -1);
    }
    if (
      p.rottingFamiliarActive &&
      !this.minions.some((m) => m.kind === 'familiar')
    ) {
      this.spawnMinion('familiar', p.x, p.y, -1);
    }

    // swarm trigger
    if (p.swarmThreshold < 999 && p.swarmKillCounter >= p.swarmThreshold) {
      p.swarmKillCounter = 0;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        this.spawnMinion(
          'crawler',
          p.x + Math.cos(ang) * 40,
          p.y + Math.sin(ang) * 40,
          6
        );
      }
    }

    // army of the dead spawn cadence
    if (p.armyOfDeadTimer > 0) {
      // spawn minions periodically while active
      if (Math.floor(this.gameTime * 4) % 2 === 0) {
        if (this.minions.filter((m) => m.kind === 'army').length < 10) {
          const ang = Math.random() * Math.PI * 2;
          const dist = 80 + Math.random() * 60;
          this.spawnMinion(
            'army',
            p.x + Math.cos(ang) * dist,
            p.y + Math.sin(ang) * dist,
            p.armyOfDeadTimer
          );
        }
      }
    }

    // death ray: while active, spawn beam projectiles continuously
    if (p.deathRayTimer > 0) {
      if (Math.floor(this.gameTime * 20) % 2 === 0) {
        this.spawnDeathRayShot();
      }
    }

    // ===== AUTO-TRIGGERED ABILITIES (Vampire Survivors style) =====

    // 1. Phantom Dash — auto-dash when enemy is too close
    if (p.phantomDashLevel > 0 && p.dashCooldownTimer <= 0) {
      const closeEnemy = this.enemies.find(
        (e) =>
          Math.hypot(e.x - p.x, e.y - p.y) < 60 &&
          !(e.kind === 'ghost' && !e.phaseActive)
      );
      if (closeEnemy) {
        // dash away from the closest enemy
        const ang = Math.atan2(p.y - closeEnemy.y, p.x - closeEnemy.x);
        p.facing = ang;
        this.tryDash();
      }
    }

    // 2. Grave Call — auto-cast every 12s
    if (p.graveCallLevel > 0) {
      p.graveCallAutoTimer += dt;
      if (p.graveCallAutoTimer >= 12) {
        p.graveCallAutoTimer = 0;
        this.castGraveCall();
      }
    }

    // 3. Army of the Dead — auto-trigger when 8+ enemies nearby
    if (p.skills.has('army_of_dead') && p.armyOfDeadCooldown <= 0) {
      const nearby = this.enemies.filter(
        (e) => Math.hypot(e.x - p.x, e.y - p.y) < 350
      ).length;
      if (nearby >= 8) {
        this.castArmyOfDead();
      }
    }

    // 4. Death Ray — auto-fire every 25s when enemies exist
    if (
      p.skills.has('death_ray') &&
      p.deathRayCooldown <= 0 &&
      this.enemies.length > 0
    ) {
      p.deathRayAutoTimer += dt;
      if (p.deathRayAutoTimer >= 25) {
        p.deathRayAutoTimer = 0;
        this.castDeathRay();
      }
    }

    // 5. Lich Form — auto-trigger when HP < 35%
    if (
      p.skills.has('lich_form') &&
      p.lichFormCooldown <= 0 &&
      p.hp / p.maxHp < 0.35 &&
      this.enemies.length > 0
    ) {
      this.castLichForm();
    }

    // 6. Aura of Decay — passive damage aura
    if (p.auraOfDecayLevel > 0) {
      p.auraOfDecayTimer += dt;
      if (p.auraOfDecayTimer >= 0.4) {
        p.auraOfDecayTimer = 0;
        const auraRadius = 80 + p.auraOfDecayLevel * 30;
        const auraDmg = p.damage * 0.3 * p.auraOfDecayLevel;
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < auraRadius + e.radius) {
            this.damageEnemy(e, auraDmg, null);
          }
        }
      }
    }

    // 7. Bone Storm — orbiting bones
    if (p.boneStormLevel > 0) {
      const boneCount = 2 + p.boneStormLevel * 2;
      const orbitRadius = 60 + p.boneStormLevel * 10;
      for (let i = 0; i < boneCount; i++) {
        const ang = this.gameTime * 3 + (i / boneCount) * Math.PI * 2;
        const bx = p.x + Math.cos(ang) * orbitRadius;
        const by = p.y + Math.sin(ang) * orbitRadius;
        // damage enemies in bone's path
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - bx, e.y - by);
          if (d < e.radius + 8) {
            // tick damage every 0.2s per bone via cooldown
            this.damageEnemy(e, p.damage * 0.5 * dt * 10, null);
          }
        }
      }
    }

    // 8. Summon bone beast & wraith (respawn if dead)
    if (
      p.boneBeastActive &&
      !this.minions.some((m) => m.kind === 'beast')
    ) {
      this.spawnMinion('beast', p.x + 30, p.y, -1);
    }
    if (
      p.wraithActive &&
      !this.minions.some((m) => m.kind === 'wraith')
    ) {
      this.spawnMinion('wraith', p.x - 30, p.y, -1);
    }
    // NEW: Summon bone golem (respawn if dead)
    if (
      p.boneGolemActive &&
      !this.minions.some((m) => m.kind === 'golem')
    ) {
      this.spawnMinion('golem', p.x, p.y + 30, -1);
    }
    // NEW: Summon plague bats (persistent, count tracked)
    if (p.plagueBatsLevel > 0) {
      const desiredBats = p.plagueBatsLevel * 3;
      const currentBats = this.minions.filter((m) => m.kind === 'bat').length;
      if (currentBats < desiredBats) {
        // spawn missing bats
        for (let i = currentBats; i < desiredBats; i++) {
          const ang = Math.random() * Math.PI * 2;
          this.spawnMinion(
            'bat',
            p.x + Math.cos(ang) * 50,
            p.y + Math.sin(ang) * 50,
            -1
          );
        }
      }
    }

    // 9. Soul Meter — auto-triggers Soul Nova when full
    if (p.soulMeter >= p.soulMeterMax) {
      this.triggerSoulNova();
    }

    // ===== NEW UNIQUE POWERS (auto-triggered) =====

    // Black Hole — every 15s, spawn singularity at player position
    if (p.blackHoleLevel > 0) {
      p.blackHoleTimer += dt;
      if (p.blackHoleTimer >= 15) {
        p.blackHoleTimer = 0;
        this.spawnBlackHole();
      }
    }

    // Meteor Strike — every 5s, drop meteor on random enemy
    if (p.meteorLevel > 0) {
      p.meteorTimer += dt;
      if (p.meteorTimer >= 5) {
        p.meteorTimer = 0;
        this.spawnMeteor();
      }
    }

    // Time Warp — every 18s, slow all enemies for 4s
    if (p.timeWarpLevel > 0) {
      p.timeWarpTimer += dt;
      if (p.timeWarpActive > 0) {
        p.timeWarpActive -= dt;
      }
      if (p.timeWarpTimer >= 18) {
        p.timeWarpTimer = 0;
        p.timeWarpActive = 4;
        for (const e of this.enemies) {
          e.slowTimer = 4;
          e.slowMult = 0.4;
        }
        this.spawnFloatingText(p.x, p.y - 40, 'TIME WARP!', '#80c0ff');
        this.spawnParticles(p.x, p.y, 30, '#80c0ff', 'frost', 1);
      }
    }

    // Earthquake — every 12s, shockwave damages + knocks back all enemies
    if (p.earthquakeLevel > 0) {
      p.earthquakeTimer += dt;
      if (p.earthquakeTimer >= 12) {
        p.earthquakeTimer = 0;
        this.triggerEarthquake();
      }
    }

    // Bone Wall — every 8s, raise bone barriers around player
    if (p.boneWallLevel > 0) {
      p.boneWallTimer += dt;
      if (p.boneWallTimer >= 8) {
        p.boneWallTimer = 0;
        this.spawnBoneWalls();
      }
    }
  }

  boneBeastSpawned = false;
  wraithSpawned = false;

  // Cast abilities (renamed from tryXxx)
  castGraveCall() {
    const p = this.player;
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      this.spawnMinion(
        'skeleton',
        p.x + Math.cos(ang) * 50,
        p.y + Math.sin(ang) * 50,
        p.minionDuration
      );
    }
    this.spawnParticles(p.x, p.y, 20, '#c8c0a8', 'bone', 0.6);
  }

  // COMBO: Grave Echo — mini grave call (1 skeleton at location)
  castMiniGraveCall(x: number, y: number) {
    if (
      this.minions.filter((m) => m.kind === 'skeleton' || m.kind === 'crawler').length <
      this.player.maxMinions
    ) {
      this.spawnMinion('skeleton', x, y, this.player.minionDuration * 0.6);
      this.spawnParticles(x, y, 8, '#c8c0a8', 'bone', 0.4);
      this.spawnFloatingText(x, y - 20, 'ECHO!', '#b58cff');
    }
  }

  castArmyOfDead() {
    const p = this.player;
    p.armyOfDeadTimer = 8;
    p.armyOfDeadCooldown = 40;
    this.spawnFloatingText(p.x, p.y - 40, 'ARMY OF THE DEAD!', '#b58cff');
  }

  castDeathRay() {
    const p = this.player;
    p.deathRayTimer = 2;
    p.deathRayCooldown = 25;
    this.spawnFloatingText(p.x, p.y - 40, 'DEATH RAY!', '#ff4080');
  }

  castLichForm() {
    const p = this.player;
    p.lichFormTimer = 8;
    p.lichFormCooldown = 45;
    p.fireRate *= 1.5;
    p.damage *= 1.4;
    if (p.soulDrainChance > 0) p.soulDrainChance *= 2;
    this.spawnFloatingText(p.x, p.y - 40, 'LICH FORM!', '#ff60c0');
    this.spawnParticles(p.x, p.y, 30, '#ff60c0', 'magic', 1);
  }

  triggerSoulNova() {
    const p = this.player;
    p.soulMeter = 0;
    const novaDmg = p.damage * (p.skills.has('soul_battery') ? 9 : 6);
    // damage all enemies in a huge radius
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 400) {
        this.damageEnemy(e, novaDmg, null);
      }
    }
    // visual: ring of soul particles
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * 500,
        vy: Math.sin(a) * 500,
        life: 0.8,
        maxLife: 0.8,
        radius: 6,
        color: '#b58cff',
        kind: 'soul',
      });
    }
    this.spawnFloatingText(p.x, p.y - 40, 'SOUL NOVA!', '#b58cff');
    // brief iframes
    p.iframes = Math.max(p.iframes, 0.5);
    // Twin Souls: trigger a 2nd nova at 50% damage after a short delay
    if (p.skills.has('twin_souls')) {
      setTimeout(() => {
        if (this.phase !== 'playing') return;
        const novaDmg2 = p.damage * (p.skills.has('soul_battery') ? 4.5 : 3);
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < 350) {
            this.damageEnemy(e, novaDmg2, null);
          }
        }
        for (let i = 0; i < 40; i++) {
          const a = (i / 40) * Math.PI * 2;
          this.particles.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * 400,
            vy: Math.sin(a) * 400,
            life: 0.6,
            maxLife: 0.6,
            radius: 5,
            color: '#ff80ff',
            kind: 'soul',
          });
        }
        this.spawnFloatingText(p.x, p.y - 40, 'TWIN SOULS!', '#ff80ff');
      }, 300);
    }
    // COMBO: Soul Battery Overload — also trigger meteor storm on all enemies
    if (p.soulBatteryOverloadActive) {
      const meteorCount = Math.min(8, Math.max(3, Math.floor(this.enemies.length / 2)));
      const targets = [...this.enemies]
        .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))
        .slice(0, meteorCount);
      for (const t of targets) {
        this.meteors.push({
          x: t.x,
          y: t.y - 400,
          targetX: t.x,
          targetY: t.y,
          startY: t.y - 400,
          damage: p.damage * 4,
          radius: 60,
          life: 0.5,
          exploded: false,
        });
      }
      this.spawnFloatingText(p.x, p.y - 60, 'METEOR STORM!', '#ff8040');
    }
  }

  // ===== NEW UNIQUE POWER METHODS =====
  spawnBlackHole() {
    const p = this.player;
    // Spawn at nearest enemy or random offset
    const target = this.findNearestEnemy(p.x, p.y, 400);
    let x = p.x + (Math.random() - 0.5) * 200;
    let y = p.y + (Math.random() - 0.5) * 200;
    if (target) {
      x = target.x;
      y = target.y;
    }
    const lvl = p.blackHoleLevel;
    this.blackHoles.push({
      x,
      y,
      radius: 20 + lvl * 5,
      pullRadius: 140 + lvl * 30,
      damage: p.damage * 0.4 * lvl,
      life: 4 + lvl * 0.5,
      maxLife: 4 + lvl * 0.5,
      tickInterval: 0.3,
      tickTimer: 0,
    });
    this.spawnFloatingText(x, y - 30, 'BLACK HOLE!', '#a040ff');
    this.spawnParticles(x, y, 20, '#a040ff', 'magic', 0.8);
  }

  spawnMeteor() {
    const p = this.player;
    // pick a random enemy as target, fall back to player position
    let targetX = p.x;
    let targetY = p.y;
    if (this.enemies.length > 0) {
      const e = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      targetX = e.x;
      targetY = e.y;
    }
    const lvl = p.meteorLevel;
    this.meteors.push({
      x: targetX,
      y: targetY - 400,
      targetX,
      targetY,
      startY: targetY - 400,
      damage: p.damage * 3 * lvl,
      radius: 18 + lvl * 4,
      life: 0.8,
      exploded: false,
    });
  }

  triggerEarthquake() {
    const p = this.player;
    const lvl = p.earthquakeLevel;
    const dmg = p.damage * 1.5 * lvl;
    for (const e of this.enemies) {
      this.damageEnemy(e, dmg, null);
      // knockback
      const ang = Math.atan2(e.y - p.y, e.x - p.x);
      e.x += Math.cos(ang) * 60;
      e.y += Math.sin(ang) * 60;
      // also stun briefly
      e.slowTimer = 1;
      e.slowMult = 0.3;
    }
    // visual shockwave
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * 400,
        vy: Math.sin(a) * 400,
        life: 0.7,
        maxLife: 0.7,
        radius: 4,
        color: '#a08060',
        kind: 'spark',
      });
    }
    this.spawnFloatingText(p.x, p.y - 40, 'EARTHQUAKE!', '#a08060');
  }

  spawnBoneWalls() {
    const p = this.player;
    const lvl = p.boneWallLevel;
    const count = 3 + lvl;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 80 + Math.random() * 40;
      this.boneWalls.push({
        x: p.x + Math.cos(ang) * dist,
        y: p.y + Math.sin(ang) * dist,
        hp: 50 + lvl * 30,
        maxHp: 50 + lvl * 30,
        radius: 20,
        life: 10 + lvl * 2,
        angle: ang,
      });
    }
    this.spawnParticles(p.x, p.y, 15, '#e8e0d0', 'bone', 0.6);
  }

  // ===== NEW MINION AI: Golem and Bat =====
  // (handled in updateMinions via kind check)

  fireWand() {
    const p = this.player;
    // QOL: Smart targeting — prefer boss, then elite, then nearest
    const target = this.findSmartTarget(p.x, p.y);
    let angle = p.facing;
    if (target) {
      angle = Math.atan2(target.y - p.y, target.x - p.x);
      p.facing = angle;
      this.currentTargetId = target.id;
    } else {
      this.currentTargetId = null;
    }

    const burstCount = 1 + p.cursedBarrageLevel * 2;
    let dmgMult = 1;
    if (p.cursedBarrageLevel > 0) dmgMult = 0.7;

    let dmg = p.damage * dmgMult;
    if (p.lastLaughActive && p.hp / p.maxHp < 0.3) dmg *= 1.5;
    if (p.lichFormTimer > 0) dmg *= 1; // already applied
    // NEW: crit chance
    const isCrit = p.critChance > 0 && Math.random() < p.critChance;
    if (isCrit) {
      dmg *= p.critMult;
    }

    // every 4th shot is a skull missile
    this.shotCounter++;
    const isSkullShot =
      p.skullMissileLevel > 0 && this.shotCounter % 4 === 0;
    // every 5th shot is a homing soul (if unlocked)
    const isHomingShot =
      p.homingSoulLevel > 0 && this.shotCounter % (6 - p.homingSoulLevel) === 0;

    for (let b = 0; b < burstCount; b++) {
      const burstOffset = (b - (burstCount - 1) / 2) * 0.08;
      // COMBO: Arcane Amplifier — extra projectile when soul meter > 75%
      let projCount = p.projectileCount;
      if (p.arcaneAmplifierActive && p.soulMeter >= p.soulMeterMax * 0.75) {
        projCount += 1;
      }
      for (let i = 0; i < projCount; i++) {
        const spread =
          projCount > 1
            ? (i - (projCount - 1) / 2) * p.projectileSpread
            : 0;
        const a = angle + spread + burstOffset;
        const speed = p.projectileSpeed;
        if (isSkullShot) {
          this.spawnProjectile({
            x: p.x + Math.cos(angle) * 18,
            y: p.y + Math.sin(angle) * 18,
            vx: Math.cos(a) * speed * 0.6,
            vy: Math.sin(a) * speed * 0.6,
            damage: dmg * 2.2,
            radius: 10,
            life: 8, // bullets die on wall hit, not by timer
            pierceLeft: 0,
            chainLeft: p.chainCount,
            fromPlayer: true,
            kind: 'skull',
            color: '#b58cff',
            dotChance: p.dotChance,
            dotDamage: p.dotDamage,
            homing: false,
            isCrit,
          });
        } else if (isHomingShot) {
          this.spawnProjectile({
            x: p.x + Math.cos(angle) * 18,
            y: p.y + Math.sin(angle) * 18,
            vx: Math.cos(a) * speed * 0.9,
            vy: Math.sin(a) * speed * 0.9,
            damage: dmg * 1.4,
            radius: 7,
            life: 8,
            pierceLeft: p.pierce,
            chainLeft: p.chainCount,
            fromPlayer: true,
            kind: 'homing',
            color: '#9affd0',
            dotChance: p.dotChance,
            dotDamage: p.dotDamage,
            homing: true,
            isCrit,
            frostLevel: p.frostBoltLevel,
            chainLightningLevel: p.chainLightningLevel,
          });
        } else {
          this.spawnProjectile({
            x: p.x + Math.cos(angle) * 18,
            y: p.y + Math.sin(angle) * 18,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            damage: dmg,
            radius: 6,
            life: 8, // bullets die on wall hit, not by timer
            pierceLeft: p.pierce,
            chainLeft: p.chainCount,
            fromPlayer: true,
            kind: 'bolt',
            color: this.wandColor(),
            dotChance: p.dotChance,
            dotDamage: p.dotDamage,
            splitterLevel: p.splitterBoltLevel,
            isCrit,
            frostLevel: p.frostBoltLevel,
            chainLightningLevel: p.chainLightningLevel,
            ricochetLeft: p.ricochetLevel,
          });
        }
      }
    }

    // Echo Wand relic: 40% chance to fire delayed extra shot
    if (p.skills.has('echo_wand') && Math.random() < 0.4) {
      setTimeout(() => {
        if (this.phase !== 'playing') return;
        this.spawnProjectile({
          x: p.x + Math.cos(angle) * 18,
          y: p.y + Math.sin(angle) * 18,
          vx: Math.cos(angle) * p.projectileSpeed,
          vy: Math.sin(angle) * p.projectileSpeed,
          damage: dmg * 0.7,
          radius: 6,
          life: 8,
          pierceLeft: p.pierce,
          chainLeft: p.chainCount,
          fromPlayer: true,
          kind: 'bolt',
          color: this.wandColor(),
          splitterLevel: 0,
        });
      }, 180);
    }

    // grave beam: occasional piercing beam
    if (p.beamActive && this.shotCounter % 6 === 0) {
      this.spawnProjectile({
        x: p.x + Math.cos(angle) * 20,
        y: p.y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * 900,
        vy: Math.sin(angle) * 900,
        damage: dmg * 1.5,
        radius: 14,
        life: 0.7,
        pierceLeft: 5,
        chainLeft: 0,
        fromPlayer: true,
        kind: 'beam',
        color: '#7a3acc',
      });
    }

    // wand tip particles
    this.spawnParticles(
      p.x + Math.cos(angle) * 18,
      p.y + Math.sin(angle) * 18,
      4,
      this.wandColor(),
      'magic',
      0.3
    );
  }

  wandColor(): string {
    const t = this.player.wandType;
    if (t === 'Grave Wand') return '#6affb5';
    if (t === 'Lich Wand') return '#ff6ab5';
    return '#b58cff';
  }

  spawnProjectile(p: Partial<Projectile> & {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    kind: Projectile['kind'];
    color: string;
  }) {
    // ===== PERFORMANCE: cap player projectiles to prevent lag from ricochet + multi-shot builds =====
    const MAX_PROJECTILES = 200;
    if (this.projectiles.length >= MAX_PROJECTILES) {
      // Remove oldest projectile
      this.projectiles.shift();
    }
    this.projectiles.push({
      radius: 6,
      life: 8, // longer lifetime — bullets die on wall hit, not by timer
      pierceLeft: 0,
      chainLeft: 0,
      hitSet: new Set<number>(),
      fromPlayer: true,
      ricochetLeft: 0,
      ...p,
    } as Projectile);
  }

  spawnEnemyProjectile(p: Partial<Projectile> & {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    kind: Projectile['kind'];
    color: string;
  }) {
    // ===== PERFORMANCE: cap enemy projectiles =====
    const MAX_ENEMY_PROJECTILES = 150;
    if (this.enemyProjectiles.length >= MAX_ENEMY_PROJECTILES) {
      this.enemyProjectiles.shift();
    }
    this.enemyProjectiles.push({
      radius: 6,
      life: 4,
      pierceLeft: 0,
      chainLeft: 0,
      hitSet: new Set<number>(),
      fromPlayer: false,
      ...p,
    } as Projectile);
  }

  // ---------------- projectiles ----------------
  updateProjectiles(dt: number) {
    // player projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      // homing: steer toward nearest enemy
      if (pr.homing) {
        const target = this.findNearestEnemy(pr.x, pr.y, 500, pr.hitSet);
        if (target) {
          const desiredAng = Math.atan2(target.y - pr.y, target.x - pr.x);
          const currentAng = Math.atan2(pr.vy, pr.vx);
          // smoothly turn
          let diff = desiredAng - currentAng;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = Math.max(-6 * dt, Math.min(6 * dt, diff));
          const newAng = currentAng + turn;
          const spd = Math.hypot(pr.vx, pr.vy);
          pr.vx = Math.cos(newAng) * spd;
          pr.vy = Math.sin(newAng) * spd;
        }
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;

      // ===== NEW WALL BEHAVIOR =====
      // Bullets travel until they hit a wall. If they have ricochet, they bounce.
      // If no ricochet left, they disappear on wall contact.
      // Special projectile kinds (beam, deathray, soul_nova, meteor) ignore walls.
      const passThroughWall =
        pr.kind === 'beam' ||
        pr.kind === 'deathray' ||
        pr.kind === 'soul_nova' ||
        pr.kind === 'meteor' ||
        pr.kind === 'soulbomb' ||
        pr.kind === 'lightning';

      if (!passThroughWall) {
        let hitWall = false;
        let wallNx = 0;
        let wallNy = 0;
        if (pr.x < pr.radius) {
          hitWall = true;
          wallNx = 1;
        } else if (pr.x > GAME_W - pr.radius) {
          hitWall = true;
          wallNx = -1;
        }
        if (pr.y < pr.radius) {
          hitWall = true;
          wallNy = 1;
        } else if (pr.y > GAME_H - pr.radius) {
          hitWall = true;
          wallNy = -1;
        }

        if (hitWall) {
          if (pr.ricochetLeft && pr.ricochetLeft > 0) {
            // BOUNCE: reflect velocity off wall normal
            if (wallNx !== 0) {
              pr.vx = Math.abs(pr.vx) * wallNx;
              pr.x = wallNx > 0 ? pr.radius : GAME_W - pr.radius;
            }
            if (wallNy !== 0) {
              pr.vy = Math.abs(pr.vy) * wallNy;
              pr.y = wallNy > 0 ? pr.radius : GAME_H - pr.radius;
            }
            pr.ricochetLeft--;
            // clear hit set so bounced projectile can hit same enemies again
            pr.hitSet.clear();
            this.spawnParticles(pr.x, pr.y, 4, pr.color, 'spark', 0.2);
          } else {
            // NO RICOCHET LEFT: destroy on wall hit
            this.spawnParticles(pr.x, pr.y, 3, pr.color, 'spark', 0.15);
            this.projectiles.splice(i, 1);
            continue;
          }
        }
      }

      // Safety cleanup: extremely old projectiles (shouldn't happen with wall logic)
      if (pr.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }
      // collision with enemies
      for (const e of this.enemies) {
        if (pr.hitSet.has(e.id)) continue;
        if (e.kind === 'ghost' && !e.phaseActive) continue; // ghosts phase
        const d = Math.hypot(e.x - pr.x, e.y - pr.y);
        if (d < e.radius + pr.radius) {
          this.damageEnemy(e, pr.damage, pr);
          pr.hitSet.add(e.id);
          // NEW: frost bolt — slow enemy on hit
          if (pr.frostLevel && pr.frostLevel > 0) {
            e.slowTimer = 2;
            e.slowMult = Math.min(e.slowMult, 0.5);
            if (Math.random() < 0.3) {
              this.spawnParticles(e.x, e.y, 1, '#a0d8ff', 'frost', 0.3);
            }
            // COMBO: Frostbite Curse — frost also marks enemies
            if (this.player.frostbiteCurseActive && e.markedTimer <= 0) {
              e.markedTimer = 3;
              this.spawnParticles(e.x, e.y, 5, '#7ad3ff', 'magic', 0.3);
            }
          }
          // NEW: chain lightning — arc to nearby enemies
          if (pr.chainLightningLevel && pr.chainLightningLevel > 0) {
            const arcCount = 1 + pr.chainLightningLevel;
            const arcHit = new Set<number>(pr.hitSet);
            let lastX = e.x;
            let lastY = e.y;
            for (let arc = 0; arc < arcCount; arc++) {
              const next = this.findNearestEnemy(lastX, lastY, 180, arcHit);
              if (!next) break;
              arcHit.add(next.id);
              // visual lightning arc
              this.lightningArcs.push({
                x1: lastX,
                y1: lastY,
                x2: next.x,
                y2: next.y,
                life: 0.2,
                maxLife: 0.2,
                color: '#a0e0ff',
              });
              this.damageEnemy(next, pr.damage * 0.6, null);
              // COMBO: Chain Reaction — each bounce explodes for AoE
              if (this.player.chainReactionActive) {
                this.spawnParticles(next.x, next.y, 8, '#ffe070', 'spark', 0.3);
                for (const expl of this.enemies) {
                  if (arcHit.has(expl.id)) continue;
                  const ed = Math.hypot(expl.x - next.x, expl.y - next.y);
                  if (ed < 60) {
                    this.damageEnemy(expl, pr.damage * 0.3, null);
                  }
                }
              }
              lastX = next.x;
              lastY = next.y;
            }
          }
          // NEW: crit visual
          if (pr.isCrit) {
            this.spawnFloatingText(e.x, e.y - 20, 'CRIT!', '#ffd040');
            this.spawnParticles(e.x, e.y, 8, '#ffd040', 'spark', 0.4);
            // COMBO: Crit Cascade — crits also fire a chain lightning bolt
            if (this.player.critCascadeActive) {
              const target = this.findNearestEnemy(e.x, e.y, 200, new Set([e.id]));
              if (target) {
                this.lightningArcs.push({
                  x1: e.x,
                  y1: e.y,
                  x2: target.x,
                  y2: target.y,
                  life: 0.2,
                  maxLife: 0.2,
                  color: '#ffe070',
                });
                this.damageEnemy(target, pr.damage * 0.8, null);
              }
            }
          }
          // NEW: execute — instant-kill low HP enemies
          if (
            this.player.executeThreshold > 0 &&
            !e.isBoss &&
            e.hp > 0 &&
            e.hp / e.maxHp <= this.player.executeThreshold
          ) {
            this.spawnFloatingText(e.x, e.y - 30, 'EXECUTE!', '#ff4060');
            this.spawnParticles(e.x, e.y, 12, '#ff4060', 'spark', 0.5);
            e.hp = 0;
            const idx = this.enemies.indexOf(e);
            if (idx >= 0) this.killEnemy(e, idx);
          }
          // chain
          if (pr.chainLeft > 0) {
            pr.chainLeft--;
            const next = this.findNearestEnemy(
              pr.x,
              pr.y,
              220,
              pr.hitSet
            );
            if (next) {
              const ang = Math.atan2(next.y - pr.y, next.x - pr.x);
              const spd = Math.hypot(pr.vx, pr.vy);
              pr.vx = Math.cos(ang) * spd;
              pr.vy = Math.sin(ang) * spd;
            }
          }
          if (pr.pierceLeft > 0) {
            pr.pierceLeft--;
          } else {
            this.spawnParticles(pr.x, pr.y, 6, pr.color, 'spark', 0.3);
            if (pr.kind === 'skull') {
              this.spawnExplosion(pr.x, pr.y, pr.damage * 0.6);
            }
            // splitter bolt: spawn 2 smaller bolts perpendicular
            if (pr.splitterLevel && pr.splitterLevel > 0) {
              const baseAng = Math.atan2(pr.vy, pr.vx);
              for (const off of [-0.5, 0.5]) {
                const a = baseAng + off;
                this.spawnProjectile({
                  x: pr.x,
                  y: pr.y,
                  vx: Math.cos(a) * 350,
                  vy: Math.sin(a) * 350,
                  damage: pr.damage * 0.4,
                  radius: 4,
                  life: 4, // splitter bolts die on wall hit
                  pierceLeft: 0,
                  chainLeft: 0,
                  fromPlayer: true,
                  kind: 'splitter',
                  color: pr.color,
                  splitterLevel: pr.splitterLevel - 1,
                });
              }
            }
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
    // enemy projectiles
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const pr = this.enemyProjectiles[i];
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      // Die on wall hit (no ricochet for enemy projectiles)
      if (
        pr.x < pr.radius ||
        pr.x > GAME_W - pr.radius ||
        pr.y < pr.radius ||
        pr.y > GAME_H - pr.radius ||
        pr.life <= 0
      ) {
        this.spawnParticles(pr.x, pr.y, 3, pr.color, 'spark', 0.15);
        this.enemyProjectiles.splice(i, 1);
        continue;
      }
      const p = this.player;
      if (p.iframes <= 0) {
        const d = Math.hypot(p.x - pr.x, p.y - pr.y);
        if (d < p.radius + pr.radius) {
          this.damagePlayer(pr.damage);
          this.enemyProjectiles.splice(i, 1);
        }
      }
    }
  }

  spawnExplosion(x: number, y: number, dmg: number) {
    this.spawnParticles(x, y, 12, '#b58cff', 'spark', 0.4);
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < 70) {
        this.damageEnemy(e, dmg, null);
      }
    }
  }

  // ---------------- enemies ----------------
  updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.dotTimer > 0) {
        e.dotTimer -= dt;
        // COMBO: Toxic Synergy — marked enemies take 2x DoT damage
        let dotDmg = e.dotDamage;
        if (this.player.toxicSynergyActive && e.markedTimer > 0) {
          dotDmg *= 2;
        }
        e.hp -= dotDmg * dt;
        if (Math.random() < 0.06) {
          this.spawnParticles(e.x, e.y, 1, '#7affa0', 'spark', 0.2);
        }
        if (e.hp <= 0) {
          this.killEnemy(e, i);
          continue;
        }
      }
      // NEW: slow effect countdown
      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        if (e.slowTimer <= 0) {
          e.slowMult = 1;
        }
      }
      // NEW: marked timer countdown
      if (e.markedTimer > 0) {
        e.markedTimer -= dt;
      }

      // phase for ghost
      if (e.kind === 'ghost') {
        e.phaseTimer -= dt;
        if (e.phaseTimer <= 0) {
          e.phaseActive = !e.phaseActive;
          e.phaseTimer = e.phaseActive ? 2.5 : 1.5;
        }
      }

      // AI per kind (note: slowMult is applied inside updateEnemyAI via e.speed * slowMult)
      this.updateEnemyAI(e, dt);

      // contact damage to player
      if (this.player.iframes <= 0) {
        const d = Math.hypot(this.player.x - e.x, this.player.y - e.y);
        if (d < e.radius + this.player.radius) {
          this.damagePlayer(e.damage, e);
          // knockback
          const ang = Math.atan2(e.y - this.player.y, e.x - this.player.x);
          e.x += Math.cos(ang) * 18;
          e.y += Math.sin(ang) * 18;
        }
      }

      // contact damage to minions
      for (const m of this.minions) {
        if (m.isFamiliar) continue;
        const d = Math.hypot(m.x - e.x, m.y - e.y);
        if (d < e.radius + m.radius) {
          if (m.attackCooldown <= 0) {
            this.damageEnemy(e, m.damage, null);
            // Vampiric Aura: minions heal player for % of damage
            if (this.player.vampiricAuraLevel > 0) {
              this.player.hp = Math.min(
                this.player.maxHp,
                this.player.hp + m.damage * 0.1 * this.player.vampiricAuraLevel
              );
            }
            m.attackCooldown = m.attackInterval;
          }
        }
      }
    }
  }

  updateEnemyAI(e: Enemy, dt: number) {
    const p = this.player;
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    const dist = Math.hypot(p.x - e.x, p.y - e.y);

    e.attackCooldown = Math.max(0, e.attackCooldown - dt);

    // All enemies now approach the player gradually.
    // Ranged enemies still fire but always close in (slower).
    switch (e.kind) {
      case 'knight': {
        e.vx = Math.cos(ang) * e.speed;
        e.vy = Math.sin(ang) * e.speed;
        break;
      }
      case 'robber': {
        // Approach player, throw knives while closing in
        // Slow down slightly at close range to circle, but never retreat
        const closeRange = 90;
        if (dist > closeRange) {
          e.vx = Math.cos(ang) * e.speed;
          e.vy = Math.sin(ang) * e.speed;
        } else {
          // circle around player at close range
          e.vx = Math.cos(ang + Math.PI / 2) * e.speed * 0.8;
          e.vy = Math.sin(ang + Math.PI / 2) * e.speed * 0.8;
        }
        if (e.attackCooldown <= 0 && dist < 420) {
          this.spawnEnemyProjectile({
            x: e.x,
            y: e.y,
            vx: Math.cos(ang) * 320,
            vy: Math.sin(ang) * 320,
            damage: e.damage,
            kind: 'knife',
            color: '#c8c0a0',
            radius: 4,
          });
          e.attackCooldown = e.attackInterval;
        }
        break;
      }
      case 'priest': {
        // Approach slowly while firing holy bolts — never retreat
        e.vx = Math.cos(ang) * e.speed * 0.6;
        e.vy = Math.sin(ang) * e.speed * 0.6;
        if (e.attackCooldown <= 0 && dist < 480) {
          this.spawnEnemyProjectile({
            x: e.x,
            y: e.y,
            vx: Math.cos(ang) * 240,
            vy: Math.sin(ang) * 240,
            damage: e.damage,
            kind: 'holy',
            color: '#fff0a0',
            radius: 6,
          });
          e.attackCooldown = e.attackInterval;
        }
        break;
      }
      case 'slime': {
        // hop toward player (slow)
        e.vx = Math.cos(ang) * e.speed;
        e.vy = Math.sin(ang) * e.speed;
        break;
      }
      case 'ghost': {
        // phase in/out, drift toward player only when phased in
        if (e.phaseActive) {
          e.vx = Math.cos(ang) * e.speed;
          e.vy = Math.sin(ang) * e.speed;
        } else {
          // still creep forward slowly even when phased out
          e.vx = Math.cos(ang) * e.speed * 0.3;
          e.vy = Math.sin(ang) * e.speed * 0.3;
        }
        break;
      }
      case 'gargoyle': {
        // periodically dive at player, then approach slowly
        e.phaseTimer -= dt;
        if (e.phaseTimer <= 0) {
          e.phaseTimer = 2.4;
          // dive: store velocity burst
          e.vx = Math.cos(ang) * e.speed * 4;
          e.vy = Math.sin(ang) * e.speed * 4;
        } else {
          // slow approach between dives
          e.vx = e.vx * 0.92 + Math.cos(ang) * e.speed * 0.3;
          e.vy = e.vy * 0.92 + Math.sin(ang) * e.speed * 0.3;
        }
        break;
      }
      case 'mage': {
        // Approach while firing wand bolts — never retreat
        e.vx = Math.cos(ang) * e.speed * 0.55;
        e.vy = Math.sin(ang) * e.speed * 0.55;
        if (e.attackCooldown <= 0 && dist < 460) {
          this.spawnEnemyProjectile({
            x: e.x,
            y: e.y,
            vx: Math.cos(ang) * 320,
            vy: Math.sin(ang) * 320,
            damage: e.damage,
            kind: 'bolt',
            color: '#c898ff',
            radius: 5,
          });
          e.attackCooldown = e.attackInterval;
        }
        break;
      }
      case 'paladin': {
        // walk toward player, shielded from front
        e.vx = Math.cos(ang) * e.speed;
        e.vy = Math.sin(ang) * e.speed;
        // shield blocks projectiles coming from front
        e.shielded = true;
        break;
      }
      case 'cultist': {
        // Fast approaching dagger-wielder, attacks at close range
        e.vx = Math.cos(ang) * e.speed;
        e.vy = Math.sin(ang) * e.speed;
        if (e.attackCooldown <= 0 && dist < 60) {
          // melee stab
          this.damagePlayer(e.damage, e);
          e.attackCooldown = e.attackInterval;
        }
        break;
      }
      case 'banshee': {
        // Fast circling screamer that fires sonic projectiles
        const closeRange = 180;
        if (dist > closeRange) {
          e.vx = Math.cos(ang) * e.speed;
          e.vy = Math.sin(ang) * e.speed;
        } else {
          // circle around player
          e.vx = Math.cos(ang + Math.PI / 2) * e.speed;
          e.vy = Math.sin(ang + Math.PI / 2) * e.speed;
        }
        if (e.attackCooldown <= 0) {
          // 3-way sonic scream
          for (let i = -1; i <= 1; i++) {
            const a = ang + i * 0.25;
            this.spawnEnemyProjectile({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 280,
              vy: Math.sin(a) * 280,
              damage: e.damage,
              kind: 'holy',
              color: '#a0c8ff',
              radius: 6,
            });
          }
          e.attackCooldown = e.attackInterval;
        }
        break;
      }
      case 'bonebeast': {
        // Heavy charger — periodically lunges at player
        e.phaseTimer -= dt;
        if (e.phaseTimer <= 0) {
          e.phaseTimer = 3.2;
          // lunge
          e.vx = Math.cos(ang) * e.speed * 3;
          e.vy = Math.sin(ang) * e.speed * 3;
        } else {
          // slow approach
          e.vx = Math.cos(ang) * e.speed;
          e.vy = Math.sin(ang) * e.speed;
        }
        break;
      }
      // ===== VOID STAGE ENEMIES =====
      case 'void_horror': {
        // Floating eye — approaches slowly, periodically teleports and fires 3 void bolts
        e.phaseTimer -= dt;
        if (e.phaseTimer <= 0) {
          // Teleport to random position near player
          e.phaseTimer = 4;
          const tpAng = Math.random() * Math.PI * 2;
          const tpDist = 200 + Math.random() * 150;
          const newX = Math.max(50, Math.min(GAME_W - 50, p.x + Math.cos(tpAng) * tpDist));
          const newY = Math.max(50, Math.min(GAME_H - 50, p.y + Math.sin(tpAng) * tpDist));
          this.spawnParticles(e.x, e.y, 14, '#a040ff', 'magic', 0.5);
          e.x = newX;
          e.y = newY;
          this.spawnParticles(e.x, e.y, 14, '#a040ff', 'magic', 0.5);
          // Fire 3 void bolts at player
          for (let i = -1; i <= 1; i++) {
            const a = ang + i * 0.3;
            this.spawnEnemyProjectile({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 280,
              vy: Math.sin(a) * 280,
              damage: e.damage,
              kind: 'holy',
              color: '#c080ff',
              radius: 7,
            });
          }
        }
        // Slow approach
        e.vx = Math.cos(ang) * e.speed * 0.6;
        e.vy = Math.sin(ang) * e.speed * 0.6;
        break;
      }
      case 'void_wraith': {
        // Phasing ghost — phases in/out, fast approach when visible
        e.phaseTimer -= dt;
        if (e.phaseTimer <= 0) {
          e.phaseActive = !e.phaseActive;
          e.phaseTimer = e.phaseActive ? 2 : 1.2;
        }
        if (e.phaseActive) {
          // Fast approach
          e.vx = Math.cos(ang) * e.speed;
          e.vy = Math.sin(ang) * e.speed;
        } else {
          // Slow drift even when phased
          e.vx = Math.cos(ang) * e.speed * 0.3;
          e.vy = Math.sin(ang) * e.speed * 0.3;
        }
        break;
      }
      case 'void_leviathan': {
        // Huge tanky serpent — slow approach, fires 5-way spread
        e.vx = Math.cos(ang) * e.speed;
        e.vy = Math.sin(ang) * e.speed;
        e.attackCooldown -= dt;
        if (e.attackCooldown <= 0) {
          e.attackCooldown = e.attackInterval;
          // 5-way spread shot
          for (let i = -2; i <= 2; i++) {
            const a = ang + i * 0.25;
            this.spawnEnemyProjectile({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 220,
              vy: Math.sin(a) * 220,
              damage: e.damage * 0.7,
              kind: 'knife',
              color: '#40c0a0',
              radius: 6,
            });
          }
        }
        break;
      }
      case 'void_reaper': {
        // Fast scythe-wielder — closes in quickly, lifesteal on hit (handled via vampiric elite)
        // Periodic dash attack
        e.phaseTimer -= dt;
        if (e.phaseTimer <= 0) {
          e.phaseTimer = 2.5;
          // Dash toward player
          e.vx = Math.cos(ang) * e.speed * 2.5;
          e.vy = Math.sin(ang) * e.speed * 2.5;
          this.spawnParticles(e.x, e.y, 6, '#ff40c0', 'magic', 0.3);
        } else {
          // Fast approach
          e.vx = Math.cos(ang) * e.speed;
          e.vy = Math.sin(ang) * e.speed;
        }
        break;
      }
    }

    if (e.isBoss) {
      this.updateBossAI(e, dt);
    }

    // NEW: apply slow effect to movement
    const slowM = e.slowTimer > 0 ? e.slowMult : 1;
    e.x += e.vx * dt * slowM;
    e.y += e.vy * dt * slowM;
    e.x = Math.max(e.radius, Math.min(GAME_W - e.radius, e.x));
    e.y = Math.max(e.radius, Math.min(GAME_H - e.radius, e.y));
  }

  updateBossAI(e: Enemy, dt: number) {
    const p = this.player;
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    const dist = Math.hypot(p.x - e.x, p.y - e.y);
    e.bossAttackTimer = (e.bossAttackTimer ?? 0) - dt;
    e.bossSpecialTimer = (e.bossSpecialTimer ?? 0) - dt;

    switch (e.bossKind) {
      case 'bell_knight': {
        // chase + bell hammer shockwaves
        e.vx = Math.cos(ang) * e.speed;
        e.vy = Math.sin(ang) * e.speed;
        if (e.bossSpecialTimer <= 0) {
          e.bossSpecialTimer = 3.5;
          // shockwave: ring of holy projectiles
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            this.spawnEnemyProjectile({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 240,
              vy: Math.sin(a) * 240,
              damage: e.damage * 0.7,
              kind: 'holy',
              color: '#fff0a0',
              radius: 7,
            });
          }
          this.spawnParticles(e.x, e.y, 24, '#fff0a0', 'spark', 0.5);
        }
        break;
      }
      case 'twins': {
        // digger throws cursed lanterns; partner spawns adds
        if (e.bossAttackTimer <= 0) {
          e.bossAttackTimer = 1.4;
          for (let i = -1; i <= 1; i++) {
            const a = ang + i * 0.25;
            this.spawnEnemyProjectile({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 220,
              vy: Math.sin(a) * 220,
              damage: e.damage,
              kind: 'knife',
              color: '#a8ff80',
              radius: 6,
            });
          }
        }
        if (e.bossSpecialTimer <= 0) {
          e.bossSpecialTimer = 6;
          // spawn adds
          for (let i = 0; i < 3; i++) {
            this.queueSpawn(e.x + (Math.random() - 0.5) * 60, e.y + (Math.random() - 0.5) * 60, 'robber');
          }
        }
        // approach player but circle at close range — never retreat
        if (dist > 180) {
          e.vx = Math.cos(ang) * e.speed;
          e.vy = Math.sin(ang) * e.speed;
        } else {
          // circle around player
          e.vx = Math.cos(ang + Math.PI / 2) * e.speed;
          e.vy = Math.sin(ang + Math.PI / 2) * e.speed;
        }
        break;
      }
      case 'sun_priest': {
        // sun beams + minion destruction — approach slowly, never retreat
        e.vx = Math.cos(ang) * e.speed * 0.5;
        e.vy = Math.sin(ang) * e.speed * 0.5;
        if (e.bossAttackTimer <= 0) {
          e.bossAttackTimer = 2.2;
          // 3 beams
          for (let i = -1; i <= 1; i++) {
            const a = ang + i * 0.35;
            this.spawnEnemyProjectile({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 320,
              vy: Math.sin(a) * 320,
              damage: e.damage,
              kind: 'sunbeam',
              color: '#ffd860',
              radius: 10,
            });
          }
        }
        if (e.bossSpecialTimer <= 0) {
          e.bossSpecialTimer = 7;
          // destroy minions, damage player slightly
          for (const m of this.minions) {
            if (!m.isFamiliar) {
              m.life = 0.1;
            }
          }
          this.spawnParticles(p.x, p.y, 20, '#ffd860', 'spark', 0.5);
          this.damagePlayer(8);
        }
        break;
      }
      case 'bone_dragon': {
        // sweeping bone breath
        e.vx = Math.cos(ang) * e.speed * 0.6;
        e.vy = Math.sin(ang) * e.speed * 0.6;
        if (e.bossAttackTimer <= 0) {
          e.bossAttackTimer = 1.6;
          // spread of bone shards
          for (let i = 0; i < 7; i++) {
            const a = ang + (i - 3) * 0.18;
            this.spawnEnemyProjectile({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 280,
              vy: Math.sin(a) * 280,
              damage: e.damage * 0.6,
              kind: 'knife',
              color: '#e8e0d0',
              radius: 5,
            });
          }
        }
        if (e.bossSpecialTimer <= 0) {
          e.bossSpecialTimer = 8;
          // spiral of bones
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            this.spawnEnemyProjectile({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 220,
              vy: Math.sin(a) * 220,
              damage: e.damage * 0.5,
              kind: 'knife',
              color: '#f0e8d0',
              radius: 5,
            });
          }
        }
        break;
      }
      case 'wraith_queen': {
        // Wraith Queen — fast circling, banshee screams, summons wisp adds
        if (dist > 220) {
          e.vx = Math.cos(ang) * e.speed;
          e.vy = Math.sin(ang) * e.speed;
        } else {
          // fast circle around player
          e.vx = Math.cos(ang + Math.PI / 2) * e.speed;
          e.vy = Math.sin(ang + Math.PI / 2) * e.speed;
        }
        // banshee scream — 3-way sonic projectile
        if (e.bossAttackTimer <= 0) {
          e.bossAttackTimer = 1.2;
          for (let i = -1; i <= 1; i++) {
            const a = ang + i * 0.4;
            this.spawnEnemyProjectile({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 280,
              vy: Math.sin(a) * 280,
              damage: e.damage * 0.7,
              kind: 'sunbeam',
              color: '#c4a0ff',
              radius: 8,
            });
          }
        }
        // special: teleport + summon wisp adds
        if (e.bossSpecialTimer <= 0) {
          e.bossSpecialTimer = 6;
          // teleport near player (offset)
          const tpAng = Math.random() * Math.PI * 2;
          e.x = p.x + Math.cos(tpAng) * 250;
          e.y = p.y + Math.sin(tpAng) * 250;
          e.x = Math.max(50, Math.min(GAME_W - 50, e.x));
          e.y = Math.max(50, Math.min(GAME_H - 50, e.y));
          this.spawnParticles(e.x, e.y, 20, '#c4a0ff', 'magic', 0.6);
          this.spawnFloatingText(e.x, e.y - 30, 'TELEPORT!', '#c4a0ff');
          // summon 3 ghost adds
          for (let i = 0; i < 3; i++) {
            this.queueSpawn(
              e.x + (Math.random() - 0.5) * 60,
              e.y + (Math.random() - 0.5) * 60,
              'ghost'
            );
          }
        }
        break;
      }
      case 'bone_colossus': {
        // Bone Colossus — slow tanky approach, stomps and bone shards
        e.vx = Math.cos(ang) * e.speed;
        e.vy = Math.sin(ang) * e.speed;
        // stomp: AoE shockwave
        if (e.bossAttackTimer <= 0) {
          e.bossAttackTimer = 2.5;
          // ring of bone shards
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            this.spawnEnemyProjectile({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 200,
              vy: Math.sin(a) * 200,
              damage: e.damage * 0.5,
              kind: 'knife',
              color: '#e0d8c0',
              radius: 6,
            });
          }
          // knockback player if close
          if (dist < 200) {
            const kb = 80;
            p.vx += Math.cos(ang) * kb * -1;
            p.vy += Math.sin(ang) * kb * -1;
            this.damagePlayer(e.damage * 0.5, e);
          }
          this.spawnParticles(e.x, e.y, 30, '#e0d8c0', 'spark', 0.6);
        }
        // special: summon bonebeast adds + heal slightly
        if (e.bossSpecialTimer <= 0) {
          e.bossSpecialTimer = 9;
          // summon 2 bonebeasts
          for (let i = 0; i < 2; i++) {
            this.queueSpawn(
              e.x + (Math.random() - 0.5) * 80,
              e.y + (Math.random() - 0.5) * 80,
              'bonebeast'
            );
          }
          // heal 5% HP
          const heal = e.maxHp * 0.05;
          e.hp = Math.min(e.maxHp, e.hp + heal);
          this.spawnFloatingText(e.x, e.y - 40, `+${Math.round(heal)}`, '#7affa0');
          this.spawnParticles(e.x, e.y, 14, '#7affa0', 'magic', 0.6);
        }
        // enrage at low HP (phase 2)
        if (e.hp < e.maxHp * 0.3 && (e.bossPhase ?? 1) < 2) {
          e.bossPhase = 2;
          e.speed = e.baseSpeed * 1.6;
          e.damage = e.baseDamage * 1.3;
          this.spawnFloatingText(e.x, e.y - 60, 'ENRAGED!', '#ff4040');
          this.spawnParticles(e.x, e.y, 30, '#ff4040', 'magic', 0.8);
        }
        break;
      }
      // ===== VOID & ABYSS BOSSES =====
      case 'void_reaper_king': {
        // Teleporting scythe flurry — circles player, teleports, fires scythe arcs
        if (dist > 250) {
          e.vx = Math.cos(ang) * e.speed;
          e.vy = Math.sin(ang) * e.speed;
        } else {
          // circle
          e.vx = Math.cos(ang + Math.PI / 2) * e.speed;
          e.vy = Math.sin(ang + Math.PI / 2) * e.speed;
        }
        // Scythe arc attack — 5-way spread
        if (e.bossAttackTimer <= 0) {
          e.bossAttackTimer = 1.0;
          for (let i = -2; i <= 2; i++) {
            const a = ang + i * 0.2;
            this.spawnEnemyProjectile({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 320,
              vy: Math.sin(a) * 320,
              damage: e.damage * 0.6,
              kind: 'knife',
              color: '#ff40c0',
              radius: 7,
            });
          }
        }
        // Special: teleport + ring of 16 scythes
        if (e.bossSpecialTimer <= 0) {
          e.bossSpecialTimer = 5;
          // Teleport near player
          const tpAng = Math.random() * Math.PI * 2;
          e.x = Math.max(50, Math.min(GAME_W - 50, p.x + Math.cos(tpAng) * 250));
          e.y = Math.max(50, Math.min(GAME_H - 50, p.y + Math.sin(tpAng) * 250));
          this.spawnParticles(e.x, e.y, 24, '#a040ff', 'magic', 0.6);
          this.spawnFloatingText(e.x, e.y - 30, 'TELEPORT!', '#a040ff');
          // Ring of 16 scythes
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            this.spawnEnemyProjectile({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 260,
              vy: Math.sin(a) * 260,
              damage: e.damage * 0.5,
              kind: 'knife',
              color: '#ff40c0',
              radius: 6,
            });
          }
        }
        break;
      }
      case 'void_leviathan': {
        // Multi-phase sea serpent — slow approach, multi-phase attacks
        e.vx = Math.cos(ang) * e.speed * 0.7;
        e.vy = Math.sin(ang) * e.speed * 0.7;
        const phase = e.bossPhase ?? 1;
        // Phase 1 (100%-66% HP): 5-way spread
        // Phase 2 (66%-33% HP): 9-way spread + summon void wraiths
        // Phase 3 (33%-0% HP): spiral pattern + enrage
        if (e.bossAttackTimer <= 0) {
          if (phase === 1) {
            e.bossAttackTimer = 1.4;
            for (let i = -2; i <= 2; i++) {
              const a = ang + i * 0.25;
              this.spawnEnemyProjectile({
                x: e.x,
                y: e.y,
                vx: Math.cos(a) * 240,
                vy: Math.sin(a) * 240,
                damage: e.damage * 0.6,
                kind: 'knife',
                color: '#40c0a0',
                radius: 7,
              });
            }
          } else if (phase === 2) {
            e.bossAttackTimer = 1.2;
            for (let i = -4; i <= 4; i++) {
              const a = ang + i * 0.15;
              this.spawnEnemyProjectile({
                x: e.x,
                y: e.y,
                vx: Math.cos(a) * 240,
                vy: Math.sin(a) * 240,
                damage: e.damage * 0.5,
                kind: 'knife',
                color: '#40c0a0',
                radius: 6,
              });
            }
          } else {
            // Phase 3: spiral
            e.bossAttackTimer = 0.3;
            const spiralAng = this.gameTime * 4;
            for (let i = 0; i < 3; i++) {
              const a = spiralAng + (i / 3) * Math.PI * 2;
              this.spawnEnemyProjectile({
                x: e.x,
                y: e.y,
                vx: Math.cos(a) * 220,
                vy: Math.sin(a) * 220,
                damage: e.damage * 0.5,
                kind: 'knife',
                color: '#40ffc0',
                radius: 6,
              });
            }
          }
        }
        // Special: summon void wraiths + transition phases
        if (e.bossSpecialTimer <= 0) {
          e.bossSpecialTimer = 8;
          // Summon 3 void wraiths
          for (let i = 0; i < 3; i++) {
            this.queueSpawn(
              e.x + (Math.random() - 0.5) * 80,
              e.y + (Math.random() - 0.5) * 80,
              'void_wraith'
            );
          }
          this.spawnFloatingText(e.x, e.y - 40, 'SUMMON!', '#40c0a0');
        }
        // Phase transitions
        if (phase === 1 && e.hp < e.maxHp * 0.66) {
          e.bossPhase = 2;
          this.spawnFloatingText(e.x, e.y - 60, 'PHASE 2!', '#40ffc0');
          this.spawnParticles(e.x, e.y, 30, '#40ffc0', 'magic', 0.8);
        } else if (phase === 2 && e.hp < e.maxHp * 0.33) {
          e.bossPhase = 3;
          e.speed = e.baseSpeed * 1.5;
          this.spawnFloatingText(e.x, e.y - 60, 'ENRAGED!', '#ff4040');
          this.spawnParticles(e.x, e.y, 40, '#ff4040', 'magic', 1);
        }
        break;
      }
      case 'lich_king': {
        // Ultimate lich — summons minions, fires death beams, multi-phase
        e.vx = Math.cos(ang) * e.speed * 0.5;
        e.vy = Math.sin(ang) * e.speed * 0.5;
        const phase = e.bossPhase ?? 1;
        // Phase 1 (100%-50%): spiral of bones + summon skeleton adds
        // Phase 2 (50%-0%): death beam + enrage + summon void reapers
        if (e.bossAttackTimer <= 0) {
          if (phase === 1) {
            e.bossAttackTimer = 1.0;
            // Spiral of bones
            const spiralAng = this.gameTime * 5;
            for (let i = 0; i < 4; i++) {
              const a = spiralAng + (i / 4) * Math.PI * 2;
              this.spawnEnemyProjectile({
                x: e.x,
                y: e.y,
                vx: Math.cos(a) * 260,
                vy: Math.sin(a) * 260,
                damage: e.damage * 0.5,
                kind: 'knife',
                color: '#c0c0ff',
                radius: 6,
              });
            }
          } else {
            // Phase 2: triple death beams (sunbeam)
            e.bossAttackTimer = 1.5;
            for (let i = -1; i <= 1; i++) {
              const a = ang + i * 0.3;
              this.spawnEnemyProjectile({
                x: e.x,
                y: e.y,
                vx: Math.cos(a) * 360,
                vy: Math.sin(a) * 360,
                damage: e.damage * 0.8,
                kind: 'sunbeam',
                color: '#ff80ff',
                radius: 10,
              });
            }
          }
        }
        // Special: summon adds + heal slightly
        if (e.bossSpecialTimer <= 0) {
          e.bossSpecialTimer = 7;
          // Summon 4 enemies
          const summonPool: EnemyKind[] = phase === 1 ? ['void_wraith', 'void_reaper', 'bonebeast'] : ['void_reaper', 'void_leviathan', 'banshee'];
          for (let i = 0; i < 4; i++) {
            const summonKind = summonPool[Math.floor(Math.random() * summonPool.length)];
            this.queueSpawn(
              e.x + (Math.random() - 0.5) * 100,
              e.y + (Math.random() - 0.5) * 100,
              summonKind
            );
          }
          // Heal 3% HP
          const heal = e.maxHp * 0.03;
          e.hp = Math.min(e.maxHp, e.hp + heal);
          this.spawnFloatingText(e.x, e.y - 40, `+${Math.round(heal)} SUMMON`, '#c0c0ff');
          this.spawnParticles(e.x, e.y, 20, '#c0c0ff', 'magic', 0.6);
        }
        // Phase transition at 50%
        if (phase === 1 && e.hp < e.maxHp * 0.5) {
          e.bossPhase = 2;
          e.speed = e.baseSpeed * 1.4;
          e.damage = e.baseDamage * 1.2;
          this.spawnFloatingText(e.x, e.y - 60, 'PHASE 2: DARKNESS!', '#ff80ff');
          this.spawnParticles(e.x, e.y, 50, '#ff80ff', 'magic', 1.2);
        }
        break;
      }
    }
  }

  // ---------------- minions ----------------
  updateMinions(dt: number) {
    // cap minions — beast, wraith, servant, familiar don't count
    const p = this.player;
    const uncapped = new Set(['familiar', 'servant', 'beast', 'wraith', 'golem', 'bat']);
    const cappedMinions = this.minions.filter((m) => !uncapped.has(m.kind));
    if (cappedMinions.length > p.maxMinions) {
      // remove oldest capped minion
      for (let i = 0; i < this.minions.length; i++) {
        if (!uncapped.has(this.minions[i].kind)) {
          this.minions.splice(i, 1);
          break;
        }
      }
    }

    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      m.attackCooldown = Math.max(0, m.attackCooldown - dt);
      if (m.life > 0) {
        m.life -= dt;
        if (m.life <= 0) {
          this.spawnParticles(m.x, m.y, 6, '#c8c0a8', 'bone', 0.5);
          // Volatile Bones: explode on death
          if (p.volatileBonesLevel > 0) {
            this.volatileExplosion(m.x, m.y, m.damage * 2 * p.volatileBonesLevel);
          }
          // COMBO: Grave Echo — 25% chance to cast mini grave call on minion death
          if (p.graveEchoActive && Math.random() < 0.25) {
            this.castMiniGraveCall(m.x, m.y);
          }
          this.minions.splice(i, 1);
          continue;
        }
      }

      if (m.isFamiliar) {
        // orbit player & shoot
        const orbitAng = this.gameTime * 1.5 + i;
        const tx = p.x + Math.cos(orbitAng) * 60;
        const ty = p.y + Math.sin(orbitAng) * 60;
        m.x += (tx - m.x) * 0.1;
        m.y += (ty - m.y) * 0.1;
        m.shootCooldown = (m.shootCooldown ?? 0) - dt;
        if ((m.shootCooldown ?? 0) <= 0) {
          const target = this.findNearestEnemy(m.x, m.y, 400);
          if (target) {
            const a = Math.atan2(target.y - m.y, target.x - m.x);
            this.spawnProjectile({
              x: m.x,
              y: m.y,
              vx: Math.cos(a) * 380,
              vy: Math.sin(a) * 380,
              damage: m.damage,
              radius: 4,
              life: 1.2,
              pierceLeft: 0,
              chainLeft: 0,
              fromPlayer: true,
              kind: 'familiar',
              color: '#9affd0',
            });
            m.shootCooldown = 0.8;
          }
        }
        continue;
      }

      // Wraith: fast flying, slashes through enemies (pierce)
      if (m.kind === 'wraith') {
        const target = this.findNearestEnemy(m.x, m.y, 600);
        if (target) {
          const a = Math.atan2(target.y - m.y, target.x - m.x);
          m.vx = Math.cos(a) * m.speed;
          m.vy = Math.sin(a) * m.speed;
          // damage enemies in path
          for (const e of this.enemies) {
            const d = Math.hypot(e.x - m.x, e.y - m.y);
            if (d < e.radius + m.radius) {
              if (m.attackCooldown <= 0) {
                // COMBO: Bloodlust — enraged minions deal +80% damage
                let dmg = m.damage;
                const kindAny = m.kind as string;
                if (kindAny !== 'golem' && kindAny !== 'bat' && this.bloodlustTimer > 0) {
                  dmg *= 1.8;
                }
                this.damageEnemy(e, dmg, null);
                // vampiric aura
                if (p.vampiricAuraLevel > 0) {
                  p.hp = Math.min(
                    p.maxHp,
                    p.hp + m.damage * 0.1 * p.vampiricAuraLevel
                  );
                  // COMBO: Vampiric Hunger — also heal minions
                  if (p.vampiricHungerActive) {
                    const healAmt = m.damage * 0.05 * p.vampiricAuraLevel;
                    for (const om of this.minions) {
                      if (om === m) continue;
                      const md = Math.hypot(om.x - m.x, om.y - m.y);
                      if (md < 120) {
                        om.hp = Math.min(om.maxHp, om.hp + healAmt);
                      }
                    }
                  }
                }
              }
            }
          }
          if (m.attackCooldown <= 0) m.attackCooldown = m.attackInterval;
        } else {
          // follow player
          const a = Math.atan2(p.y - m.y, p.x - m.x);
          const d = Math.hypot(p.x - m.x, p.y - m.y);
          if (d > 100) {
            m.vx = Math.cos(a) * m.speed;
            m.vy = Math.sin(a) * m.speed;
          } else {
            m.vx *= 0.85;
            m.vy *= 0.85;
          }
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.x = Math.max(10, Math.min(GAME_W - 10, m.x));
        m.y = Math.max(10, Math.min(GAME_H - 10, m.y));
        continue;
      }

      // Beast: tanky charger — periodically lunges
      if (m.kind === 'beast') {
        const target = this.findNearestEnemy(m.x, m.y, 500);
        m.phaseTimer = (m.phaseTimer ?? 0) - dt;
        if (target) {
          const a = Math.atan2(target.y - m.y, target.x - m.x);
          if ((m.phaseTimer ?? 0) <= 0) {
            m.phaseTimer = 2.5;
            // lunge
            m.vx = Math.cos(a) * m.speed * 2.5;
            m.vy = Math.sin(a) * m.speed * 2.5;
          } else {
            m.vx = Math.cos(a) * m.speed;
            m.vy = Math.sin(a) * m.speed;
          }
          // damage on contact
          for (const e of this.enemies) {
            const d = Math.hypot(e.x - m.x, e.y - m.y);
            if (d < e.radius + m.radius) {
              if (m.attackCooldown <= 0) {
                this.damageEnemy(e, m.damage, null);
                if (p.vampiricAuraLevel > 0) {
                  p.hp = Math.min(
                    p.maxHp,
                    p.hp + m.damage * 0.1 * p.vampiricAuraLevel
                  );
                }
                m.attackCooldown = m.attackInterval;
              }
            }
          }
        } else {
          // follow player slowly
          const a = Math.atan2(p.y - m.y, p.x - m.x);
          const d = Math.hypot(p.x - m.x, p.y - m.y);
          if (d > 100) {
            m.vx = Math.cos(a) * m.speed * 0.7;
            m.vy = Math.sin(a) * m.speed * 0.7;
          } else {
            m.vx *= 0.85;
            m.vy *= 0.85;
          }
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.x = Math.max(10, Math.min(GAME_W - 10, m.x));
        m.y = Math.max(10, Math.min(GAME_H - 10, m.y));
        continue;
      }

      // NEW: Golem — slow heavy tank, big AoE slam attack
      if (m.kind === 'golem') {
        const target = this.findNearestEnemy(m.x, m.y, 400);
        m.phaseTimer = (m.phaseTimer ?? 0) - dt;
        if (target) {
          const a = Math.atan2(target.y - m.y, target.x - m.x);
          m.vx = Math.cos(a) * m.speed;
          m.vy = Math.sin(a) * m.speed;
          // periodic slam: damage all nearby enemies
          if ((m.phaseTimer ?? 0) <= 0) {
            m.phaseTimer = 2.5;
            this.spawnParticles(m.x, m.y, 16, '#a08060', 'spark', 0.5);
            for (const e of this.enemies) {
              const d = Math.hypot(e.x - m.x, e.y - m.y);
              if (d < 80 + e.radius) {
                this.damageEnemy(e, m.damage * 1.5, null);
                if (p.vampiricAuraLevel > 0) {
                  p.hp = Math.min(
                    p.maxHp,
                    p.hp + m.damage * 0.15 * p.vampiricAuraLevel
                  );
                }
                // knockback
                const ang = Math.atan2(e.y - m.y, e.x - m.x);
                e.x += Math.cos(ang) * 25;
                e.y += Math.sin(ang) * 25;
              }
            }
          }
          // also damage on contact
          for (const e of this.enemies) {
            const d = Math.hypot(e.x - m.x, e.y - m.y);
            if (d < e.radius + m.radius && m.attackCooldown <= 0) {
              this.damageEnemy(e, m.damage, null);
              m.attackCooldown = m.attackInterval;
            }
          }
        } else {
          // follow player slowly
          const a = Math.atan2(p.y - m.y, p.x - m.x);
          const d = Math.hypot(p.x - m.x, p.y - m.y);
          if (d > 120) {
            m.vx = Math.cos(a) * m.speed;
            m.vy = Math.sin(a) * m.speed;
          } else {
            m.vx *= 0.85;
            m.vy *= 0.85;
          }
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.x = Math.max(10, Math.min(GAME_W - 10, m.x));
        m.y = Math.max(10, Math.min(GAME_H - 10, m.y));
        continue;
      }

      // NEW: Bat — fast flying, swarms and bites enemies
      if (m.kind === 'bat') {
        const target = this.findNearestEnemy(m.x, m.y, 500);
        if (target) {
          const a = Math.atan2(target.y - m.y, target.x - m.x);
          // zigzag flight
          const zigzag = Math.sin(this.gameTime * 8 + m.id) * 0.5;
          m.vx = Math.cos(a + zigzag) * m.speed;
          m.vy = Math.sin(a + zigzag) * m.speed;
          for (const e of this.enemies) {
            const d = Math.hypot(e.x - m.x, e.y - m.y);
            if (d < e.radius + m.radius && m.attackCooldown <= 0) {
              this.damageEnemy(e, m.damage, null);
              if (p.vampiricAuraLevel > 0) {
                p.hp = Math.min(
                  p.maxHp,
                  p.hp + m.damage * 0.1 * p.vampiricAuraLevel
                );
              }
              m.attackCooldown = m.attackInterval;
            }
          }
        } else {
          // orbit player
          const orbitAng = this.gameTime * 2 + m.id;
          const tx = p.x + Math.cos(orbitAng) * 60;
          const ty = p.y + Math.sin(orbitAng) * 60;
          m.vx = (tx - m.x) * 5;
          m.vy = (ty - m.y) * 5;
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.x = Math.max(10, Math.min(GAME_W - 10, m.x));
        m.y = Math.max(10, Math.min(GAME_H - 10, m.y));
        continue;
      }

      // ground minions: chase nearest enemy
      const target = this.findNearestEnemy(m.x, m.y, 500);
      if (target) {
        const a = Math.atan2(target.y - m.y, target.x - m.x);
        let s = m.speed;
        if (p.commandActive) s *= 1.6;
        m.vx = Math.cos(a) * s;
        m.vy = Math.sin(a) * s;
      } else {
        // follow player
        const a = Math.atan2(p.y - m.y, p.x - m.x);
        const d = Math.hypot(p.x - m.x, p.y - m.y);
        if (d > 80) {
          m.vx = Math.cos(a) * m.speed;
          m.vy = Math.sin(a) * m.speed;
        } else {
          m.vx *= 0.85;
          m.vy *= 0.85;
        }
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.x = Math.max(10, Math.min(GAME_W - 10, m.x));
      m.y = Math.max(10, Math.min(GAME_H - 10, m.y));
    }
  }

  volatileExplosion(x: number, y: number, dmg: number) {
    this.spawnParticles(x, y, 20, '#e8e0d0', 'bone', 0.5);
    this.spawnParticles(x, y, 8, '#ff8040', 'spark', 0.3);
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < 70) {
        this.damageEnemy(e, dmg, null);
      }
    }
  }

  spawnMinion(
    kind: Minion['kind'],
    x: number,
    y: number,
    duration: number
  ) {
    const p = this.player;
    let dmg = p.minionDamage;
    let hp = 30;
    let speed = 140;
    let radius = 10;
    if (kind === 'servant') {
      dmg = p.minionDamage * 2;
      hp = 60;
      speed = 130;
      radius = 14;
    } else if (kind === 'crawler') {
      dmg = p.minionDamage * 0.5;
      hp = 10;
      speed = 220;
      radius = 7;
    } else if (kind === 'familiar') {
      dmg = p.minionDamage * 0.8;
      hp = 1;
      speed = 0;
      radius = 10;
    } else if (kind === 'army') {
      dmg = p.minionDamage * 1.5;
      hp = 50;
      speed = 180;
      radius = 11;
    } else if (kind === 'beast') {
      // Tanky bone beast that charges enemies
      dmg = p.minionDamage * 2.5;
      hp = 200;
      speed = 160;
      radius = 18;
    } else if (kind === 'wraith') {
      // Fast flying wraith that slashes through enemies
      dmg = p.minionDamage * 1.8;
      hp = 60;
      speed = 260;
      radius = 12;
    } else if (kind === 'golem') {
      // Huge tanky golem — slow but massive damage
      dmg = p.minionDamage * 4;
      hp = 400;
      speed = 90;
      radius = 24;
    } else if (kind === 'bat') {
      // Fast flying bat — weak but numerous
      dmg = p.minionDamage * 0.7;
      hp = 20;
      speed = 280;
      radius = 8;
    }
    this.minions.push({
      id: this.nextMinionId++,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: Math.round(hp * p.minionHpMult),
      maxHp: Math.round(hp * p.minionHpMult),
      damage: dmg,
      speed,
      radius,
      life: duration,
      attackCooldown: 0,
      attackInterval: (kind === 'crawler' ? 0.4 : 0.8) * (p.skills.has('undead_frenzy') ? 0.6 : 1),
      kind,
      isFamiliar: kind === 'familiar',
      shootCooldown: 0,
    });
    this.spawnParticles(x, y, 8, '#c8c0a8', 'bone', 0.4);
  }

  // ---------------- souls ----------------
  updateSouls(dt: number) {
    const p = this.player;
    for (let i = this.souls.length - 1; i >= 0; i--) {
      const s = this.souls[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.souls.splice(i, 1);
        continue;
      }
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (!s.magnetized && d < p.soulPickupRange) {
        s.magnetized = true;
      }
      if (s.magnetized) {
        const a = Math.atan2(p.y - s.y, p.x - s.x);
        const spd = 360 + (p.soulPickupRange - d) * 2;
        s.vx = Math.cos(a) * spd;
        s.vy = Math.sin(a) * spd;
      } else {
        s.vx *= 0.9;
        s.vy *= 0.9;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (d < p.radius + 8) {
        if (s.kind === 'heal') {
          p.hp = Math.min(p.maxHp, p.hp + 8);
          this.spawnFloatingText(p.x, p.y - 24, '+8', '#7affa0');
        } else if (s.kind === 'chest') {
          // Golden chest — open reward screen with RARE+ skills
          this.openGoldenChest();
        } else {
          const gain = Math.max(1, Math.round(s.value * p.soulGainMult));
          p.soulsCollected += gain;
          // Charge soul meter
          p.soulMeter = Math.min(p.soulMeterMax, p.soulMeter + 1);
          // COMBO: Soul Conduit — every 5th soul pickup triggers mini nova
          if (p.soulConduitActive) {
            this.soulConduitCounter = (this.soulConduitCounter ?? 0) + 1;
            if (this.soulConduitCounter >= 5) {
              this.soulConduitCounter = 0;
              const miniDmg = p.damage * 1.5;
              for (const e of this.enemies) {
                const ed = Math.hypot(e.x - p.x, e.y - p.y);
                if (ed < 150) {
                  this.damageEnemy(e, miniDmg, null);
                }
              }
              for (let k = 0; k < 20; k++) {
                const a = (k / 20) * Math.PI * 2;
                this.particles.push({
                  x: p.x,
                  y: p.y,
                  vx: Math.cos(a) * 250,
                  vy: Math.sin(a) * 250,
                  life: 0.4,
                  maxLife: 0.4,
                  radius: 3,
                  color: '#b58cff',
                  kind: 'soul',
                });
              }
            }
          }
        }
        this.souls.splice(i, 1);
      }
    }
  }

  // ---------------- cursed grounds ----------------
  updateCursedGrounds(dt: number) {
    for (let i = this.cursedGrounds.length - 1; i >= 0; i--) {
      const cg = this.cursedGrounds[i];
      cg.life -= dt;
      cg.tickTimer -= dt;
      if (cg.life <= 0) {
        this.cursedGrounds.splice(i, 1);
        continue;
      }
      if (cg.tickTimer <= 0) {
        cg.tickTimer = cg.tickInterval;
        cg.hitSet.clear();
      }
      for (const e of this.enemies) {
        if (cg.hitSet.has(e.id)) continue;
        const d = Math.hypot(e.x - cg.x, e.y - cg.y);
        if (d < cg.radius) {
          this.damageEnemy(e, cg.damage, null);
          cg.hitSet.add(e.id);
        }
      }
    }
  }

  // ===== NEW: update methods for unique power entities =====
  updateBlackHoles(dt: number) {
    for (let i = this.blackHoles.length - 1; i >= 0; i--) {
      const bh = this.blackHoles[i];
      bh.life -= dt;
      bh.tickTimer -= dt;
      if (bh.life <= 0) {
        this.blackHoles.splice(i, 1);
        continue;
      }
      // pull enemies toward center
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - bh.x, e.y - bh.y);
        if (d < bh.pullRadius && d > 5) {
          const ang = Math.atan2(bh.y - e.y, bh.x - e.x);
          const pullStrength = 200 * (1 - d / bh.pullRadius);
          e.x += Math.cos(ang) * pullStrength * dt;
          e.y += Math.sin(ang) * pullStrength * dt;
        }
      }
      // damage tick
      if (bh.tickTimer <= 0) {
        bh.tickTimer = bh.tickInterval;
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - bh.x, e.y - bh.y);
          if (d < bh.radius + e.radius) {
            this.damageEnemy(e, bh.damage, null);
          }
        }
        // swirl particles
        for (let k = 0; k < 4; k++) {
          const a = Math.random() * Math.PI * 2;
          const r = bh.radius + Math.random() * 20;
          this.particles.push({
            x: bh.x + Math.cos(a) * r,
            y: bh.y + Math.sin(a) * r,
            vx: Math.cos(a + Math.PI / 2) * 80,
            vy: Math.sin(a + Math.PI / 2) * 80,
            life: 0.5,
            maxLife: 0.5,
            radius: 2,
            color: '#a040ff',
            kind: 'magic',
          });
        }
      }
    }
  }

  updateBoneWalls(dt: number) {
    for (let i = this.boneWalls.length - 1; i >= 0; i--) {
      const bw = this.boneWalls[i];
      bw.life -= dt;
      if (bw.life <= 0 || bw.hp <= 0) {
        this.spawnParticles(bw.x, bw.y, 8, '#e8e0d0', 'bone', 0.5);
        this.boneWalls.splice(i, 1);
        continue;
      }
      // push enemies away (block them)
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - bw.x, e.y - bw.y);
        if (d < bw.radius + e.radius) {
          const ang = Math.atan2(e.y - bw.y, e.x - bw.x);
          e.x = bw.x + Math.cos(ang) * (bw.radius + e.radius);
          e.y = bw.y + Math.sin(ang) * (bw.radius + e.radius);
          // wall takes damage from contact
          bw.hp -= e.damage * dt * 0.5;
        }
      }
      // bone walls also absorb enemy projectiles
      for (let j = this.enemyProjectiles.length - 1; j >= 0; j--) {
        const pr = this.enemyProjectiles[j];
        const d = Math.hypot(pr.x - bw.x, pr.y - bw.y);
        if (d < bw.radius + pr.radius) {
          this.spawnParticles(pr.x, pr.y, 4, '#e8e0d0', 'spark', 0.3);
          this.enemyProjectiles.splice(j, 1);
          bw.hp -= 5;
        }
      }
    }
  }

  updateMeteors(dt: number) {
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      if (!m.exploded) {
        m.life -= dt;
        // interpolate position from startY to targetY
        const t = 1 - Math.max(0, m.life / 0.8);
        m.x = m.targetX;
        m.y = m.startY + (m.targetY - m.startY) * t;
        // trail particles
        if (Math.random() < 0.6) {
          this.particles.push({
            x: m.x + (Math.random() - 0.5) * 8,
            y: m.y - 5,
            vx: (Math.random() - 0.5) * 40,
            vy: -60 - Math.random() * 40,
            life: 0.6,
            maxLife: 0.6,
            radius: 3,
            color: '#ff6020',
            kind: 'meteor_trail',
          });
        }
        if (m.life <= 0) {
          m.exploded = true;
          // explode — damage all enemies in radius
          this.spawnParticles(m.targetX, m.targetY, 30, '#ff6020', 'spark', 0.6);
          this.spawnParticles(m.targetX, m.targetY, 12, '#ffd040', 'spark', 0.4);
          for (const e of this.enemies) {
            const d = Math.hypot(e.x - m.targetX, e.y - m.targetY);
            if (d < m.radius * 2.5) {
              this.damageEnemy(e, m.damage, null);
              // knockback
              const ang = Math.atan2(e.y - m.targetY, e.x - m.targetX);
              e.x += Math.cos(ang) * 40;
              e.y += Math.sin(ang) * 40;
            }
          }
          this.spawnFloatingText(m.targetX, m.targetY - 30, 'METEOR!', '#ff6020');
          this.meteors.splice(i, 1);
        }
      }
    }
  }

  updateLightningArcs(dt: number) {
    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      const la = this.lightningArcs[i];
      la.life -= dt;
      if (la.life <= 0) {
        this.lightningArcs.splice(i, 1);
      }
    }
  }

  spawnCursedGround(x: number, y: number) {
    const lvl = this.player.cursedGroundLevel;
    const a = Math.random() * Math.PI * 2;
    const r = 80 + Math.random() * 120;
    this.cursedGrounds.push({
      x: x + Math.cos(a) * r,
      y: y + Math.sin(a) * r,
      radius: 70 + lvl * 10,
      damage: this.player.damage * 0.4,
      life: 4 + lvl,
      tickInterval: 0.5,
      tickTimer: 0,
      hitSet: new Set<number>(),
    });
  }

  // ---------------- particles & text ----------------
  updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
  }

  updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      if (t.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  spawnParticles(
    x: number,
    y: number,
    count: number,
    color: string,
    kind: Particle['kind'],
    life: number
  ) {
    // ===== PERFORMANCE: hard cap on total particles to prevent late-game lag =====
    const MAX_PARTICLES = 400;
    if (this.particles.length >= MAX_PARTICLES) {
      // Drop oldest particles to make room for new ones
      this.particles.splice(0, this.particles.length - MAX_PARTICLES + count);
    }
    // Reduce count if we're nearing the cap
    const effectiveCount = Math.min(count, MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < effectiveCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: life * (0.6 + Math.random() * 0.6),
        maxLife: life,
        radius: 1 + Math.random() * 3,
        color,
        kind,
      });
    }
  }

  spawnFloatingText(x: number, y: number, text: string, color: string) {
    // ===== PERFORMANCE: cap floating texts to prevent spam lag =====
    const MAX_FLOATING_TEXTS = 30;
    if (this.floatingTexts.length >= MAX_FLOATING_TEXTS) {
      this.floatingTexts.shift();
    }
    this.floatingTexts.push({
      x,
      y,
      text,
      life: 1,
      color,
      vy: -40,
    });
  }

  // ---------------- spawns ----------------
  updateSpawns(dt: number) {
    for (let i = this.pendingSpawns.length - 1; i >= 0; i--) {
      const s = this.pendingSpawns[i];
      s.t -= dt;
      if (s.t <= 0) {
        if (s.isBoss) {
          this.spawnBoss(s.bossKind!, s.x, s.y, s.siblingId);
        } else {
          this.spawnEnemyAt(s.kind, s.x, s.y);
        }
        this.pendingSpawns.splice(i, 1);
      }
    }
  }

  queueSpawn(x: number, y: number, kind: EnemyKind) {
    // ===== PERFORMANCE: cap total pending spawns + active enemies to prevent lag =====
    const MAX_ACTIVE_ENEMIES = 80;
    if (this.enemies.length + this.pendingSpawns.length >= MAX_ACTIVE_ENEMIES) {
      return; // skip spawn if at cap
    }
    this.pendingSpawns.push({ x, y, t: 0.5, kind });
  }

  spawnEnemyAt(kind: EnemyKind, x: number, y: number) {
    const tpl = ENEMY_TEMPLATES[kind];
    const hpScale = enemyHpScale(this.globalRoomNumber);
    const dmgScale = enemyDamageScale(this.globalRoomNumber);

    // ===== ELITE SPAWN LOGIC =====
    // Base chance scales with room depth. After room 2, every 6-10 spawns one elite.
    // Stage 2+ (Void/Abyss): ALL void enemies are elites (much harder difficulty)
    this.eliteSpawnCounter++;
    let isElite = false;
    let affixes: EliteAffix[] = [];
    const isVoidEnemy =
      kind === 'void_horror' ||
      kind === 'void_wraith' ||
      kind === 'void_leviathan' ||
      kind === 'void_reaper';
    if (isVoidEnemy && this.globalRoomNumber >= 17) {
      // Void stage: all void enemies are elite with 1-2 affixes
      isElite = true;
      const affixCount = this.globalRoomNumber >= 25 ? 2 : 1;
      affixes = rollEliteAffixes(affixCount);
    } else if (this.globalRoomNumber >= 2) {
      // rough chance per spawn: 4% + room * 1%, capped at 12%
      const chance = Math.min(0.12, 0.04 + this.globalRoomNumber * 0.01);
      // Force-spawn elite every 12 enemies if we haven't had one this cycle
      const forceElite = this.eliteSpawnCounter >= 12;
      if (forceElite || Math.random() < chance) {
        isElite = true;
        this.eliteSpawnCounter = 0;
        const affixCount = this.globalRoomNumber >= 8 ? 2 : 1;
        affixes = rollEliteAffixes(affixCount);
      }
    }

    // Apply affix multipliers
    let hpMult = 1;
    let dmgMult = 1;
    let spdMult = 1;
    let sizeMult = 1;
    let soulMult = 1;
    if (isElite) {
      for (const a of affixes) {
        const d = ELITE_AFFIXES[a];
        hpMult *= d.hpMult;
        dmgMult *= d.damageMult;
        spdMult *= d.speedMult;
        sizeMult *= d.sizeMult;
        soulMult *= d.soulValueMult;
      }
    }

    const baseHp = tpl.hp * hpScale * hpMult;
    const baseSpeed = tpl.speed * spdMult;
    const baseDamage = tpl.damage * dmgScale * dmgMult;
    const baseRadius = tpl.radius * sizeMult;

    this.enemies.push({
      id: this.nextEnemyId++,
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: baseHp,
      maxHp: baseHp,
      damage: baseDamage,
      speed: baseSpeed,
      radius: baseRadius,
      attackCooldown: 0.5,
      attackInterval: tpl.attackInterval / (isElite && affixes.includes('swift') ? 1.6 : 1),
      hitFlash: 0,
      dotTimer: 0,
      dotDamage: 0,
      phaseTimer: 2,
      phaseActive: true,
      shielded: false,
      shieldHp: kind === 'paladin' ? 30 : 0,
      slowTimer: 0,
      slowMult: 1,
      markedTimer: 0,
      isElite,
      eliteAffixes: affixes,
      eliteShieldHp: isElite && affixes.includes('shielded') ? baseHp * 0.4 : 0,
      eliteShieldMax: isElite && affixes.includes('shielded') ? baseHp * 0.4 : 0,
      eliteShieldRegenTimer: 0,
      resurrectedOnce: false,
      poisonTrailTimer: 0,
      enraged: false,
      baseSpeed,
      baseDamage,
      color: tpl.color,
      soulValue: Math.round(tpl.soulValue * soulMult),
    });
    if (isElite) {
      // dramatic spawn effect
      this.spawnParticles(x, y, 16, ELITE_AFFIXES[affixes[0]].color, 'magic', 0.6);
      this.spawnFloatingText(x, y - 30, 'ELITE!', '#ffd040');
    } else {
      this.spawnParticles(x, y, 8, '#7a3a3a', 'smoke', 0.4);
    }
  }

  spawnBoss(kind: BossKind, x: number, y: number, siblingId?: number) {
    const tpl = BOSS_TEMPLATES[kind];
    const e: Enemy = {
      id: this.nextEnemyId++,
      kind: 'knight',
      x,
      y,
      vx: 0,
      vy: 0,
      hp: tpl.hp,
      maxHp: tpl.hp,
      damage: tpl.damage,
      speed: tpl.speed,
      radius: tpl.radius,
      attackCooldown: 1,
      attackInterval: 2,
      hitFlash: 0,
      dotTimer: 0,
      dotDamage: 0,
      phaseTimer: 0,
      phaseActive: true,
      shielded: false,
      shieldHp: 0,
      slowTimer: 0,
      slowMult: 1,
      markedTimer: 0,
      isElite: false,
      eliteAffixes: [],
      eliteShieldHp: 0,
      eliteShieldMax: 0,
      eliteShieldRegenTimer: 0,
      resurrectedOnce: false,
      poisonTrailTimer: 0,
      enraged: false,
      baseSpeed: tpl.speed,
      baseDamage: tpl.damage,
      isBoss: true,
      bossKind: kind,
      bossPhase: 1,
      bossAttackTimer: 2,
      bossSpecialTimer: 4,
      siblingId,
      color: tpl.color,
      soulValue: tpl.soulValue,
    };
    this.enemies.push(e);
    this.currentBoss = e;
    if (kind === 'twins' && siblingId === undefined) {
      // spawn sibling
      const sibling = { ...e };
      sibling.id = this.nextEnemyId++;
      sibling.x = x + 80;
      sibling.y = y;
      sibling.siblingId = e.id;
      e.siblingId = sibling.id;
      this.enemies.push(sibling);
    }
  }

  // ---------------- combat ----------------
  damageEnemy(e: Enemy, dmg: number, pr: Projectile | null) {
    // ===== ELITE: ethereal — 30% chance to phase through attacks =====
    if (e.isElite && e.eliteAffixes.includes('ethereal') && !e.isBoss) {
      if (Math.random() < 0.3) {
        this.spawnParticles(e.x, e.y, 5, '#b8e0ff', 'magic', 0.3);
        this.spawnDamageNumber(e.x, e.y - e.radius - 6, 'PHASE', '#b8e0ff', 12);
        return;
      }
    }

    // paladin shield: block projectile from front
    if (e.shielded && pr) {
      const angToPr = Math.atan2(pr.y - e.y, pr.x - e.x);
      const facing = Math.atan2(this.player.y - e.y, this.player.x - e.x);
      const diff = Math.abs(((angToPr - facing + Math.PI) % (Math.PI * 2)) - Math.PI);
      if (diff < Math.PI / 2) {
        // blocked
        e.shieldHp -= dmg;
        this.spawnParticles(e.x, e.y, 4, '#ffffff', 'spark', 0.3);
        if (e.shieldHp <= 0) {
          e.shielded = false;
          this.spawnFloatingText(e.x, e.y - 30, 'Shield Broken!', '#ffd060');
        } else {
          this.spawnFloatingText(e.x, e.y - 20, 'BLOCK', '#ffffff');
          return;
        }
      }
    }

    // ===== ELITE: shielded affix — regenerating damage shield absorbs hits first =====
    let dmgRemaining = dmg;
    if (e.isElite && e.eliteAffixes.includes('shielded') && e.eliteShieldHp > 0) {
      const absorbed = Math.min(e.eliteShieldHp, dmgRemaining);
      e.eliteShieldHp -= absorbed;
      dmgRemaining -= absorbed;
      e.eliteShieldRegenTimer = 4; // delay before regen
      this.spawnParticles(e.x, e.y, 6, '#7ad3ff', 'spark', 0.3);
      this.spawnDamageNumber(e.x, e.y - e.radius - 6, `${Math.round(absorbed)}`, '#7ad3ff', 13);
      if (e.eliteShieldHp <= 0) {
        this.spawnFloatingText(e.x, e.y - 36, 'SHIELD BROKEN', '#7ad3ff');
      }
      if (dmgRemaining <= 0) return;
    }

    // mark of death bonus damage
    let finalDmg = dmgRemaining;
    if (e.markedTimer > 0) {
      finalDmg *= 1.5;
    }

    e.hp -= finalDmg;
    e.hitFlash = 0.1;
    // QOL: track damage dealt
    this.damageDealt += finalDmg;

    // ===== ELITE: vampiric — heals on hit (when dealing damage to player) handled in damagePlayer;
    // but we also reward the player with bonus damage feedback if crit =====
    // damage number
    let dmgColor = '#ffffff';
    let dmgSize = 13;
    if (pr?.isCrit) {
      dmgColor = '#ffd040';
      dmgSize = 17;
    } else if (pr?.frostLevel) {
      dmgColor = '#7ad3ff';
    } else if (pr?.chainLightningLevel) {
      dmgColor = '#ffe070';
    } else if (pr?.dotChance && pr.dotChance > 0) {
      dmgColor = '#b58cff';
    } else if (e.markedTimer > 0) {
      dmgColor = '#ff4060';
    }
    // Only show damage number for meaningful damage to reduce spam
    if (finalDmg >= 5) {
      this.spawnDamageNumber(
        e.x + (Math.random() - 0.5) * 10,
        e.y - e.radius - 4,
        `${Math.round(finalDmg)}`,
        dmgColor,
        dmgSize,
        pr?.isCrit
      );
    }

    // mark of death — chance to mark enemy on hit
    if (
      this.player.markOfDeathLevel > 0 &&
      e.markedTimer <= 0 &&
      Math.random() < 0.2 * this.player.markOfDeathLevel
    ) {
      e.markedTimer = 4;
      this.spawnParticles(e.x, e.y, 6, '#ff4060', 'magic', 0.4);
    }

    // dot from soul burn
    if (pr && pr.dotChance && pr.dotChance > 0 && Math.random() < pr.dotChance) {
      e.dotTimer = 2.5;
      e.dotDamage = pr.dotDamage ?? 0;
    }

    // ===== ELITE: vengeful — enrage when below 30% HP =====
    if (
      e.isElite &&
      e.eliteAffixes.includes('vengeful') &&
      !e.enraged &&
      e.hp > 0 &&
      e.hp <= e.maxHp * 0.3
    ) {
      e.enraged = true;
      e.speed = e.baseSpeed * 1.5;
      e.damage = e.baseDamage * 1.3;
      this.spawnFloatingText(e.x, e.y - 40, 'ENRAGED!', '#ffd34d');
      this.spawnParticles(e.x, e.y, 14, '#ffd34d', 'magic', 0.6);
    }

    // soul drain
    if (this.player.soulDrainChance > 0 && Math.random() < this.player.soulDrainChance) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.soulDrainAmount);
      this.spawnFloatingText(this.player.x, this.player.y - 28, `+${this.player.soulDrainAmount}`, '#7affa0');
    }

    if (e.hp <= 0) {
      const idx = this.enemies.indexOf(e);
      if (idx >= 0) this.killEnemy(e, idx);
    }
  }

  // ===== NEW: damage number helper (uses floating text with size/bold) =====
  spawnDamageNumber(x: number, y: number, text: string, color: string, size: number, bold?: boolean) {
    // ===== PERFORMANCE: cap damage numbers to prevent late-game lag =====
    const MAX_DAMAGE_NUMBERS = 25;
    if (this.floatingTexts.length >= MAX_DAMAGE_NUMBERS) {
      this.floatingTexts.shift();
    }
    this.floatingTexts.push({
      x,
      y,
      text,
      life: 0.8,
      color,
      vy: -50,
      size,
      bold: bold ?? false,
    });
  }

  killEnemy(e: Enemy, idx: number) {
    // ===== ELITE: resurrective — revive once at 50% HP =====
    if (e.isElite && e.eliteAffixes.includes('resurrective') && !e.resurrectedOnce && !e.isBoss) {
      e.resurrectedOnce = true;
      e.hp = e.maxHp * 0.5;
      // Don't actually remove from enemies array
      this.spawnFloatingText(e.x, e.y - 40, 'RESURRECTED!', '#c08aff');
      this.spawnParticles(e.x, e.y, 20, '#c08aff', 'magic', 0.8);
      this.spawnParticles(e.x, e.y, 12, '#ffffff', 'spark', 0.6);
      e.hitFlash = 0.3;
      return;
    }

    // ===== ELITE: splitter — spawn 2 smaller versions on death =====
    if (e.isElite && e.eliteAffixes.includes('splitter') && !e.isBoss && e.radius > 12) {
      for (let i = 0; i < 2; i++) {
        const ang = (i / 2) * Math.PI * 2 + Math.random() * 0.5;
        const offset = 24;
        const child = { ...e };
        child.id = this.nextEnemyId++;
        child.x = e.x + Math.cos(ang) * offset;
        child.y = e.y + Math.sin(ang) * offset;
        child.hp = e.maxHp * 0.35;
        child.maxHp = e.maxHp * 0.35;
        child.radius = e.radius * 0.7;
        child.damage = e.damage * 0.6;
        child.isElite = false; // children aren't elite (prevents infinite splitting)
        child.eliteAffixes = [];
        child.eliteShieldHp = 0;
        child.eliteShieldMax = 0;
        child.resurrectedOnce = false;
        child.enraged = false;
        child.baseSpeed = e.baseSpeed * 1.1;
        child.baseDamage = e.damage * 0.6;
        child.speed = child.baseSpeed;
        child.soulValue = Math.round(e.soulValue * 0.3);
        this.enemies.push(child);
        this.spawnParticles(child.x, child.y, 6, '#9dffb0', 'magic', 0.4);
      }
      this.spawnFloatingText(e.x, e.y - 30, 'SPLIT!', '#9dffb0');
    }

    // ===== ELITE: volatile — explode on death =====
    if (e.isElite && e.eliteAffixes.includes('volatile') && !e.isBoss) {
      const explDmg = e.maxHp * 0.3 + 30;
      const explRadius = 90;
      this.spawnParticles(e.x, e.y, 30, '#ff5252', 'spark', 0.6);
      this.spawnParticles(e.x, e.y, 14, '#ffaa40', 'smoke', 0.8);
      this.spawnFloatingText(e.x, e.y - 30, 'BOOM!', '#ff5252');
      // damage player if close
      const dp = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      if (dp < explRadius) {
        this.damagePlayer(explDmg * 0.4, e);
      }
      // damage other enemies caught in blast (chain reaction!)
      for (const other of this.enemies) {
        if (other === e) continue;
        const d = Math.hypot(other.x - e.x, other.y - e.y);
        if (d < explRadius) {
          this.damageEnemy(other, explDmg, null);
        }
      }
    }

    this.enemies.splice(idx, 1);
    this.player.kills++;
    this.player.swarmKillCounter++;

    // ===== COMBO SYSTEM =====
    if (!e.isBoss) {
      this.player.comboCount++;
      this.player.comboTimer = 3; // 3 seconds to maintain combo
      if (this.player.comboCount > this.player.comboMax) {
        this.player.comboMax = this.player.comboCount;
      }
      // Milestone bonuses at 10/25/50/100 combo
      const milestones = [10, 25, 50, 100, 200];
      if (milestones.includes(this.player.comboCount)) {
        this.spawnFloatingText(e.x, e.y - 60, `${this.player.comboCount}x COMBO!`, '#ffd040');
        this.spawnParticles(this.player.x, this.player.y, 14, '#ffd040', 'magic', 0.6);
        // bonus heal soul drop
        this.souls.push({
          x: e.x,
          y: e.y,
          vx: 0,
          vy: 0,
          value: 0,
          kind: 'heal',
          life: 14,
          collected: false,
          magnetized: false,
        });
        // COMBO: Bloodlust — enrage minions for 5s
        if (this.player.bloodlustActive) {
          this.bloodlustTimer = 5;
          this.spawnFloatingText(this.player.x, this.player.y - 60, 'BLOODLUST!', '#ff4040');
          this.spawnParticles(this.player.x, this.player.y, 20, '#ff4040', 'magic', 0.8);
        }
      }
    } else {
      // boss kills break combo (reset to 0 since it's a long fight)
      this.player.comboCount = 0;
      this.player.comboTimer = 0;
    }

    // elite kill tracking
    if (e.isElite) {
      this.elitesKilled++;
      // elites always drop a bonus heal
      if (Math.random() < 0.5) {
        this.souls.push({
          x: e.x,
          y: e.y,
          vx: 0,
          vy: 0,
          value: 0,
          kind: 'heal',
          life: 16,
          collected: false,
          magnetized: false,
        });
      }
      // Trophy Hunter (permanent): +25% souls from elites per level
      const eliteBonus = this.permanentBonuses.eliteSoulBonus ?? 0;
      if (eliteBonus > 0) {
        const bonusSouls = Math.ceil(e.soulValue * 0.25 * eliteBonus / 2);
        for (let i = 0; i < bonusSouls; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 60 + Math.random() * 80;
          this.souls.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            value: 2,
            kind: 'normal',
            life: 14,
            collected: false,
            magnetized: false,
          });
        }
      }
    }

    // drop souls
    const soulCount = Math.min(4, Math.max(1, Math.round(e.soulValue / 2)));
    for (let i = 0; i < soulCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 80;
      this.souls.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        value: Math.max(1, Math.round(e.soulValue / soulCount)),
        kind: 'normal',
        life: 12,
        collected: false,
        magnetized: false,
      });
    }
    // small chance to drop heal
    if (Math.random() < 0.06) {
      this.souls.push({
        x: e.x,
        y: e.y,
        vx: 0,
        vy: 0,
        value: 0,
        kind: 'heal',
        life: 14,
        collected: false,
        magnetized: false,
      });
    }

    // NEW: Blessed by God — 1% flat chance to drop golden chest (nerfed from previous 12%)
    if (this.player.blessedByGodLevel > 0 && !e.isBoss) {
      const chestChance = 0.01; // flat 1% per kill
      if (Math.random() < chestChance) {
        this.souls.push({
          x: e.x,
          y: e.y,
          vx: 0,
          vy: 0,
          value: 0,
          kind: 'chest',
          life: 30, // chests last longer
          collected: false,
          magnetized: false,
        });
        this.spawnFloatingText(e.x, e.y - 20, '✨ GOLDEN CHEST!', '#ffd040');
      }
    }

    // NEW: Soul Harvest — +1% damage per kill (capped at +50%)
    if (this.player.skills.has('soul_harvest')) {
      const bonus = Math.min(1.5, 1 + this.player.kills * 0.01) / Math.min(1.5, 1 + (this.player.kills - 1) * 0.01);
      this.player.damage *= bonus;
    }

    // NEW: Vampiric Touch already handled above

    // death particles
    this.spawnParticles(e.x, e.y, 10, e.color, 'bone', 0.6);
    this.spawnParticles(e.x, e.y, 6, '#b58cff', 'soul', 0.8);

    // raise chance
    if (
      this.player.raiseChance > 0 &&
      Math.random() < this.player.raiseChance &&
      this.minions.filter((m) => m.kind === 'skeleton' || m.kind === 'crawler').length < this.player.maxMinions
    ) {
      this.spawnMinion('skeleton', e.x, e.y, this.player.minionDuration);
    }

    // NEW: necrotic explosion — corpse explodes damaging nearby enemies
    if (this.player.necroticExplosionLevel > 0 && !e.isBoss) {
      const explDmg =
        this.player.damage * 0.8 * this.player.necroticExplosionLevel;
      const radius = 70 + this.player.necroticExplosionLevel * 15;
      this.spawnParticles(e.x, e.y, 14, '#80ff40', 'spark', 0.4);
      // COMBO: Necrotic Bloom — if explosion kills an enemy, chain to another nearby foe
      let chainTarget: Enemy | null = null;
      for (const other of this.enemies) {
        const d = Math.hypot(other.x - e.x, other.y - e.y);
        if (d < radius) {
          const hpBefore = other.hp;
          this.damageEnemy(other, explDmg, null);
          if (
            this.player.necroticBloomActive &&
            !chainTarget &&
            other.hp <= 0 &&
            hpBefore > 0
          ) {
            chainTarget = other;
          }
        }
      }
      // Chain to one more nearby enemy with reduced damage
      if (chainTarget && this.enemies.indexOf(chainTarget) < 0) {
        // chainTarget already removed; find a new nearby enemy
        const chainDmg = explDmg * 0.6;
        const chainRadius = radius * 1.2;
        let chained = false;
        for (const other of this.enemies) {
          const d = Math.hypot(other.x - e.x, other.y - e.y);
          if (d < chainRadius) {
            this.damageEnemy(other, chainDmg, null);
            this.spawnParticles(other.x, other.y, 8, '#80ff40', 'spark', 0.3);
            this.spawnFloatingText(other.x, other.y - 20, 'BLOOM!', '#80ff40');
            chained = true;
            break;
          }
        }
        if (!chained) {
          // optional: no visual if no chain target
        }
      }
    }

    // NEW: vampiric touch — heal when enemies die near player
    if (this.player.vampiricTouchLevel > 0) {
      const d = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      if (d < 200) {
        this.player.hp = Math.min(
          this.player.maxHp,
          this.player.hp + this.player.vampiricTouchLevel
        );
        if (Math.random() < 0.3) {
          this.spawnFloatingText(this.player.x, this.player.y - 28, `+${this.player.vampiricTouchLevel}`, '#ff6080');
        }
      }
    }

    // boss death
    if (e.isBoss) {
      this.spawnParticles(e.x, e.y, 60, '#ffd060', 'spark', 1.5);
      this.spawnFloatingText(e.x, e.y - 60, 'BOSS DEFEATED!', '#ffd060');
      // big soul drop
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 120;
        this.souls.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          value: Math.max(2, Math.round(e.soulValue / 12)),
          kind: 'normal',
          life: 20,
          collected: false,
          magnetized: false,
        });
      }
      // relic drop chance
      if (Math.random() < 0.6 + this.permanentBonuses.relicLuck * 0.05) {
        this.pendingRelicDrop = true;
      }
      // check if other boss is alive
      const otherBoss = this.enemies.find((x) => x.isBoss);
      if (!otherBoss) {
        this.currentBoss = null;
        this.handleBossDefeated(e.bossKind!);
      }
    }
  }

  pendingRelicDrop = false;

  damagePlayer(dmg: number, attacker?: Enemy) {
    const p = this.player;
    if (p.iframes > 0) return;

    // Spirit Walk: chance to phase through attack
    if (p.spiritWalkLevel > 0 && Math.random() < 0.15 * p.spiritWalkLevel) {
      this.spawnFloatingText(p.x, p.y - 24, 'PHASE', '#a0d8ff');
      this.spawnParticles(p.x, p.y, 6, '#a0d8ff', 'magic', 0.4);
      // COMBO: Phantom Resonance — phase also grants 1s iframes
      if (p.phantomResonanceActive) {
        p.iframes = 1;
        this.spawnFloatingText(p.x, p.y - 40, 'INVULNERABLE', '#ffd040');
        this.spawnParticles(p.x, p.y, 10, '#ffd040', 'magic', 0.6);
      }
      return;
    }

    // grave armor reduction
    if (p.graveArmorActive) {
      const armor = Math.min(8, this.minions.filter((m) => !m.isFamiliar).length);
      dmg = Math.max(1, dmg - armor);
    }
    // NEW: iron bones — flat damage reduction
    if (p.ironBonesLevel > 0) {
      dmg = Math.max(1, dmg - p.ironBonesLevel * 3);
    }
    // NEW: soul link — redirect % of damage to minions
    if (p.soulLinkLevel > 0 && this.minions.length > 0) {
      const redirect = dmg * 0.2 * p.soulLinkLevel;
      dmg -= redirect;
      // distribute redirect damage to minions (kill one if needed)
      let remaining = redirect;
      for (const m of this.minions) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, m.hp);
        m.hp -= take;
        remaining -= take;
        if (m.hp <= 0) {
          const idx = this.minions.indexOf(m);
          if (idx >= 0) {
            // Volatile Bones: explode on death
            if (p.volatileBonesLevel > 0) {
              this.volatileExplosion(m.x, m.y, m.damage * 2 * p.volatileBonesLevel);
            }
            // COMBO: Grave Echo — 25% chance to cast mini grave call on minion death
            if (p.graveEchoActive && Math.random() < 0.25) {
              this.castMiniGraveCall(m.x, m.y);
            }
            this.spawnParticles(m.x, m.y, 6, '#c8c0a8', 'bone', 0.4);
            this.minions.splice(idx, 1);
            break;
          }
        }
      }
    }
    // bone shield
    if (this.boneShieldOrbs > 0) {
      this.boneShieldOrbs--;
      this.spawnFloatingText(p.x, p.y - 24, 'BLOCK', '#a0d8ff');
      this.spawnParticles(p.x, p.y, 10, '#a0d8ff', 'spark', 0.4);
      p.iframes = 0.6;
      return;
    }
    // ===== Stage 2 elite resist: -10% damage from elite enemies per level =====
    let finalDmg = dmg;
    if (attacker?.isElite && this.permanentBonuses.stage2EliteResist > 0) {
      const resistMult = Math.max(0.1, 1 - this.permanentBonuses.stage2EliteResist * 0.1);
      finalDmg = dmg * resistMult;
    }
    p.hp -= finalDmg;
    // QOL: track damage taken
    this.damageTaken += finalDmg;
    // Apply iframe bonus from permanent upgrades
    p.iframes = 0.5 + (this.permanentBonuses.iframeBonus ?? 0) * 0.1;
    this.spawnParticles(p.x, p.y, 8, '#ff6060', 'spark', 0.4);
    this.spawnFloatingText(p.x, p.y - 24, `-${Math.round(dmg)}`, '#ff8080');

    // Crown of Thorns: attacker takes recoil damage
    if (p.skills.has('crown_of_thorns') && attacker) {
      const recoil = dmg * 0.3;
      this.damageEnemy(attacker, recoil, null);
    }

    if (p.hp <= 0) {
      // Undying Heart: survive lethal blow once per room
      if (p.skills.has('undying_heart') && !this.undyingUsedThisRoom) {
        this.undyingUsedThisRoom = true;
        p.hp = 1;
        p.iframes = 1.5;
        this.spawnFloatingText(p.x, p.y - 40, 'UNDYING!', '#ffd060');
        this.spawnParticles(p.x, p.y, 30, '#ffd060', 'magic', 1);
        return;
      }
      p.hp = 0;
      this.handleDeath();
    }
  }

  undyingUsedThisRoom = false;

  handleDeath() {
    // Extra Life (permanent upgrade): revive once per run
    if (this.extraLivesRemaining > 0) {
      this.extraLivesRemaining--;
      this.player.hp = Math.floor(this.player.maxHp * 0.5);
      this.player.iframes = 2;
      // Clear nearby enemies
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (d < 250 && !e.isBoss) {
          this.damageEnemy(e, this.player.damage * 8, null);
        }
      }
      this.spawnParticles(this.player.x, this.player.y, 50, '#ffd040', 'magic', 1.2);
      this.spawnParticles(this.player.x, this.player.y, 30, '#ffffff', 'spark', 0.8);
      this.spawnFloatingText(this.player.x, this.player.y - 40, 'EXTRA LIFE!', '#ffd040');
      return;
    }
    // Phoenix Will: revive once per room at 50% HP
    if (
      this.player.skills.has('phoenix_will') &&
      !this.phoenixUsedThisRoom
    ) {
      this.phoenixUsedThisRoom = true;
      this.player.hp = Math.floor(this.player.maxHp * 0.5);
      this.player.iframes = 2;
      // explode in fire, damaging all nearby enemies
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (d < 200) {
          this.damageEnemy(e, this.player.damage * 5, null);
        }
      }
      this.spawnParticles(this.player.x, this.player.y, 40, '#ff6020', 'spark', 1);
      this.spawnParticles(this.player.x, this.player.y, 20, '#ffd040', 'spark', 0.8);
      this.spawnFloatingText(this.player.x, this.player.y - 40, 'PHOENIX WILL!', '#ff6020');
      return;
    }
    this.setPhase('dead');
    this.cb.onDeath({
      soulsCollected: this.player.soulsCollected,
      roomsCleared: this.roomNumber - 1,
      bossesDefeated: this.enemies.filter(() => false).length,
      reachedVictory: false,
      timeSurvived: this.gameTime,
      damageTaken: Math.round(this.damageTaken),
      damageDealt: Math.round(this.damageDealt),
      kills: this.player.kills,
      elitesKilled: this.elitesKilled,
      maxCombo: this.player.comboMax,
      skillsCount: this.player.skills.size,
      zoneCleared: null,
      nextZoneUnlocked: null,
      isTrueVictory: false,
    });
  }

  phoenixUsedThisRoom = false;

  // ZONE FINAL BOSSES — defeating these ends the run with zone-victory AND unlocks the next zone
  static ZONE_FINAL_BOSSES: Record<'crypt' | 'void' | 'abyss', BossKind> = {
    crypt: 'bone_dragon',
    void: 'void_leviathan',
    abyss: 'lich_king',
  };
  // Track which zone was just cleared (so GameCanvas can unlock the next one)
  zoneJustCleared: 'crypt' | 'void' | 'abyss' | null = null;

  handleBossDefeated(kind: BossKind) {
    // ZONE SYSTEM: each zone has a final boss. Defeating it ends the run with zone-victory.
    const zoneFinalBoss = GameEngine.ZONE_FINAL_BOSSES[this.currentZone];
    if (kind === zoneFinalBoss) {
      this.zoneJustCleared = this.currentZone;
      // Determine next zone to unlock
      const nextZone: 'crypt' | 'void' | 'abyss' | null =
        this.currentZone === 'crypt' ? 'void' :
        this.currentZone === 'void' ? 'abyss' : null;
      const isTrueVictory = this.currentZone === 'abyss'; // Lich King = true final victory
      this.setPhase('dead');
      this.cb.onDeath({
        soulsCollected: this.player.soulsCollected,
        roomsCleared: this.roomNumber,
        bossesDefeated: this.currentZone === 'crypt' ? 6 : this.currentZone === 'void' ? 8 : 9,
        reachedVictory: true,
        timeSurvived: this.gameTime,
        damageTaken: Math.round(this.damageTaken),
        damageDealt: Math.round(this.damageDealt),
        kills: this.player.kills,
        elitesKilled: this.elitesKilled,
        maxCombo: this.player.comboMax,
        skillsCount: this.player.skills.size,
        zoneCleared: this.currentZone,
        nextZoneUnlocked: nextZone,
        isTrueVictory,
      });
    }
    // Mid-zone bosses (e.g. bell_knight, void_reaper_king) just continue the run
  }

  // ---------------- waves & rooms ----------------
  updateWaves(dt: number) {
    if (this.betweenWaves > 0) {
      this.betweenWaves -= dt;
      if (this.betweenWaves <= 0) {
        this.spawnNextWave();
      }
      return;
    }
    // check if wave cleared
    if (
      this.enemies.length === 0 &&
      this.pendingSpawns.length === 0 &&
      !this.currentBoss &&
      !this.roomCleared
    ) {
      // wave cleared
      if (this.waveNumber >= this.totalWavesThisRoom) {
        // room cleared
        this.roomCleared = true;
        this.handleRoomCleared();
      } else {
        this.betweenWaves = 1.5;
      }
    }
  }

  updateBoss(dt: number) {
    // boss phases handled in updateBossAI
  }

  startNextRoom() {
    // ZONE SYSTEM: roomNumber is local to the zone; globalRoomNumber is used for stage/boss logic
    this.roomNumber++;
    const globalRoom = this.globalRoomNumber;
    this.waveNumber = 0;
    this.roomCleared = false;
    this.betweenWaves = 0;
    this.undyingUsedThisRoom = false;
    this.phoenixUsedThisRoom = false;

    // boss room check (uses global room number)
    const bossEntry = BOSS_ROOM_SCHEDULE.find((b) => b.room === globalRoom);
    if (bossEntry) {
      this.totalWavesThisRoom = 1;
      this.waveNumber = 1; // boss counts as wave 1 of 1
      // spawn boss
      const bx = GAME_W / 2;
      const by = 140;
      this.pendingSpawns.push({
        x: bx,
        y: by,
        t: 1,
        kind: 'knight',
        isBoss: true,
        bossKind: bossEntry.boss,
      });
      this.spawnFloatingText(GAME_W / 2, GAME_H / 2 - 60, 'BOSS APPROACHES', '#ff6060');
    } else {
      this.totalWavesThisRoom = wavesPerRoom(globalRoom);
      this.spawnNextWave();
    }
    this.emitHud();
  }

  spawnNextWave() {
    this.waveNumber++;
    const blackCandle = this.relics.some((r) => r.id === 'black_candle');
    let kinds = generateWave(
      this.globalRoomNumber,
      this.waveNumber - 1,
      this.totalWavesThisRoom,
      blackCandle
    );
    // ===== PERFORMANCE: cap wave size to prevent late-game lag =====
    const MAX_WAVE_SIZE = 40;
    if (kinds.length > MAX_WAVE_SIZE) {
      kinds = kinds.slice(0, MAX_WAVE_SIZE);
    }
    for (const kind of kinds) {
      // spawn from edges
      const edge = Math.floor(Math.random() * 4);
      let x = 0;
      let y = 0;
      if (edge === 0) {
        x = Math.random() * GAME_W;
        y = 40;
      } else if (edge === 1) {
        x = Math.random() * GAME_W;
        y = GAME_H - 40;
      } else if (edge === 2) {
        x = 40;
        y = Math.random() * GAME_H;
      } else {
        x = GAME_W - 40;
        y = Math.random() * GAME_H;
      }
      this.pendingSpawns.push({ x, y, t: 0.4 + Math.random() * 0.6, kind });
    }
    this.emitHud();
  }

  handleRoomCleared() {
    // ===== AUTO-COLLECT SOULS: vacuum all remaining souls on the ground =====
    let autoGained = 0;
    let autoHealed = 0;
    let chestsCollected = 0;
    for (const s of this.souls) {
      if (s.collected) continue;
      if (s.kind === 'heal') {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 8);
        autoHealed++;
      } else if (s.kind === 'chest') {
        // Defer chest to next upgrade choice flow
        chestsCollected++;
      } else {
        const gain = Math.max(1, Math.round(s.value * this.player.soulGainMult));
        this.player.soulsCollected += gain;
        autoGained += gain;
        // Charge soul meter
        this.player.soulMeter = Math.min(this.player.soulMeterMax, this.player.soulMeter + 1);
      }
    }
    this.souls = []; // clear all souls (chests deferred will be re-queued below)
    if (autoGained > 0 || autoHealed > 0) {
      this.spawnFloatingText(
        this.player.x,
        this.player.y - 40,
        `+${autoGained} souls, +${autoHealed * 8} HP`,
        '#7affa0'
      );
    }
    // heal a little
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 10);
    // offer upgrade or relic
    if (this.pendingRelicDrop) {
      this.pendingRelicDrop = false;
      this.offerRelicChoices();
    } else if (chestsCollected > 0) {
      // open any chests that were auto-collected
      this.openGoldenChest();
    } else {
      this.offerUpgradeChoices();
    }
  }

  // ---------------- upgrades ----------------
  offerUpgradeChoices() {
    const p = this.player;
    const boneDice = this.relics.some((r) => r.id === 'bone_dice');
    const luckBonus = this.permanentBonuses.relicLuck * 0.03;
    const choices: Upgrade[] = [];
    const available = UPGRADES.filter((u) => {
      if (u.requires && !u.requires(p)) return false;
      // ===== EPIC UNIQUENESS: epic skills are one-time-only per run =====
      if (u.rarity === 'epic' && p.skills.has(u.id)) return false;
      return true;
    });
    // bias by build path the player has invested in
    const pathCounts: Record<string, number> = {
      necromancy: countSkillsInPath(p, 'necromancy'),
      wand: countSkillsInPath(p, 'wand'),
      survival: countSkillsInPath(p, 'survival'),
      generic: 0,
    };
    const tries = boneDice ? 24 : 12;
    const seen = new Set<string>();
    while (choices.length < 3 && tries > 0) {
      const cand = available[Math.floor(Math.random() * available.length)];
      if (seen.has(cand.id)) {
        // continue
      } else {
        seen.add(cand.id);
      }
      // weighted pick
      const r = Math.random();
      const epicChance = boneDice ? 0.25 : 0.08 + luckBonus;
      const rareChance = boneDice ? 0.55 : 0.32 + luckBonus;
      let weight = 1;
      if (cand.rarity === 'epic') weight = epicChance;
      else if (cand.rarity === 'rare') weight = rareChance;
      else weight = 1 - epicChance - rareChance;
      // path bias: small boost to invested paths
      weight *= 1 + (pathCounts[cand.path] ?? 0) * 0.1;
      if (r < weight && !choices.find((c) => c.id === cand.id)) {
        choices.push(cand);
      }
      // safety: if we've seen enough unique candidates, accept
      if (seen.size >= available.length && choices.length < 3) {
        const remaining = available.filter(
          (a) => !choices.find((c) => c.id === a.id)
        );
        if (remaining.length > 0) {
          choices.push(remaining[Math.floor(Math.random() * remaining.length)]);
        }
      }
      // break to avoid infinite
      if (seen.size > 30) break;
    }
    // ensure 3 choices
    while (choices.length < 3) {
      const cand = available[Math.floor(Math.random() * available.length)];
      if (!choices.find((c) => c.id === cand.id)) choices.push(cand);
      if (available.length <= choices.length) break;
    }
    this.upgradeChoices = choices;
    this.setPhase('upgrade');
    this.cb.onUpgradeChoices(choices);
  }

  chooseUpgrade(idx: number) {
    const up = this.upgradeChoices[idx];
    if (!up) return;
    up.apply(this.player);
    this.upgradeChoices = [];
    this.continueAfterChoice();
  }

  offerRelicChoices() {
    // 3 relic choices
    const choices: Relic[] = [];
    const pool = [...RELICS].filter((r) => !this.relics.find((x) => x.id === r.id));
    while (choices.length < 3 && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length);
      choices.push(pool.splice(i, 1)[0]);
    }
    if (choices.length === 0) {
      // no relics left, offer upgrade instead
      this.offerUpgradeChoices();
      return;
    }
    this.relicChoices = choices;
    this.pendingRelicChoice = true;
    this.setPhase('upgrade');
    this.cb.onRelicChoices(choices);
  }

  chooseRelic(idx: number) {
    const r = this.relicChoices[idx];
    if (!r) return;
    r.apply(this.player);
    this.relics.push(r);
    this.relicChoices = [];
    this.pendingRelicChoice = false;
    this.continueAfterChoice();
  }

  // ===== GOLDEN CHEST (Blessed by God) =====
  openGoldenChest() {
    // Generate 3 RARE+ upgrade choices
    const p = this.player;
    const choices: Upgrade[] = [];
    const available = UPGRADES.filter((u) => {
      if (u.rarity === 'common') return false; // only rare and epic
      if (u.requires && !u.requires(p)) return false;
      // EPIC UNIQUENESS: epic skills are one-time-only per run
      if (u.rarity === 'epic' && p.skills.has(u.id)) return false;
      return true;
    });
    const pool = [...available];
    while (choices.length < 3 && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length);
      choices.push(pool.splice(i, 1)[0]);
    }
    if (choices.length === 0) {
      // fallback: give any upgrade
      this.offerUpgradeChoices();
      return;
    }
    this.chestChoices = choices;
    this.pendingChestChoice = true;
    this.rerollsUsed = 0;
    this.setPhase('chest');
    this.cb.onChestChoices(choices);
    this.spawnParticles(this.player.x, this.player.y, 30, '#ffd040', 'magic', 1);
    this.spawnFloatingText(this.player.x, this.player.y - 40, '✨ GOLDEN CHEST!', '#ffd040');
  }

  chooseChestUpgrade(idx: number) {
    const up = this.chestChoices[idx];
    if (!up) return;
    up.apply(this.player);
    this.chestChoices = [];
    this.pendingChestChoice = false;
    // Chest rewards don't advance the room — just resume playing
    this.setPhase('playing');
  }

  // ===== REROLL (refresh skill choices) =====
  rerollChoices() {
    // Only allow during upgrade or chest phase
    if (this.phase !== 'upgrade' && this.phase !== 'chest') return;
    // Cost: 50 souls per reroll
    const cost = 50;
    if (this.player.soulsCollected < cost) return;
    this.player.soulsCollected -= cost;
    this.rerollsUsed++;
    if (this.phase === 'chest') {
      // Re-generate chest choices (still RARE+)
      const p = this.player;
      const choices: Upgrade[] = [];
      const available = UPGRADES.filter((u) => {
        if (u.rarity === 'common') return false;
        if (u.requires && !u.requires(p)) return false;
        // EPIC UNIQUENESS: epic skills are one-time-only per run
        if (u.rarity === 'epic' && p.skills.has(u.id)) return false;
        return true;
      });
      const pool = [...available];
      while (choices.length < 3 && pool.length > 0) {
        const i = Math.floor(Math.random() * pool.length);
        choices.push(pool.splice(i, 1)[0]);
      }
      this.chestChoices = choices;
      this.cb.onChestChoices(choices);
    } else {
      // Re-generate upgrade choices
      this.offerUpgradeChoices();
    }
  }

  continueAfterChoice() {
    this.setPhase('playing');
    this.startNextRoom();
  }

  // ---------------- abilities ----------------
  tryDash() {
    // Used by auto-dash trigger
    const p = this.player;
    if (p.phantomDashLevel < 1) return;
    if (p.dashCooldownTimer > 0) return;
    p.dashTimer = 0.18;
    p.dashCooldownTimer = p.dashCooldown;
    p.iframes = 0.25;
    this.spawnParticles(p.x, p.y, 12, '#b58cff', 'magic', 0.4);
  }

  spawnDeathRayShot() {
    const p = this.player;
    const target = this.findNearestEnemy(p.x, p.y, 9999);
    let ang = p.facing;
    if (target) ang = Math.atan2(target.y - p.y, target.x - p.x);
    this.spawnProjectile({
      x: p.x + Math.cos(ang) * 20,
      y: p.y + Math.sin(ang) * 20,
      vx: Math.cos(ang) * 1000,
      vy: Math.sin(ang) * 1000,
      damage: p.damage * 3,
      radius: 22,
      life: 0.6,
      pierceLeft: 99,
      chainLeft: 0,
      fromPlayer: true,
      kind: 'deathray',
      color: '#ff4080',
    });
  }

  // ---------------- helpers ----------------
  findNearestEnemy(
    x: number,
    y: number,
    maxDist: number,
    exclude?: Set<number>
  ): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxDist;
    for (const e of this.enemies) {
      if (exclude && exclude.has(e.id)) continue;
      if (e.kind === 'ghost' && !e.phaseActive) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  // QOL: Smart targeting priority: boss > elite > nearest
  // Bosses always take priority regardless of distance (within reason).
  // Elites are preferred if within 1.6x the distance of the nearest non-elite.
  findSmartTarget(x: number, y: number): Enemy | null {
    if (this.enemies.length === 0) return null;
    let boss: Enemy | null = null;
    let elite: Enemy | null = null;
    let nearest: Enemy | null = null;
    let nearestD = Infinity;
    let eliteD = Infinity;
    for (const e of this.enemies) {
      if (e.kind === 'ghost' && !e.phaseActive) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (e.isBoss) {
        // boss always wins (prefer the closest boss if multiple)
        if (!boss || d < Math.hypot(boss.x - x, boss.y - y)) boss = e;
      }
      if (e.isElite && d < eliteD) {
        eliteD = d;
        elite = e;
      }
      if (d < nearestD) {
        nearestD = d;
        nearest = e;
      }
    }
    if (boss) return boss;
    // Elite preferred if within 1.6x nearest distance (so they don't run across the map)
    if (elite && eliteD <= nearestD * 1.6) return elite;
    return nearest;
  }

  // QOL: Compute boss special attack telegraph (warning 1.5s before special fires)
  computeBossTelegraph(): { name: string; timer: number } | null {
    const b = this.currentBoss;
    if (!b || !b.isBoss || !b.bossKind) return null;
    const timer = b.bossSpecialTimer ?? 0;
    // Only telegraph if special is about to fire (within 1.5s)
    if (timer > 1.5 || timer <= 0) return null;
    const names: Record<string, string> = {
      bell_knight: 'SHOCKWAVE',
      twins: 'SUMMON ADDS',
      sun_priest: 'PURGE',
      bone_dragon: 'BONE SPIRAL',
      wraith_queen: 'TELEPORT + SUMMON',
      bone_colossus: 'SUMMON + HEAL',
      void_reaper_king: 'TELEPORT + SCYTHE RING',
      void_leviathan: 'SUMMON WRATHS',
      lich_king: 'SUMMON ARMY',
    };
    return {
      name: names[b.bossKind] ?? 'SPECIAL',
      timer: Math.max(0, timer),
    };
  }

  emitHud() {
    const p = this.player;
    const snapshot: HudSnapshot = {
      hp: Math.max(0, Math.round(p.hp)),
      maxHp: Math.round(p.maxHp),
      souls: p.soulsCollected,
      wandLevel: p.wandLevel,
      wandType: p.wandType,
      minions: this.minions.length,
      maxMinions: p.maxMinions,
      kills: p.kills,
      skills: Array.from(p.skills),
      relics: this.relics.map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
      })),
      soulMeter: p.soulMeter,
      soulMeterMax: p.soulMeterMax,
      comboCount: p.comboCount,
      comboTimer: p.comboTimer,
      comboMax: p.comboMax,
      elitesKilled: this.elitesKilled,
      // QOL fields
      timeSurvived: this.gameTime,
      damageTaken: Math.round(this.damageTaken),
      damageDealt: Math.round(this.damageDealt),
      buildPaths: {
        necromancy: countSkillsInPath(p, 'necromancy'),
        wand: countSkillsInPath(p, 'wand'),
        survival: countSkillsInPath(p, 'survival'),
        generic: countSkillsInPath(p, 'generic'),
      },
      // Stage info — based on global room number (which factors in zone offset)
      stage: getStage(this.globalRoomNumber),
      stageName: STAGE_NAMES[getStage(this.globalRoomNumber)].name,
      stageColor: STAGE_NAMES[getStage(this.globalRoomNumber)].color,
      targetId: this.currentTargetId,
      targetX: this.currentTargetId
        ? this.enemies.find((e) => e.id === this.currentTargetId)?.x ?? 0
        : 0,
      targetY: this.currentTargetId
        ? this.enemies.find((e) => e.id === this.currentTargetId)?.y ?? 0
        : 0,
      bossSpecialTelegraph: this.computeBossTelegraph(),
      cooldowns: {
        dash: p.dashCooldownTimer,
        dashMax: p.dashCooldown,
        army: p.armyOfDeadCooldown,
        armyMax: 40,
        deathRay: p.deathRayCooldown,
        deathRayMax: 25,
        lich: p.lichFormCooldown,
        lichMax: 45,
        boneShield: p.boneShieldInterval - this.boneShieldRecharge,
        boneShieldMax: p.boneShieldInterval,
        graveCall: 12 - p.graveCallAutoTimer,
        graveCallMax: 12,
        blackHole: 15 - p.blackHoleTimer,
        blackHoleMax: 15,
        meteor: 5 - p.meteorTimer,
        meteorMax: 5,
        timeWarp: 18 - p.timeWarpTimer,
        timeWarpMax: 18,
        earthquake: 12 - p.earthquakeTimer,
        earthquakeMax: 12,
        boneWall: 8 - p.boneWallTimer,
        boneWallMax: 8,
      },
      ultimatesActive: {
        army: p.armyOfDeadTimer,
        deathRay: p.deathRayTimer,
        lich: p.lichFormTimer,
      },
      room: {
        roomNumber: this.roomNumber,
        waveNumber: this.waveNumber,
        totalWaves: this.totalWavesThisRoom,
        enemiesRemaining: this.enemies.length + this.pendingSpawns.length,
        isBoss: !!this.currentBoss,
        bossName: this.currentBoss?.bossKind
          ? BOSS_TEMPLATES[this.currentBoss.bossKind].name
          : undefined,
        bossHp: this.currentBoss?.hp,
        bossMaxHp: this.currentBoss?.maxHp,
      },
    };
    this.cb.onHudUpdate(snapshot);
  }
}
