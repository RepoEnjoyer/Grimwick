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

// ===== STAGE 2 UPGRADES =====
export const STAGE2_UPGRADE_DEFS = [
  { id: 'stage2Damage', name: 'Void Touched', description: '+10% all damage per level (player + minions).', icon: '⚔', maxLevel: 8, cost: (l: number) => 80 + l * 60 },
  { id: 'stage2Health', name: 'Abyssal Vitality', description: '+50 max HP per level.', icon: '❤', maxLevel: 6, cost: (l: number) => 70 + l * 50 },
  { id: 'stage2EliteResist', name: 'Champion Breaker', description: '-12% damage from elites per level.', icon: '🛡', maxLevel: 5, cost: (l: number) => 90 + l * 70 },
  { id: 'stage2SoulMult', name: 'Void Harvest', description: '+25% soul gain per level.', icon: '✦', maxLevel: 5, cost: (l: number) => 80 + l * 60 },
] as const;

// ===== NECROMINION UPGRADES =====
export const NECROMINION_UPGRADE_DEFS = [
  { id: 'generationRate', name: 'Soul Well', description: '+5 souls/hour per level (base 10/hr).', icon: '🌀', maxLevel: 10, cost: (l: number) => 30 + l * 25 },
  { id: 'storageCap', name: 'Soul Vessel', description: '+100 max stored souls per level (base 100).', icon: '🏺', maxLevel: 10, cost: (l: number) => 25 + l * 20 },
  { id: 'conversionEfficiency', name: 'Soul Refinery', description: '+5% conversion to shards per level (base 50%).', icon: '⚗', maxLevel: 10, cost: (l: number) => 40 + l * 35 },
  { id: 'autoCollect', name: 'Auto Harvester', description: '+10% auto-collect threshold per level.', icon: '🤖', maxLevel: 10, cost: (l: number) => 50 + l * 40 },
] as const;

export function isStage2Unlocked(progress: PermanentProgress): boolean {
  return progress.unlockedZones.includes('Void');
}

export function buyStage2Upgrade(progress: PermanentProgress, id: keyof PermanentProgress['upgrades']): PermanentProgress | null {
  if (!isStage2Unlocked(progress)) return null;
  const def = STAGE2_UPGRADE_DEFS.find((d) => d.id === id);
  if (!def) return null;
  const lvl = progress.upgrades[id];
  if (lvl >= def.maxLevel) return null;
  const cost = def.cost(lvl);
  if (progress.soulShards < cost) return null;
  const np: PermanentProgress = { ...progress, soulShards: progress.soulShards - cost, upgrades: { ...progress.upgrades, [id]: lvl + 1 } };
  saveProgress(np);
  return np;
}

export function buyNecrominionUpgrade(progress: PermanentProgress, id: keyof PermanentProgress['necrominion']['upgradeLevels']): PermanentProgress | null {
  const def = NECROMINION_UPGRADE_DEFS.find((d) => d.id === id);
  if (!def) return null;
  const lvl = progress.necrominion.upgradeLevels[id];
  if (lvl >= def.maxLevel) return null;
  const cost = def.cost(lvl);
  if (progress.soulShards < cost) return null;
  const np: PermanentProgress = { ...progress, soulShards: progress.soulShards - cost, necrominion: { ...progress.necrominion, upgradeLevels: { ...progress.necrominion.upgradeLevels, [id]: lvl + 1 } } };
  saveProgress(np);
  return np;
}

export function necrominionStats(progress: PermanentProgress) {
  const l = progress.necrominion.upgradeLevels;
  return { generationRatePerHour: 10 + l.generationRate * 5, storageCap: 100 + l.storageCap * 100, conversionEfficiency: 0.5 + l.conversionEfficiency * 0.05, autoCollectThreshold: l.autoCollect * 0.1 };
}

export function necrominionPending(progress: PermanentProgress) {
  const s = necrominionStats(progress);
  const elapsedH = (Date.now() - progress.necrominion.lastCollectedAt) / 3600000;
  const total = Math.min(progress.necrominion.storedSouls + elapsedH * s.generationRatePerHour, s.storageCap);
  return { total, capped: total >= s.storageCap, elapsedMs: Date.now() - progress.necrominion.lastCollectedAt };
}

export function necrominionCollect(progress: PermanentProgress) {
  const s = necrominionStats(progress);
  const p = necrominionPending(progress);
  const souls = Math.floor(p.total);
  const shards = Math.floor(souls * s.conversionEfficiency);
  const np: PermanentProgress = { ...progress, soulShards: progress.soulShards + shards, totalSouls: progress.totalSouls + shards, necrominion: { ...progress.necrominion, storedSouls: 0, lastCollectedAt: Date.now() } };
  saveProgress(np);
  return { newProgress: np, soulsCollected: souls, shardsGained: shards };
}

export function necrominionAutoCollect(progress: PermanentProgress): PermanentProgress {
  const s = necrominionStats(progress);
  if (s.autoCollectThreshold <= 0) return progress;
  const p = necrominionPending(progress);
  if (p.total >= s.storageCap * s.autoCollectThreshold) return necrominionCollect(progress).newProgress;
  return progress;
}

export function unlockZone(progress: PermanentProgress, zone: 'crypt' | 'void' | 'abyss'): PermanentProgress {
  const zoneName = zone.charAt(0).toUpperCase() + zone.slice(1);
  let np = progress;
  if (!np.unlockedZones.includes(zoneName)) np = { ...np, unlockedZones: [...np.unlockedZones, zoneName] };
  const skinMap: Record<string, string> = { crypt: 'Golden Lich', void: 'Void Walker', abyss: 'Bone King' };
  const skinName = skinMap[zone];
  if (skinName && !np.unlockedSkins.includes(skinName)) np = { ...np, unlockedSkins: [...np.unlockedSkins, skinName] };
  if (np !== progress) saveProgress(np);
  return np;
}

export function buySkin(progress: PermanentProgress, skinName: string, cost: number): PermanentProgress | null {
  if (progress.unlockedSkins.includes(skinName)) return null;
  if (progress.soulShards < cost) return null;
  const np: PermanentProgress = { ...progress, soulShards: progress.soulShards - cost, unlockedSkins: [...progress.unlockedSkins, skinName] };
  saveProgress(np);
  return np;
}

export function loadProgress(): PermanentProgress {
  if (typeof window === 'undefined') return defaultProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<PermanentProgress>;
    const def = defaultProgress();
    return {
      ...def,
      ...parsed,
      upgrades: { ...def.upgrades, ...(parsed.upgrades ?? {}) },
      necrominion: {
        lastCollectedAt: parsed.necrominion?.lastCollectedAt ?? Date.now(),
        storedSouls: parsed.necrominion?.storedSouls ?? 0,
        upgradeLevels: { ...def.necrominion.upgradeLevels, ...(parsed.necrominion?.upgradeLevels ?? {}) },
      },
      unlockedWandTypes: parsed.unlockedWandTypes?.length ? parsed.unlockedWandTypes : ['Bone Wand'],
      unlockedSkins: parsed.unlockedSkins?.length ? parsed.unlockedSkins : ['Default'],
      unlockedZones: parsed.unlockedZones?.length ? parsed.unlockedZones : ['Crypt'],
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
      startHealth: 0, wandPower: 0, soulGain: 0, minionPower: 0, relicLuck: 0, moveSpeed: 0,
      stage2Damage: 0, stage2Health: 0, stage2EliteResist: 0, stage2SoulMult: 0,
    },
    necrominion: {
      lastCollectedAt: Date.now(), storedSouls: 0,
      upgradeLevels: { generationRate: 0, storageCap: 0, conversionEfficiency: 0, autoCollect: 0 },
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
