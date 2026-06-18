// ===== Game content: skills, upgrades, relics, enemy/boss stats =====
import type {
  BossKind,
  Enemy,
  EnemyKind,
  Player,
  Relic,
  Upgrade,
} from './types';

// ---------- Starting player ----------
export function createStartingPlayer(permanentBonuses: {
  healthBonus: number;
  wandPowerBonus: number;
  soulGainBonus: number;
  minionPowerBonus: number;
  moveSpeedBonus: number;
  wandType: string;
}): Player {
  const baseWandDamage = 8 + permanentBonuses.wandPowerBonus * 3;
  const baseMaxHp = 100 + permanentBonuses.healthBonus * 20;
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    hp: baseMaxHp,
    maxHp: baseMaxHp,
    speed: 180 + permanentBonuses.moveSpeedBonus * 12,
    facing: 0,
    radius: 14,

    wandLevel: 1,
    fireRate: 2.2,
    damage: baseWandDamage,
    projectileSpeed: 480,
    projectileCount: 1,
    pierce: 0,
    chainCount: 0,
    projectileSpread: 0,
    dotChance: 0,
    dotDamage: 0,
    beamActive: false,
    skullMissileLevel: 0,
    cursedBarrageLevel: 0,
    homingSoulLevel: 0,
    volatileBonesLevel: 0,
    splitterBoltLevel: 0,

    soulPickupRange: 80,
    soulGainMult: 1 + permanentBonuses.soulGainBonus * 0.15,

    minionDamage: 6 + permanentBonuses.minionPowerBonus * 2,
    minionDuration: 12,
    raiseChance: 0,
    maxMinions: 0,
    boneServantActive: false,
    rottingFamiliarActive: false,
    graveCallLevel: 0,
    graveCallAutoTimer: 0,
    soulBinding: false,
    swarmKillCounter: 0,
    swarmThreshold: 999,
    commandActive: false,
    boneBeastActive: false,
    wraithActive: false,

    soulDrainChance: 0,
    soulDrainAmount: 1,
    boneShieldCount: 0,
    boneShieldTimer: 0,
    boneShieldInterval: 30,
    cursedGroundLevel: 0,
    dashCooldown: 0,
    dashTimer: 0,
    dashCooldownTimer: 0,
    phantomDashLevel: 0,
    lastLaughActive: false,
    graveArmorActive: false,
    auraOfDecayLevel: 0,
    auraOfDecayTimer: 0,
    vampiricAuraLevel: 0,
    spiritWalkLevel: 0,
    boneStormLevel: 0,

    armyOfDeadTimer: 0,
    armyOfDeadCooldown: 0,
    deathRayTimer: 0,
    deathRayCooldown: 0,
    deathRayAutoTimer: 0,
    lichFormTimer: 0,
    lichFormCooldown: 0,

    soulMeter: 0,
    soulMeterMax: 50,

    lastFireTime: 0,
    iframes: 0,
    skills: new Set<string>(),
    kills: 0,
    soulsCollected: 0,
    wandType: permanentBonuses.wandType,
  };
}

// ---------- Upgrades ----------
// Each upgrade has a base id; some can be picked multiple times (stacking).
export const UPGRADES: Upgrade[] = [
  // ===== Wand offense =====
  {
    id: 'fire_rate',
    name: 'Cursed Cadence',
    description: '+25% wand fire rate.',
    path: 'wand',
    rarity: 'common',
    icon: '⚡',
    apply: (p) => {
      p.fireRate *= 1.25;
      p.wandLevel += 1;
    },
  },
  {
    id: 'extra_projectile',
    name: 'Twin Bones',
    description: '+1 wand projectile per shot.',
    path: 'wand',
    rarity: 'rare',
    icon: '🦴',
    requires: (p) => p.projectileCount < 5,
    apply: (p) => {
      p.projectileCount += 1;
      p.projectileSpread = 0.18 * (p.projectileCount - 1);
      p.wandLevel += 1;
    },
  },
  {
    id: 'wand_damage',
    name: 'Soul Edge',
    description: '+30% wand damage.',
    path: 'wand',
    rarity: 'common',
    icon: '✦',
    apply: (p) => {
      p.damage *= 1.3;
      p.wandLevel += 1;
    },
  },
  {
    id: 'soul_spark',
    name: 'Soul Spark',
    description: 'Wand shots chain to +1 nearby enemy.',
    path: 'wand',
    rarity: 'rare',
    icon: '⚡',
    requires: (p) => !p.skills.has('soul_spark'),
    apply: (p) => {
      p.chainCount += 1;
      p.skills.add('soul_spark');
      p.wandLevel += 1;
    },
  },
  {
    id: 'skull_missile',
    name: 'Skull Missile',
    description: 'Every 4th shot is a slow, exploding skull.',
    path: 'wand',
    rarity: 'rare',
    icon: '💀',
    requires: (p) => p.skullMissileLevel < 3,
    apply: (p) => {
      p.skullMissileLevel += 1;
      p.wandLevel += 1;
    },
  },
  {
    id: 'grave_beam',
    name: 'Grave Beam',
    description: 'Wand periodically fires a piercing dark beam.',
    path: 'wand',
    rarity: 'rare',
    icon: '▰',
    apply: (p) => {
      p.beamActive = true;
      p.wandLevel += 1;
    },
  },
  {
    id: 'cursed_barrage',
    name: 'Cursed Barrage',
    description: 'Wand fires bursts of weaker shots.',
    path: 'wand',
    rarity: 'rare',
    icon: '☄',
    requires: (p) => p.cursedBarrageLevel < 2,
    apply: (p) => {
      p.cursedBarrageLevel += 1;
      p.fireRate *= 1.15;
      p.damage *= 0.85;
      p.wandLevel += 1;
    },
  },
  {
    id: 'piercing_bone',
    name: 'Piercing Bone Shard',
    description: 'Wand shots pierce +1 enemy.',
    path: 'wand',
    rarity: 'rare',
    icon: '➹',
    requires: (p) => p.pierce < 4,
    apply: (p) => {
      p.pierce += 1;
      p.wandLevel += 1;
    },
  },
  {
    id: 'soul_burn',
    name: 'Soul Burn',
    description: 'Wand hits apply damage over time.',
    path: 'wand',
    rarity: 'rare',
    icon: '🔥',
    requires: (p) => !p.skills.has('soul_burn'),
    apply: (p) => {
      p.dotChance = 0.6;
      p.dotDamage = p.damage * 0.4;
      p.skills.add('soul_burn');
      p.wandLevel += 1;
    },
  },
  {
    id: 'death_ray',
    name: 'Death Ray [ULTIMATE]',
    description: 'AUTO: Every 25s, fire a huge necromantic beam across the room.',
    path: 'wand',
    rarity: 'epic',
    icon: '☠',
    requires: (p) =>
      p.skills.has('soul_spark') || p.skills.has('piercing_bone'),
    apply: (p) => {
      p.deathRayCooldown = 30; // unlock + cooldown
      p.skills.add('death_ray');
      p.wandLevel += 2;
    },
  },
  {
    id: 'proj_speed',
    name: 'Spectral Velocity',
    description: '+25% projectile speed.',
    path: 'wand',
    rarity: 'common',
    icon: '➳',
    apply: (p) => {
      p.projectileSpeed *= 1.25;
      p.wandLevel += 1;
    },
  },

  // ===== Necromancy =====
  {
    id: 'raise_bones',
    name: 'Raise Bones',
    description: '25% chance slain enemies rise as skeleton minions.',
    path: 'necromancy',
    rarity: 'common',
    icon: '☠',
    requires: (p) => !p.skills.has('raise_bones'),
    apply: (p) => {
      p.raiseChance = 0.25;
      p.maxMinions = Math.max(p.maxMinions, 4);
      p.skills.add('raise_bones');
    },
  },
  {
    id: 'raise_bones_2',
    name: 'Restless Dead',
    description: '+15% raise chance, +2 max minions.',
    path: 'necromancy',
    rarity: 'common',
    icon: '☠',
    requires: (p) => p.skills.has('raise_bones'),
    apply: (p) => {
      p.raiseChance = Math.min(0.6, p.raiseChance + 0.15);
      p.maxMinions += 2;
    },
  },
  {
    id: 'bone_servant',
    name: 'Bone Servant',
    description: 'A permanent skeleton guard follows you.',
    path: 'necromancy',
    rarity: 'rare',
    icon: '🛡',
    requires: (p) => !p.boneServantActive,
    apply: (p) => {
      p.boneServantActive = true;
      p.maxMinions += 1;
      p.skills.add('bone_servant');
    },
  },
  {
    id: 'grave_call',
    name: 'Grave Call',
    description: 'AUTO: Every 12s, raise 4 temporary skeletons around you.',
    path: 'necromancy',
    rarity: 'rare',
    icon: '✚',
    requires: (p) => p.graveCallLevel < 1,
    apply: (p) => {
      p.graveCallLevel = 1;
      p.skills.add('grave_call');
      p.maxMinions += 2;
    },
  },
  {
    id: 'rotting_familiar',
    name: 'Rotting Familiar',
    description: 'A floating skull companion shoots magic bolts.',
    path: 'necromancy',
    rarity: 'rare',
    icon: '👁',
    requires: (p) => !p.rottingFamiliarActive,
    apply: (p) => {
      p.rottingFamiliarActive = true;
      p.skills.add('rotting_familiar');
    },
  },
  {
    id: 'soul_binding',
    name: 'Soul Binding',
    description: 'Minions last 50% longer and deal +40% damage.',
    path: 'necromancy',
    rarity: 'rare',
    icon: '⛓',
    apply: (p) => {
      p.soulBinding = true;
      p.minionDuration *= 1.5;
      p.minionDamage *= 1.4;
      p.skills.add('soul_binding');
    },
  },
  {
    id: 'undead_swarm',
    name: 'Undead Swarm',
    description: 'Every 8 kills, crawlers rush the enemy.',
    path: 'necromancy',
    rarity: 'rare',
    icon: '🪱',
    requires: (p) => !p.skills.has('undead_swarm'),
    apply: (p) => {
      p.swarmThreshold = 8;
      p.skills.add('undead_swarm');
      p.maxMinions += 2;
    },
  },
  {
    id: 'necromancer_command',
    name: "Necromancer's Command",
    description: 'Minions move +60% faster and attack aggressively.',
    path: 'necromancy',
    rarity: 'rare',
    icon: '👑',
    apply: (p) => {
      p.commandActive = true;
      p.skills.add('necromancer_command');
    },
  },
  {
    id: 'army_of_dead',
    name: 'Army of the Dead [ULTIMATE]',
    description: 'AUTO: When 8+ enemies near, summon a horde of undead allies for 8s.',
    path: 'necromancy',
    rarity: 'epic',
    icon: '☠',
    requires: (p) =>
      p.skills.has('raise_bones') && p.maxMinions >= 6,
    apply: (p) => {
      p.armyOfDeadCooldown = 40;
      p.skills.add('army_of_dead');
      p.maxMinions += 4;
    },
  },
  {
    id: 'minion_damage',
    name: 'Bone Sharpening',
    description: '+30% minion damage.',
    path: 'necromancy',
    rarity: 'common',
    icon: '⚔',
    apply: (p) => {
      p.minionDamage *= 1.3;
    },
  },

  // ===== Survival =====
  {
    id: 'bone_shield',
    name: 'Bone Shield',
    description: 'A floating bone blocks one hit every 30s.',
    path: 'survival',
    rarity: 'common',
    icon: '🦴',
    requires: (p) => p.boneShieldCount < 4,
    apply: (p) => {
      p.boneShieldCount += 1;
      p.boneShieldTimer = 0;
      p.skills.add('bone_shield');
    },
  },
  {
    id: 'soul_drain',
    name: 'Soul Drain',
    description: '15% chance on hit to heal 2 HP.',
    path: 'survival',
    rarity: 'common',
    icon: '✚',
    requires: (p) => !p.skills.has('soul_drain'),
    apply: (p) => {
      p.soulDrainChance = 0.15;
      p.soulDrainAmount = 2;
      p.skills.add('soul_drain');
    },
  },
  {
    id: 'soul_drain_2',
    name: 'Deeper Drain',
    description: '+10% drain chance, +2 heal amount.',
    path: 'survival',
    rarity: 'common',
    icon: '✚',
    requires: (p) => p.skills.has('soul_drain'),
    apply: (p) => {
      p.soulDrainChance = Math.min(0.4, p.soulDrainChance + 0.1);
      p.soulDrainAmount += 2;
    },
  },
  {
    id: 'cursed_ground',
    name: 'Cursed Ground',
    description: 'Periodically create damaging dark circles.',
    path: 'survival',
    rarity: 'rare',
    icon: '⬮',
    requires: (p) => p.cursedGroundLevel < 3,
    apply: (p) => {
      p.cursedGroundLevel += 1;
      p.skills.add('cursed_ground');
    },
  },
  {
    id: 'phantom_dash',
    name: 'Phantom Dash',
    description: 'AUTO: Dash through enemies when they get too close, brief invulnerability.',
    path: 'survival',
    rarity: 'rare',
    icon: '»',
    requires: (p) => p.phantomDashLevel < 1,
    apply: (p) => {
      p.phantomDashLevel = 1;
      p.dashCooldown = 3.5;
      p.skills.add('phantom_dash');
    },
  },
  {
    id: 'last_laugh',
    name: 'Last Laugh',
    description: 'Below 30% HP, wand attacks deal +50% damage.',
    path: 'survival',
    rarity: 'rare',
    icon: '💀',
    requires: (p) => !p.skills.has('last_laugh'),
    apply: (p) => {
      p.lastLaughActive = true;
      p.skills.add('last_laugh');
    },
  },
  {
    id: 'grave_armor',
    name: 'Grave Armor',
    description: '+1 armor (flat damage reduction) per alive minion.',
    path: 'survival',
    rarity: 'rare',
    icon: '🛡',
    requires: (p) => !p.skills.has('grave_armor'),
    apply: (p) => {
      p.graveArmorActive = true;
      p.skills.add('grave_armor');
    },
  },
  {
    id: 'lich_form',
    name: 'Lich Form [ULTIMATE]',
    description: 'AUTO: When HP drops below 35%, transform for 8s: faster, stronger, drain doubled.',
    path: 'survival',
    rarity: 'epic',
    icon: '👑',
    requires: (p) =>
      p.skills.has('soul_drain') || p.skills.has('bone_shield'),
    apply: (p) => {
      p.lichFormCooldown = 45;
      p.skills.add('lich_form');
      p.maxHp += 20;
      p.hp += 20;
    },
  },
  {
    id: 'max_hp',
    name: 'Tough Bones',
    description: '+25 max HP and heal for 25.',
    path: 'survival',
    rarity: 'common',
    icon: '❤',
    apply: (p) => {
      p.maxHp += 25;
      p.hp = Math.min(p.maxHp, p.hp + 25);
    },
  },
  {
    id: 'move_speed',
    name: 'Swift Bones',
    description: '+12% move speed.',
    path: 'survival',
    rarity: 'common',
    icon: '➤',
    apply: (p) => {
      p.speed *= 1.12;
    },
  },

  // ===== Generic / utility =====
  {
    id: 'soul_pickup',
    name: 'Soul Magnet',
    description: '+50% soul pickup range.',
    path: 'generic',
    rarity: 'common',
    icon: '✦',
    apply: (p) => {
      p.soulPickupRange *= 1.5;
    },
  },
  {
    id: 'soul_gain',
    name: 'Soul Hoarder',
    description: '+25% souls collected.',
    path: 'generic',
    rarity: 'common',
    icon: '✦',
    apply: (p) => {
      p.soulGainMult *= 1.25;
    },
  },

  // ===== NEW POWERS: Wand Offense =====
  {
    id: 'homing_soul',
    name: 'Homing Soul',
    description: 'Every 5th shot homes toward nearest enemy.',
    path: 'wand',
    rarity: 'rare',
    icon: '◎',
    requires: (p) => p.homingSoulLevel < 3,
    apply: (p) => {
      p.homingSoulLevel += 1;
      p.wandLevel += 1;
    },
  },
  {
    id: 'splitter_bolt',
    name: 'Splitter Bolt',
    description: 'Wand shots split into 2 smaller bolts on hit.',
    path: 'wand',
    rarity: 'rare',
    icon: '✲',
    requires: (p) => p.splitterBoltLevel < 2,
    apply: (p) => {
      p.splitterBoltLevel += 1;
      p.wandLevel += 1;
    },
  },
  {
    id: 'volatile_bones',
    name: 'Volatile Bones',
    description: 'Minions explode into bone shrapnel on death.',
    path: 'necromancy',
    rarity: 'rare',
    icon: '💥',
    requires: (p) => p.volatileBonesLevel < 3,
    apply: (p) => {
      p.volatileBonesLevel += 1;
    },
  },
  {
    id: 'bone_beast',
    name: 'Bone Beast',
    description: 'Summon a tanky bone beast that charges enemies.',
    path: 'necromancy',
    rarity: 'epic',
    icon: '🐉',
    requires: (p) => !p.boneBeastActive && p.maxMinions >= 4,
    apply: (p) => {
      p.boneBeastActive = true;
      p.maxMinions += 1;
      p.skills.add('bone_beast');
    },
  },
  {
    id: 'wraith',
    name: 'Wraith Servant',
    description: 'A fast flying wraith slashes through enemies.',
    path: 'necromancy',
    rarity: 'epic',
    icon: '👻',
    requires: (p) => !p.wraithActive && p.maxMinions >= 4,
    apply: (p) => {
      p.wraithActive = true;
      p.maxMinions += 1;
      p.skills.add('wraith');
    },
  },
  {
    id: 'minion_hp',
    name: 'Sturdy Bones',
    description: 'Minions have +50% HP and +20% duration.',
    path: 'necromancy',
    rarity: 'common',
    icon: '🛡',
    apply: (p) => {
      p.minionDuration *= 1.2;
    },
  },

  // ===== NEW POWERS: Survival =====
  {
    id: 'aura_of_decay',
    name: 'Aura of Decay',
    description: 'Passive: enemies near you take continuous damage.',
    path: 'survival',
    rarity: 'rare',
    icon: '☣',
    requires: (p) => p.auraOfDecayLevel < 3,
    apply: (p) => {
      p.auraOfDecayLevel += 1;
      p.skills.add('aura_of_decay');
    },
  },
  {
    id: 'vampiric_aura',
    name: 'Vampiric Aura',
    description: 'Passive: minions heal you for 10% of damage dealt.',
    path: 'survival',
    rarity: 'rare',
    icon: '🩸',
    requires: (p) => p.vampiricAuraLevel < 3,
    apply: (p) => {
      p.vampiricAuraLevel += 1;
      p.skills.add('vampiric_aura');
    },
  },
  {
    id: 'spirit_walk',
    name: 'Spirit Walk',
    description: 'Passive: 15% chance to phase through enemy attacks.',
    path: 'survival',
    rarity: 'rare',
    icon: '🌫',
    requires: (p) => p.spiritWalkLevel < 3,
    apply: (p) => {
      p.spiritWalkLevel += 1;
      p.skills.add('spirit_walk');
    },
  },
  {
    id: 'bone_storm',
    name: 'Bone Storm',
    description: 'Bones orbit you, damaging enemies they hit.',
    path: 'survival',
    rarity: 'rare',
    icon: '🌀',
    requires: (p) => p.boneStormLevel < 3,
    apply: (p) => {
      p.boneStormLevel += 1;
      p.skills.add('bone_storm');
    },
  },

  // ===== NEW POWERS: Generic / Soul Meter =====
  {
    id: 'soul_nova',
    name: 'Soul Nova',
    description: 'Soul meter charges 30% faster.',
    path: 'generic',
    rarity: 'rare',
    icon: '✺',
    apply: (p) => {
      p.soulMeterMax = Math.max(20, p.soulMeterMax * 0.7);
    },
  },
  {
    id: 'soul_battery',
    name: 'Soul Battery',
    description: 'Soul Nova deals +50% damage.',
    path: 'generic',
    rarity: 'rare',
    icon: '🔋',
    apply: (p) => {
      p.skills.add('soul_battery');
    },
  },
];

// ---------- Relics ----------
export const RELICS: Relic[] = [
  {
    id: 'cracked_crown',
    name: 'Cracked Crown',
    description: '+2 max minions, -20 max HP.',
    rarity: 'rare',
    icon: '👑',
    apply: (p) => {
      p.maxMinions += 2;
      p.maxHp = Math.max(40, p.maxHp - 20);
      p.hp = Math.min(p.hp, p.maxHp);
    },
  },
  {
    id: 'grave_king_wand',
    name: 'Wand of the Grave King',
    description: '+60% wand damage, -20% fire rate.',
    rarity: 'rare',
    icon: '🪄',
    apply: (p) => {
      p.damage *= 1.6;
      p.fireRate *= 0.8;
    },
  },
  {
    id: 'bone_dice',
    name: 'Bone Dice',
    description: 'Upgrade luck: more rare choices appear.',
    rarity: 'rare',
    icon: '🎲',
    apply: () => {},
  },
  {
    id: 'black_candle',
    name: 'Black Candle',
    description: '+50% souls, +30% enemies per wave.',
    rarity: 'rare',
    icon: '🕯',
    apply: (p) => {
      p.soulGainMult *= 1.5;
    },
  },
  {
    id: 'lich_finger',
    name: "Lich's Finger",
    description: 'Soul Drain chance doubled, heal halved.',
    rarity: 'rare',
    icon: '👆',
    apply: (p) => {
      if (p.soulDrainChance > 0) {
        p.soulDrainChance = Math.min(0.6, p.soulDrainChance * 2);
        p.soulDrainAmount = Math.max(1, Math.floor(p.soulDrainAmount / 2));
      } else {
        // grant a tiny drain if not present
        p.soulDrainChance = 0.1;
        p.soulDrainAmount = 1;
      }
    },
  },
  {
    id: 'soul_urn',
    name: 'Soul Urn',
    description: '+30% wand damage, +1 pierce.',
    rarity: 'epic',
    icon: '🏺',
    apply: (p) => {
      p.damage *= 1.3;
      p.pierce += 1;
    },
  },
  {
    id: 'grave_veil',
    name: 'Grave Veil',
    description: '+30 max HP, +10% move speed.',
    rarity: 'epic',
    icon: '🕸',
    apply: (p) => {
      p.maxHp += 30;
      p.hp += 30;
      p.speed *= 1.1;
    },
  },
  // ===== NEW RELICS =====
  {
    id: 'blood_chalice',
    name: 'Blood Chalice',
    description: 'Soul Drain heals +3 HP, but you lose 10 max HP.',
    rarity: 'rare',
    icon: ' goblet',
    apply: (p) => {
      if (p.soulDrainChance > 0) {
        p.soulDrainAmount += 3;
      } else {
        p.soulDrainChance = 0.12;
        p.soulDrainAmount = 4;
      }
      p.maxHp = Math.max(40, p.maxHp - 10);
      p.hp = Math.min(p.hp, p.maxHp);
    },
  },
  {
    id: 'echo_wand',
    name: 'Echo Wand',
    description: 'Wand fires a 2nd delayed shot 40% of the time.',
    rarity: 'epic',
    icon: '❂',
    apply: (p) => {
      p.skills.add('echo_wand');
    },
  },
  {
    id: 'crown_of_thorns',
    name: 'Crown of Thorns',
    description: 'Attackers take 30% of their damage as recoil.',
    rarity: 'epic',
    icon: '♛',
    apply: (p) => {
      p.skills.add('crown_of_thorns');
    },
  },
  {
    id: 'soul_chain',
    name: 'Soul Chain',
    description: '+2 chain bounces, +10% wand damage.',
    rarity: 'rare',
    icon: '⛓',
    apply: (p) => {
      p.chainCount += 2;
      p.damage *= 1.1;
    },
  },
  {
    id: 'undying_heart',
    name: 'Undying Heart',
    description: 'Survive a lethal blow once per room at 1 HP.',
    rarity: 'epic',
    icon: '♥',
    apply: (p) => {
      p.skills.add('undying_heart');
    },
  },
];

// ---------- Enemy stats ----------
export interface EnemyTemplate {
  hp: number;
  damage: number;
  speed: number;
  radius: number;
  attackInterval: number;
  color: string;
  soulValue: number;
}

export const ENEMY_TEMPLATES: Record<EnemyKind, EnemyTemplate> = {
  knight: {
    hp: 22,
    damage: 12,
    speed: 110,
    radius: 13,
    attackInterval: 0.8,
    color: '#e8d6a8',
    soulValue: 1,
  },
  priest: {
    hp: 18,
    damage: 10,
    speed: 70,
    radius: 12,
    attackInterval: 1.6,
    color: '#f5e6c8',
    soulValue: 1,
  },
  robber: {
    hp: 16,
    damage: 9,
    speed: 95,
    radius: 11,
    attackInterval: 1.4,
    color: '#9c7a4a',
    soulValue: 1,
  },
  slime: {
    hp: 30,
    damage: 8,
    speed: 70,
    radius: 14,
    attackInterval: 1,
    color: '#5a7a3a',
    soulValue: 2,
  },
  ghost: {
    hp: 14,
    damage: 14,
    speed: 90,
    radius: 12,
    attackInterval: 1.2,
    color: '#c8d8e8',
    soulValue: 2,
  },
  gargoyle: {
    hp: 40,
    damage: 18,
    speed: 60,
    radius: 15,
    attackInterval: 2.2,
    color: '#6c7080',
    soulValue: 3,
  },
  mage: {
    hp: 20,
    damage: 8,
    speed: 80,
    radius: 12,
    attackInterval: 1.5,
    color: '#8a5cc8',
    soulValue: 2,
  },
  paladin: {
    hp: 60,
    damage: 16,
    speed: 70,
    radius: 15,
    attackInterval: 1.4,
    color: '#d8c898',
    soulValue: 4,
  },
  // ===== NEW ENEMIES =====
  cultist: {
    hp: 28,
    damage: 12,
    speed: 85,
    radius: 12,
    attackInterval: 1.3,
    color: '#a04060',
    soulValue: 2,
  },
  banshee: {
    hp: 24,
    damage: 16,
    speed: 110,
    radius: 13,
    attackInterval: 1.5,
    color: '#80a0d0',
    soulValue: 3,
  },
  bonebeast: {
    hp: 80,
    damage: 22,
    speed: 80,
    radius: 18,
    attackInterval: 1,
    color: '#d0c0a0',
    soulValue: 5,
  },
};

// ---------- Boss stats ----------
export interface BossTemplate {
  name: string;
  hp: number;
  damage: number;
  speed: number;
  radius: number;
  color: string;
  soulValue: number;
}

export const BOSS_TEMPLATES: Record<BossKind, BossTemplate> = {
  bell_knight: {
    name: 'The Bell Knight',
    hp: 800,
    damage: 28,
    speed: 60,
    radius: 32,
    color: '#b8a878',
    soulValue: 80,
  },
  twins: {
    name: 'The Gravekeeper Twins',
    hp: 600,
    damage: 20,
    speed: 90,
    radius: 24,
    color: '#7a6c5a',
    soulValue: 70,
  },
  sun_priest: {
    name: 'The Sun Priest',
    hp: 1000,
    damage: 24,
    speed: 50,
    radius: 30,
    color: '#f0d878',
    soulValue: 100,
  },
  bone_dragon: {
    name: 'The Bone Dragon',
    hp: 1600,
    damage: 36,
    speed: 70,
    radius: 42,
    color: '#e8e0d0',
    soulValue: 200,
  },
};

// Boss spawn schedule (which room # spawns which boss)
export const BOSS_ROOM_SCHEDULE: { room: number; boss: BossKind }[] = [
  { room: 4, boss: 'bell_knight' },
  { room: 8, boss: 'twins' },
  { room: 12, boss: 'sun_priest' },
  { room: 16, boss: 'bone_dragon' },
];

// ---------- Wave composition ----------
// Returns enemy kinds to spawn for a given room/wave.
export function generateWave(
  room: number,
  wave: number,
  totalWaves: number,
  blackCandle: boolean
): EnemyKind[] {
  const out: EnemyKind[] = [];
  const base = 4 + room * 1.5 + wave * 1.5;
  let count = Math.floor(base);
  if (blackCandle) count = Math.floor(count * 1.3);

  // unlock enemy variety by room
  const pool: EnemyKind[] = ['knight', 'robber', 'slime'];
  if (room >= 2) pool.push('priest', 'ghost', 'cultist');
  if (room >= 4) pool.push('mage', 'gargoyle', 'banshee');
  if (room >= 6) pool.push('paladin', 'bonebeast');

  for (let i = 0; i < count; i++) {
    out.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  // last wave gets a tougher mix
  if (wave === totalWaves - 1 && room >= 3) {
    out.push('gargoyle', 'paladin');
    if (room >= 5) out.push('bonebeast', 'banshee');
  }
  return out;
}

// Returns total waves for a room
export function wavesPerRoom(room: number): number {
  return Math.min(5, 2 + Math.floor(room / 3));
}

// Used to scale enemy hp with room depth
export function enemyHpScale(room: number): number {
  return 1 + room * 0.18;
}

export function enemyDamageScale(room: number): number {
  return 1 + room * 0.12;
}

// Helper to count unique skill upgrades in a path the player has unlocked
export function countSkillsInPath(p: Player, path: string): number {
  let c = 0;
  for (const s of p.skills) {
    const up = UPGRADES.find((u) => u.id === s);
    if (up && up.path === path) c++;
  }
  return c;
}
