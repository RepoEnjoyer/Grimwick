'use client';

import { useEffect } from 'react';
import type { Upgrade } from '@/lib/game/types';

interface Props {
  choices: Upgrade[];
  onChoose: (idx: number) => void;
  onReroll: () => void;
  isRelic: boolean;
  isChest?: boolean;
  soulsCollected: number;
}

const RARITY_COLORS: Record<string, { border: string; bg: string; label: string; text: string }> = {
  common: {
    border: 'border-zinc-500',
    bg: 'from-zinc-800/90 to-zinc-900/90',
    label: 'COMMON',
    text: 'text-zinc-300',
  },
  rare: {
    border: 'border-sky-500',
    bg: 'from-sky-950/90 to-zinc-900/90',
    label: 'RARE',
    text: 'text-sky-300',
  },
  epic: {
    border: 'border-amber-500',
    bg: 'from-amber-950/90 to-purple-950/90',
    label: 'EPIC',
    text: 'text-amber-300',
  },
};

const PATH_COLORS: Record<string, string> = {
  necromancy: 'text-green-400',
  wand: 'text-purple-300',
  survival: 'text-sky-300',
  generic: 'text-zinc-400',
};

const PATH_LABELS: Record<string, string> = {
  necromancy: '☠ Necromancy',
  wand: '🪄 Wand',
  survival: '🛡 Survival',
  generic: '✦ Utility',
};

const REROLL_COST = 50;

export function UpgradeScreen({ choices, onChoose, onReroll, isRelic, isChest, soulsCollected }: Props) {
  const canReroll = soulsCollected >= REROLL_COST;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm font-mono text-white">
      <div className="text-center mb-8">
        <div
          className={`text-xs uppercase tracking-[0.4em] mb-2 ${
            isChest ? 'text-amber-400' : isRelic ? 'text-amber-400' : 'text-purple-400'
          }`}
        >
          {isChest
            ? '✨ Golden Chest Opened ✨'
            : isRelic
            ? '⚠ Cursed Relic Found ⚠'
            : 'Room Cleared'}
        </div>
        <h2
          className="text-4xl font-black"
          style={{
            background: isChest
              ? 'linear-gradient(180deg,#ffe080,#c88020)'
              : isRelic
              ? 'linear-gradient(180deg,#ffe080,#c88020)'
              : 'linear-gradient(180deg,#e0c0ff,#9060ff)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: `drop-shadow(0 0 12px ${
              isChest || isRelic ? 'rgba(255,180,60,0.6)' : 'rgba(150,80,255,0.6)'
            })`,
          }}
        >
          {isChest ? 'Divine Reward' : isRelic ? 'Choose Your Curse' : 'Choose Your Power'}
        </h2>
        <div className="text-zinc-500 text-xs mt-2 italic">
          {isChest
            ? 'Blessed by God — claim a RARE+ skill!'
            : isRelic
            ? 'A relic grants great power — and a price.'
            : 'The bones whisper. One gift shall be yours.'}
        </div>
      </div>

      <div className="flex gap-4 flex-wrap justify-center max-w-5xl px-4">
        {choices.map((c, i) => {
          const r = RARITY_COLORS[c.rarity] ?? RARITY_COLORS.common;
          const isBlessed = c.id === 'blessed_by_god';
          return (
            <button
              key={c.id + '-' + i}
              onClick={() => onChoose(i)}
              className={`group relative w-72 bg-gradient-to-b ${r.bg} ${
                isBlessed ? 'chroma-border' : 'border-2 ' + r.border
              } p-5 rounded-sm text-left transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(150,80,255,0.4)]`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl">{c.icon}</div>
                <div className="text-right">
                  <div className={`text-[10px] font-bold ${r.text}`}>
                    {r.label}
                  </div>
                  {!isRelic && (
                    <div
                      className={`text-[10px] ${PATH_COLORS[c.path]} mt-1`}
                    >
                      {PATH_LABELS[c.path]}
                    </div>
                  )}
                </div>
              </div>
              <h3
                className={`text-lg font-bold mb-2 leading-tight ${
                  isBlessed ? 'chroma-text' : 'text-white'
                }`}
              >
                {c.name}
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {c.description}
              </p>
              <div className="absolute bottom-2 right-3 text-[10px] text-zinc-600 group-hover:text-purple-300 transition-colors">
                {i + 1} ▶
              </div>
            </button>
          );
        })}
      </div>

      {/* Reroll button */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={onReroll}
          disabled={!canReroll}
          className={`px-6 py-2 text-xs font-bold tracking-widest border-2 rounded-sm transition-all ${
            canReroll
              ? 'border-amber-500 text-amber-300 bg-amber-950/40 hover:bg-amber-900/40 hover:shadow-[0_0_15px_rgba(255,180,60,0.4)]'
              : 'border-zinc-700 text-zinc-600 bg-zinc-900/40 cursor-not-allowed'
          }`}
        >
          ↻ REROLL ({REROLL_COST} souls) <span className="text-[10px] ml-1 opacity-70">[R]</span>
        </button>
        <span className="text-[10px] text-zinc-500">
          You have <span className="text-purple-300 font-bold">{soulsCollected}</span> souls
        </span>
      </div>

      <div className="mt-4 text-[10px] text-zinc-600">
        Click an upgrade to claim it — or press 1 / 2 / 3
      </div>

      <KeyboardShortcuts count={choices.length} onChoose={onChoose} />
    </div>
  );
}

function KeyboardShortcuts({
  count,
  onChoose,
}: {
  count: number;
  onChoose: (idx: number) => void;
}) {
  useKeyListener(count, onChoose);
  return null;
}

function useKeyListener(count: number, onChoose: (idx: number) => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key;
      if (k >= '1' && k <= '9') {
        const idx = parseInt(k, 10) - 1;
        if (idx < count) onChoose(idx);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [count, onChoose]);
}
