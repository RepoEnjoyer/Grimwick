// localStorage-backed permanent progression
import type { PermanentProgress } from './types';

export type { PermanentProgress };

const KEY = 'grimwick_save_v1';

export const PERMANENT_UPGRADE_DEFS = [
  {
    id: 'startHealth',
    name: 'Tougher Bones',
    description: '+20 starting max HP per level.',
    icon: '❤',
    maxLevel: 8,
    cost: (lvl: number) => 20 + lvl * 15,
  },
  {
    id: 'wandPower',
    name: 'Wand Power',
    description: '+3 base wand damage per level.',
    icon: '🪄',
    maxLevel: 8,
    cost: (lvl: number) => 25 + lvl * 20,
  },
  {
    id: 'soulGain',
    name: 'Soul Hunger',
    description: '+15% soul gain per level.',
    icon: '✦',
    maxLevel: 6,
    cost: (lvl: number) => 30 + lvl * 25,
  },
  {
    id: 'minionPower',
    name: 'Minion Mastery',
    description: '+2 base minion damage per level.',
    icon: '☠',
    maxLevel: 6,
    cost: (lvl: number) => 30 + lvl * 25,
  },
  {
    id: 'moveSpeed',
    name: 'Swift Spirit',
    description: '+12 move speed per level.',
    icon: '➤',
    maxLevel: 5,
    cost: (lvl: number) => 25 + lvl * 20,
  },
  {
    id: 'relicLuck',
    name: 'Relic Luck',
    description: 'Improves relic drop chance per level.',
    icon: '🎲',
    maxLevel: 5,
    cost: (lvl: number) => 50 + lvl * 40,
  },
  // ===== NEW PERMANENT UPGRADES =====
  {
    id: 'startingSouls',
    name: 'Soul Hoard',
    description: 'Start each run with +15 bonus souls per level (for rerolls).',
    icon: '💰',
    maxLevel: 5,
    cost: (lvl: number) => 40 + lvl * 30,
  },
  {
    id: 'iframeDuration',
    name: 'Phantom Reflex',
    description: '+0.1s invulnerability after taking a hit per level.',
    icon: '👻',
    maxLevel: 5,
    cost: (lvl: number) => 35 + lvl * 25,
  },
  {
    id: 'pickupRange',
    name: 'Soul Magnetism',
    description: '+12 soul pickup range per level.',
    icon: '🧲',
    maxLevel: 5,
    cost: (lvl: number) => 25 + lvl * 20,
  },
  {
    id: 'critChance',
    name: 'Deadly Eye',
    description: '+3% base crit chance per level.',
    icon: '✸',
    maxLevel: 5,
    cost: (lvl: number) => 45 + lvl * 35,
  },
  {
    id: 'fireRate',
    name: 'Quick Cast',
    description: '+5% wand fire rate per level.',
    icon: '⚡',
    maxLevel: 5,
    cost: (lvl: number) => 40 + lvl * 30,
  },
  {
    id: 'projectileSpeed',
    name: 'Swift Bolt',
    description: '+30 projectile speed per level.',
    icon: '➹',
    maxLevel: 4,
    cost: (lvl: number) => 30 + lvl * 25,
  },
  {
    id: 'extraLife',
    name: 'Undying Vow',
    description: 'Revive once per run at 50% HP. +1 revive per level (max 3).',
    icon: '♻',
    maxLevel: 3,
    cost: (lvl: number) => 150 + lvl * 100,
  },
  {
    id: 'eliteSoulBonus',
    name: 'Trophy Hunter',
    description: '+25% souls from elite enemies per level.',
    icon: '🏆',
    maxLevel: 4,
    cost: (lvl: number) => 60 + lvl * 45,
  },
  {
    id: 'startingRelic',
    name: 'Heirloom',
    description: '20% chance per level to start each run with a random relic.',
    icon: '📿',
    maxLevel: 5,
    cost: (lvl: number) => 80 + lvl * 60,
  },
  {
    id: 'soulMeterSize',
    name: 'Soul Compression',
    description: '-3 max soul meter size per level (faster Soul Novas).',
    icon: '🔮',
    maxLevel: 5,
    cost: (lvl: number) => 50 + lvl * 40,
  },
] as const;

// ===== STAGE 2 UPGRADES — locked until Void zone is unlocked =====
// These provide the power needed to handle Void/Abyss difficulty
export const STAGE2_UPGRADE_DEFS = [
  {
    id: 'stage2Damage',
    name: 'Void Touched',
    description: '+5% all damage per level (player + minions). Stage 2 power.',
    icon: '⚔',
    maxLevel: 8,
    cost: (lvl: number) => 100 + lvl * 80,
  },
  {
    id: 'stage2Health',
    name: 'Abyssal Vitality',
    description: '+30 max HP per level. Survive the Void\'s elite hordes.',
    icon: '❤',
    maxLevel: 6,
    cost: (lvl: number) => 90 + lvl * 70,
  },
  {
    id: 'stage2EliteResist',
    name: 'Champion Breaker',
    description: '-10% damage taken from elite enemies per level.',
    icon: '🛡',
    maxLevel: 5,
    cost: (lvl: number) => 120 + lvl * 90,
  },
  {
    id: 'stage2SoulMult',
    name: 'Void Harvest',
    description: '+20% soul gain per level. Farm shards faster in the Void.',
    icon: '✦',
    maxLevel: 5,
    cost: (lvl: number) => 110 + lvl * 85,
  },
] as const;

// ===== NECROMINION UPGRADES — offline soul farming =====
export const NECROMINION_UPGRADE_DEFS = [
  {
    id: 'generationRate',
    name: 'Soul Well',
    description: '+5 souls/hour generation per level (base 10/hr).',
    icon: '🌀',
    maxLevel: 10,
    cost: (lvl: number) => 30 + lvl * 25,
  },
  {
    id: 'storageCap',
    name: 'Soul Vessel',
    description: '+100 max stored souls per level (base 100).',
    icon: '🏺',
    maxLevel: 10,
    cost: (lvl: number) => 25 + lvl * 20,
  },
  {
    id: 'conversionEfficiency',
    name: 'Soul Refinery',
    description: '+5% conversion to soul shards per level (base 50%).',
    icon: '⚗',
    maxLevel: 10,
    cost: (lvl: number) => 40 + lvl * 35,
  },
  {
    id: 'autoCollect',
    name: 'Auto Harvester',
    description: '+10% auto-collect threshold per level (0 = manual only).',
    icon: '🤖',
    maxLevel: 10,
    cost: (lvl: number) => 50 + lvl * 40,
  },
] as const;

// ===== NECROMINION HELPERS =====
// Computed stats from necrominion upgrade levels
export function necrominionStats(progress: PermanentProgress) {
  const lvls = progress.necrominion.upgradeLevels;
  return {
    generationRatePerHour: 10 + lvls.generationRate * 5, // base 10, +5 per level
    storageCap: 100 + lvls.storageCap * 100, // base 100, +100 per level
    conversionEfficiency: 0.5 + lvls.conversionEfficiency * 0.05, // base 50%, +5% per level
    autoCollectThreshold: lvls.autoCollect * 0.1, // 0 = manual, +10% per level
  };
}

// Calculate how many souls have accumulated since last collection
export function necrominionPending(progress: PermanentProgress): {
  pending: number;
  total: number;
  capped: boolean;
  elapsedMs: number;
} {
  const stats = necrominionStats(progress);
  const now = Date.now();
  const elapsedMs = now - progress.necrominion.lastCollectedAt;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const generated = elapsedHours * stats.generationRatePerHour;
  const total = progress.necrominion.storedSouls + generated;
  const capped = total >= stats.storageCap;
  return {
    pending: capped ? stats.storageCap - progress.necrominion.storedSouls : generated,
    total: Math.min(total, stats.storageCap),
    capped,
    elapsedMs,
  };
}

// Collect pending souls — converts to soul shards based on efficiency
export function necrominionCollect(progress: PermanentProgress): {
  newProgress: PermanentProgress;
  soulsCollected: number;
  shardsGained: number;
} {
  const stats = necrominionStats(progress);
  const pending = necrominionPending(progress);
  if (pending.total <= 0) {
    return { newProgress: progress, soulsCollected: 0, shardsGained: 0 };
  }
  const soulsCollected = Math.floor(pending.total);
  const shardsGained = Math.floor(soulsCollected * stats.conversionEfficiency);
  const newProgress: PermanentProgress = {
    ...progress,
    soulShards: progress.soulShards + shardsGained,
    totalSouls: progress.totalSouls + shardsGained,
    necrominion: {
      ...progress.necrominion,
      storedSouls: 0,
      lastCollectedAt: Date.now(),
    },
  };
  saveProgress(newProgress);
  return { newProgress, soulsCollected, shardsGained };
}

// Buy a Necrominion upgrade
export function buyNecrominionUpgrade(
  progress: PermanentProgress,
  upgradeId: keyof PermanentProgress['necrominion']['upgradeLevels']
): PermanentProgress | null {
  const def = NECROMINION_UPGRADE_DEFS.find((d) => d.id === upgradeId);
  if (!def) return null;
  const currentLevel = progress.necrominion.upgradeLevels[upgradeId];
  if (currentLevel >= def.maxLevel) return null;
  const cost = def.cost(currentLevel);
  if (progress.soulShards < cost) return null;
  const newProgress: PermanentProgress = {
    ...progress,
    soulShards: progress.soulShards - cost,
    necrominion: {
      ...progress.necrominion,
      upgradeLevels: {
        ...progress.necrominion.upgradeLevels,
        [upgradeId]: currentLevel + 1,
      },
    },
  };
  saveProgress(newProgress);
  return newProgress;
}

// Auto-collect: if storage is at or above the auto-collect threshold %, automatically collect.
// Called by the game on load and periodically.
export function necrominionAutoCollect(progress: PermanentProgress): PermanentProgress {
  const stats = necrominionStats(progress);
  if (stats.autoCollectThreshold <= 0) return progress;
  const pending = necrominionPending(progress);
  const thresholdSouls = stats.storageCap * stats.autoCollectThreshold;
  if (pending.total >= thresholdSouls) {
    const result = necrominionCollect(progress);
    return result.newProgress;
  }
  return progress;
}

export function loadProgress(): PermanentProgress {
  if (typeof window === 'undefined') return defaultProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<PermanentProgress>;
    const def = defaultProgress();
    // ensure all fields exist
    return {
      ...def,
      ...parsed,
      upgrades: { ...def.upgrades, ...(parsed.upgrades ?? {}) },
      necrominion: {
        lastCollectedAt: parsed.necrominion?.lastCollectedAt ?? Date.now(),
        storedSouls: parsed.necrominion?.storedSouls ?? 0,
        upgradeLevels: {
          ...def.necrominion.upgradeLevels,
          ...(parsed.necrominion?.upgradeLevels ?? {}),
        },
      },
      unlockedWandTypes: parsed.unlockedWandTypes?.length
        ? parsed.unlockedWandTypes
        : ['Bone Wand'],
      unlockedSkins: parsed.unlockedSkins?.length
        ? parsed.unlockedSkins
        : ['Default'],
      unlockedZones: parsed.unlockedZones?.length
        ? parsed.unlockedZones
        : ['Crypt'],
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(p: PermanentProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function defaultProgress(): PermanentProgress {
  return {
    soulShards: 0,
    totalSouls: 0,
    runsCompleted: 0,
    bossesDefeated: 0,
    highestRoom: 0,
    unlockedWandTypes: ['Bone Wand'],
    unlockedSkins: ['Default'],
    unlockedZones: ['Crypt'],
    upgrades: {
      startHealth: 0,
      wandPower: 0,
      soulGain: 0,
      minionPower: 0,
      relicLuck: 0,
      moveSpeed: 0,
      startingSouls: 0,
      iframeDuration: 0,
      pickupRange: 0,
      critChance: 0,
      fireRate: 0,
      projectileSpeed: 0,
      extraLife: 0,
      eliteSoulBonus: 0,
      startingRelic: 0,
      soulMeterSize: 0,
      // Stage 2 upgrades
      stage2Damage: 0,
      stage2Health: 0,
      stage2EliteResist: 0,
      stage2SoulMult: 0,
    },
    necrominion: {
      lastCollectedAt: Date.now(),
      storedSouls: 0,
      upgradeLevels: {
        generationRate: 0, // base 10/hr, +5/hr per level
        storageCap: 0, // base 100, +100 per level
        conversionEfficiency: 0, // base 50%, +5% per level
        autoCollect: 0, // 0 = manual, +10% auto-collect threshold per level
      },
    },
  };
}

export function buyUpgrade(
  progress: PermanentProgress,
  upgradeId: keyof PermanentProgress['upgrades']
): PermanentProgress | null {
  const def = PERMANENT_UPGRADE_DEFS.find((d) => d.id === upgradeId);
  if (!def) return null;
  const currentLevel = progress.upgrades[upgradeId];
  if (currentLevel >= def.maxLevel) return null;
  const cost = def.cost(currentLevel);
  if (progress.soulShards < cost) return null;
  const newProgress: PermanentProgress = {
    ...progress,
    soulShards: progress.soulShards - cost,
    upgrades: {
      ...progress.upgrades,
      [upgradeId]: currentLevel + 1,
    },
  };
  if (upgradeId === 'wandPower' && currentLevel + 1 >= 3) {
    if (!newProgress.unlockedWandTypes.includes('Grave Wand')) {
      newProgress.unlockedWandTypes.push('Grave Wand');
    }
  }
  if (upgradeId === 'wandPower' && currentLevel + 1 >= 6) {
    if (!newProgress.unlockedWandTypes.includes('Lich Wand')) {
      newProgress.unlockedWandTypes.push('Lich Wand');
    }
  }
  if (upgradeId === 'wandPower' && currentLevel + 1 >= 8) {
    if (!newProgress.unlockedWandTypes.includes('Void Wand')) {
      newProgress.unlockedWandTypes.push('Void Wand');
    }
  }
  // Stage 2 unlocks also grant new wands
  if (upgradeId === 'stage2Damage' && currentLevel + 1 >= 5) {
    if (!newProgress.unlockedWandTypes.includes('Abyss Wand')) {
      newProgress.unlockedWandTypes.push('Abyss Wand');
    }
  }
  if (upgradeId === 'stage2Damage' && currentLevel + 1 >= 8) {
    if (!newProgress.unlockedWandTypes.includes('Cosmic Wand')) {
      newProgress.unlockedWandTypes.push('Cosmic Wand');
    }
  }
  saveProgress(newProgress);
  return newProgress;
}

export function addSoulShards(
  progress: PermanentProgress,
  amount: number
): PermanentProgress {
  const newProgress: PermanentProgress = {
    ...progress,
    soulShards: progress.soulShards + amount,
    totalSouls: progress.totalSouls + amount,
  };
  saveProgress(newProgress);
  return newProgress;
}

// ZONE SYSTEM: unlock a new zone after defeating the previous zone's final boss
export function unlockZone(
  progress: PermanentProgress,
  zone: 'crypt' | 'void' | 'abyss'
): PermanentProgress {
  const zoneName = zone.charAt(0).toUpperCase() + zone.slice(1);
  let newProgress = progress;
  if (!progress.unlockedZones.includes(zoneName)) {
    newProgress = {
      ...progress,
      unlockedZones: [...progress.unlockedZones, zoneName],
    };
  }
  // ===== AUTO-UNLOCK SKIN on zone clear =====
  const zoneSkinMap: Record<'crypt' | 'void' | 'abyss', string> = {
    crypt: 'Golden Lich',
    void: 'Void Walker',
    abyss: 'Bone King',
  };
  const skinName = zoneSkinMap[zone];
  if (skinName && !newProgress.unlockedSkins.includes(skinName)) {
    newProgress = {
      ...newProgress,
      unlockedSkins: [...newProgress.unlockedSkins, skinName],
    };
  }
  if (newProgress !== progress) {
    saveProgress(newProgress);
  }
  return newProgress;
}

// ===== Buy a skin with soul shards =====
export function buySkin(
  progress: PermanentProgress,
  skinName: string,
  cost: number
): PermanentProgress | null {
  if (progress.unlockedSkins.includes(skinName)) return null;
  if (progress.soulShards < cost) return null;
  const newProgress: PermanentProgress = {
    ...progress,
    soulShards: progress.soulShards - cost,
    unlockedSkins: [...progress.unlockedSkins, skinName],
  };
  saveProgress(newProgress);
  return newProgress;
}

// Check if Stage 2 upgrades are unlocked (Void zone must be unlocked)
export function isStage2Unlocked(progress: PermanentProgress): boolean {
  return progress.unlockedZones.includes('Void');
}

// Buy a Stage 2 upgrade — only allowed if Void zone is unlocked
export function buyStage2Upgrade(
  progress: PermanentProgress,
  upgradeId: keyof PermanentProgress['upgrades']
): PermanentProgress | null {
  if (!isStage2Unlocked(progress)) return null;
  const def = STAGE2_UPGRADE_DEFS.find((d) => d.id === upgradeId);
  if (!def) return null;
  const currentLevel = progress.upgrades[upgradeId];
  if (currentLevel >= def.maxLevel) return null;
  const cost = def.cost(currentLevel);
  if (progress.soulShards < cost) return null;
  const newProgress: PermanentProgress = {
    ...progress,
    soulShards: progress.soulShards - cost,
    upgrades: {
      ...progress.upgrades,
      [upgradeId]: currentLevel + 1,
    },
  };
  saveProgress(newProgress);
  return newProgress;
}

export function recordRun(
  progress: PermanentProgress,
  result: {
    soulsCollected: number;
    roomsCleared: number;
    bossesDefeated: number;
    reachedVictory: boolean;
  }
): PermanentProgress {
  const newProgress: PermanentProgress = {
    ...progress,
    soulShards: progress.soulShards + result.soulsCollected,
    totalSouls: progress.totalSouls + result.soulsCollected,
    runsCompleted: progress.runsCompleted + 1,
    bossesDefeated: progress.bossesDefeated + result.bossesDefeated,
    highestRoom: Math.max(progress.highestRoom, result.roomsCleared),
  };
  saveProgress(newProgress);
  return newProgress;
}
