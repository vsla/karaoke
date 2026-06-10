export default function NowPlayingCard({ nowPlaying }) {
  if (!nowPlaying) {
    return (
      <div className="card p-6 text-center">
        <p className="text-4xl mb-2 animate-floaty">🎤</p>
        <p className="font-display text-lg text-white/70">Palco livre!</p>
        <p className="text-white/40 text-sm mt-1">
          Adiciona uma música e solta a voz 🔥
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 flex items-center gap-4 border-neon-pink/40 shadow-glow-pink/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-neon-pink/10 via-transparent to-neon-purple/10 pointer-events-none" />
      {nowPlaying.thumbnail ? (
        <img
          src={nowPlaying.thumbnail}
          alt=""
          className="w-24 h-16 object-cover rounded-xl border border-white/10 shrink-0"
        />
      ) : (
        <div className="w-24 h-16 rounded-xl bg-ink-3 flex items-center justify-center text-3xl shrink-0">
          🎵
        </div>
      )}
      <div className="min-w-0">
        <p className="text-neon-pink text-xs font-display uppercase tracking-widest flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
          No palco agora
        </p>
        <p className="font-semibold truncate mt-0.5">{nowPlaying.title}</p>
        <p className="text-neon-cyan text-sm truncate">
          🎤 {nowPlaying.singer}
        </p>
      </div>
    </div>
  );
}
