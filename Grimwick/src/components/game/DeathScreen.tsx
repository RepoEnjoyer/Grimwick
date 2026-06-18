'use client';

interface Props {
  result: {
    soulsCollected: number;
    roomsCleared: number;
    bossesDefeated: number;
    reachedVictory: boolean;
  };
  onReturn: () => void;
  onRestart: () => void;
}

export function DeathScreen({ result, onReturn, onRestart }: Props) {
  const victory = result.reachedVictory;
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center font-mono text-white ${
        victory
          ? 'bg-gradient-to-b from-amber-950/95 via-black/95 to-purple-950/95'
          : 'bg-gradient-to-b from-rose-950/95 via-black/95 to-purple-950/95'
      }`}
    >
      <div className="text-center mb-6">
        <div
          className={`text-xs uppercase tracking-[0.4em] mb-2 ${
            victory ? 'text-amber-400' : 'text-rose-400'
          }`}
        >
          {victory ? '★ The Crypt is Yours ★' : 'Your Bones Fall'}
        </div>
        <h1
          className="text-7xl font-black tracking-tight"
          style={{
            background: victory
              ? 'linear-gradient(180deg,#ffe080,#c08020)'
              : 'linear-gradient(180deg,#ff8080,#a02040)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: victory
              ? 'drop-shadow(0 0 24px rgba(255,180,60,0.7))'
              : 'drop-shadow(0 0 24px rgba(255,80,80,0.7))',
          }}
        >
          {victory ? 'VICTORY' : 'YOU DIED'}
        </h1>
        <div className="text-zinc-400 text-sm mt-3 italic max-w-md">
          {victory
            ? 'The Bone Dragon lies shattered. You have become the true Undead Lord of the Crypt.'
            : 'Your bones return to the crypt. But the souls you gathered will make you stronger next time.'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm bg-zinc-950/70 border border-zinc-800 px-8 py-6 rounded-sm mb-8">
        <Stat label="Souls Collected" value={result.soulsCollected} color="text-purple-300" />
        <Stat label="Rooms Cleared" value={result.roomsCleared} color="text-amber-300" />
        <Stat label="Bosses Slain" value={result.bossesDefeated} color="text-rose-300" />
        <Stat
          label="Souls → Shards"
          value={`+${result.soulsCollected}`}
          color="text-green-300"
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={onRestart}
          className="px-8 py-3 text-sm font-bold tracking-widest bg-gradient-to-b from-purple-700 to-purple-900 border-2 border-purple-400 text-white rounded-sm hover:from-purple-600 hover:to-purple-800 transition-all shadow-[0_0_20px_rgba(150,80,255,0.4)]"
        >
          ↻ RISE AGAIN
        </button>
        <button
          onClick={onReturn}
          className="px-8 py-3 text-sm font-bold tracking-widest border-2 border-zinc-600 text-zinc-300 bg-zinc-900/60 rounded-sm hover:border-zinc-400 hover:text-white transition-all"
        >
          ⚱ RETURN TO CRYPT
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}
