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

export function loadProgress(): PermanentProgress {
  if (typeof window === 'undefined') return defaultProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as PermanentProgress;
    // ensure all fields exist
    return {
      ...defaultProgress(),
      ...parsed,
      upgrades: { ...defaultProgress().upgrades, ...parsed.upgrades },
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
