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
