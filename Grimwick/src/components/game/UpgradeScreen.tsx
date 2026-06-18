'use client';

import type { Upgrade } from '@/lib/game/types';

interface Props {
  choices: Upgrade[];
  onChoose: (idx: number) => void;
  isRelic: boolean;
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

export function UpgradeScreen({ choices, onChoose, isRelic }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm font-mono text-white">
      <div className="text-center mb-8">
        <div
          className={`text-xs uppercase tracking-[0.4em] mb-2 ${
            isRelic ? 'text-amber-400' : 'text-purple-400'
          }`}
        >
          {isRelic ? '⚠ Cursed Relic Found ⚠' : 'Room Cleared'}
        </div>
        <h2
          className="text-4xl font-black"
          style={{
            background: isRelic
              ? 'linear-gradient(180deg,#ffe080,#c88020)'
              : 'linear-gradient(180deg,#e0c0ff,#9060ff)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: `drop-shadow(0 0 12px ${
              isRelic ? 'rgba(255,180,60,0.6)' : 'rgba(150,80,255,0.6)'
            })`,
          }}
        >
          {isRelic ? 'Choose Your Curse' : 'Choose Your Power'}
        </h2>
        <div className="text-zinc-500 text-xs mt-2 italic">
          {isRelic
            ? 'A relic grants great power — and a price.'
            : 'The bones whisper. One gift shall be yours.'}
        </div>
      </div>

      <div className="flex gap-4 flex-wrap justify-center max-w-5xl px-4">
        {choices.map((c, i) => {
          const r = RARITY_COLORS[c.rarity] ?? RARITY_COLORS.common;
          return (
            <button
              key={c.id}
              onClick={() => onChoose(i)}
              className={`group relative w-72 bg-gradient-to-b ${r.bg} border-2 ${r.border} p-5 rounded-sm text-left transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(150,80,255,0.4)]`}
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
              <h3 className="text-lg font-bold text-white mb-2 leading-tight">
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

      <div className="mt-8 text-[10px] text-zinc-600">
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
  // listen for 1/2/3 key
  useKeyListener(count, onChoose);
  return null;
}

import { useEffect } from 'react';
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
