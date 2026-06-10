import FavoriteButton from "./FavoriteButton";

// Linha genérica de resultado de música (YouTube / favoritas / catálogo resolvido)
export default function SongResultRow({ song, onAdd, badge, busy, hideAdd }) {
  return (
    <div className="card p-3 flex items-center gap-3">
      {song.thumbnail ? (
        <img
          src={song.thumbnail}
          alt=""
          className="w-20 h-14 object-cover rounded-lg border border-white/10 shrink-0"
        />
      ) : (
        <div className="w-20 h-14 rounded-lg bg-ink-3 flex items-center justify-center text-2xl shrink-0">
          🎵
        </div>
      )}
      <div className="min-w-0 flex-1">
        {badge && (
          <span className="inline-block text-[10px] font-display text-neon-purple bg-neon-purple/10 border border-neon-purple/30 rounded-md px-1.5 py-0.5 mb-1">
            {badge}
          </span>
        )}
        <p className="text-sm font-medium leading-snug line-clamp-2">{song.title}</p>
        {(song.artist || song.channel) && (
          <p className="text-xs text-white/40 truncate">{song.artist || song.channel}</p>
        )}
      </div>
      <FavoriteButton song={song} />
      {!hideAdd && (
        <button
          onClick={() => onAdd(song)}
          disabled={busy}
          className="shrink-0 bg-gradient-to-r from-neon-pink to-neon-purple rounded-xl w-11 h-11 text-xl font-bold shadow-glow-pink active:scale-90 transition-transform disabled:opacity-50"
          aria-label="Adicionar à fila"
        >
          {busy ? "…" : "+"}
        </button>
      )}
    </div>
  );
}
