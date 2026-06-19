'use client';

interface Props {
  result: {
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
  };
  onReturn: () => void;
  onRestart: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function DeathScreen({ result, onReturn, onRestart }: Props) {
  const victory = result.reachedVictory;
  // QOL: derive efficiency stats
  const dps =
    result.timeSurvived > 0
      ? Math.round(result.damageDealt / result.timeSurvived)
      : 0;
  const damageRatio =
    result.damageTaken > 0
      ? (result.damageDealt / result.damageTaken).toFixed(1)
      : '∞';
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
            ? 'The Lich King falls. His throne is yours. You have conquered the Crypt, the Void, and the Abyss itself — you are the true Undead Lord.'
            : 'Your bones return to the crypt. But the souls you gathered will make you stronger next time.'}
        </div>
      </div>

      {/* QOL: Comprehensive run stats — 2 panels */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Combat stats */}
        <div className="bg-zinc-950/70 border border-zinc-800 px-6 py-4 rounded-sm">
          <div className="text-[10px] uppercase tracking-wider text-rose-400 mb-3">
            Combat
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Stat label="Time Survived" value={formatTime(result.timeSurvived)} color="text-cyan-300" />
            <Stat label="Kills" value={result.kills} color="text-purple-300" />
            <Stat label="Elites Slain" value={result.elitesKilled} color="text-amber-300" />
            <Stat label="Max Combo" value={`${result.maxCombo}x`} color="text-orange-300" />
            <Stat label="Damage Dealt" value={result.damageDealt.toLocaleString()} color="text-green-300" />
            <Stat label="Damage Taken" value={result.damageTaken.toLocaleString()} color="text-rose-300" />
          </div>
        </div>
        {/* Build stats */}
        <div className="bg-zinc-950/70 border border-zinc-800 px-6 py-4 rounded-sm">
          <div className="text-[10px] uppercase tracking-wider text-fuchsia-400 mb-3">
            Build
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Stat label="Rooms Cleared" value={result.roomsCleared} color="text-amber-300" />
            <Stat label="Bosses Slain" value={result.bossesDefeated} color="text-rose-300" />
            <Stat label="Skills Unlocked" value={result.skillsCount} color="text-fuchsia-300" />
            <Stat label="DPS" value={dps.toLocaleString()} color="text-orange-300" />
            <Stat label="Dmg Ratio" value={`${damageRatio}x`} color="text-cyan-300" />
            <Stat label="Souls → Shards" value={`+${result.soulsCollected}`} color="text-green-300" />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onRestart}
          className="px-8 py-3 text-sm font-bold tracking-widest bg-gradient-to-b from-purple-700 to-purple-900 border-2 border-purple-400 text-white rounded-sm hover:from-purple-600 hover:to-purple-800 transition-all shadow-[0_0_20px_rgba(150,80,255,0.4)]"
        >
          ↻ RISE AGAIN <span className="text-purple-200 text-[10px] ml-1">[R]</span>
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
      <span className={`text-xl font-bold ${color}`}>{value}</span>
    </div>
  );
}
