import { useEffect, useState } from "react";
import api from "../api/api";
import { useToast } from "../context/ToastContext";
import FavoriteButton from "./FavoriteButton";

const GENRE_EMOJI = {
  sertanejo: "🤠",
  mpb: "🇧🇷",
  pagode: "🥁",
  samba: "🪘",
  rock: "🎸",
  pop: "🌟",
  internacional: "🌍",
  axé: "🏖️",
  axe: "🏖️",
  forró: "🪗",
  forro: "🪗",
  bossa: "🍷",
  funk: "🔊",
  gospel: "🙏",
};

// Resolve videoId de uma música do catálogo (lazy, com cache no backend)
async function resolveSong(song) {
  const { data } = await api.post(`/api/songs/${song._id}/resolve`);
  const resolved = data.song || data;
  if (!resolved.videoId) throw new Error("sem videoId");
  return {
    videoId: resolved.videoId,
    title: `${resolved.title} — ${resolved.artist}`,
    thumbnail:
      resolved.thumbnail ||
      `https://i.ytimg.com/vi/${resolved.videoId}/mqdefault.jpg`,
    artist: resolved.artist,
    songCode: resolved.code,
  };
}

function SongRow({ song, onPick, busyId, hideAdd }) {
  return (
    <div className="card px-2.5 py-2 flex items-center gap-2.5">
      <span className="font-display text-neon-cyan text-xs bg-ink-3 border border-neon-cyan/30 rounded-lg px-1.5 py-1 shrink-0 min-w-[3rem] text-center">
        {String(song.code).padStart(4, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{song.title}</p>
        <p className="text-xs text-white/40 truncate">
          {song.artist}
          {song.genre ? ` · ${song.genre}` : ""}
        </p>
      </div>
      <FavoriteButton
        song={{
          videoId: song.videoId,
          title: `${song.title} — ${song.artist}`,
          thumbnail: song.videoId
            ? `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`
            : undefined,
          artist: song.artist,
          songCode: song.code,
        }}
        resolve={() => resolveSong(song)}
      />
      {!hideAdd && (
        <button
          onClick={() => onPick(song)}
          disabled={busyId === song._id}
          className="shrink-0 bg-gradient-to-r from-neon-pink to-neon-purple rounded-xl w-9 h-9 text-lg font-bold shadow-glow-pink active:scale-90 transition-transform disabled:opacity-50"
          aria-label="Adicionar à fila"
        >
          {busyId === song._id ? "…" : "+"}
        </button>
      )}
    </div>
  );
}

export default function SongbookTab({ onAddSong, hideAdd }) {
  const { toast } = useToast();
  const [codeInput, setCodeInput] = useState("");
  const [codeSong, setCodeSong] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [genres, setGenres] = useState([]);
  const [artists, setArtists] = useState([]);
  const [genre, setGenre] = useState(null);
  const [artist, setArtist] = useState(null);
  const [showArtists, setShowArtists] = useState(false);
  const [songs, setSongs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api.get("/api/songs/genres").then(({ data }) => setGenres(data.genres || data || [])).catch(() => {});
    api.get("/api/songs/artists").then(({ data }) => setArtists(data.artists || data || [])).catch(() => {});
  }, []);

  // Busca/browse com debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = { page };
      if (search.trim()) params.search = search.trim();
      if (genre) params.genre = genre;
      if (artist) params.artist = artist;
      api
        .get("/api/songs", { params })
        .then(({ data }) => {
          setSongs(data.songs || []);
          setTotal(data.total || 0);
          setPages(data.pages || 1);
        })
        .catch(() => setSongs([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [search, genre, artist, page]);

  useEffect(() => {
    setPage(1);
  }, [search, genre, artist]);

  // Lookup por código
  async function lookupCode(value) {
    setCodeInput(value);
    setCodeSong(null);
    const num = value.replace(/\D/g, "");
    if (!num) return;
    setCodeLoading(true);
    try {
      const { data } = await api.get(`/api/songs/code/${num}`);
      setCodeSong(data.song || data);
    } catch {
      setCodeSong(null);
    } finally {
      setCodeLoading(false);
    }
  }

  // Resolve videoId e entrega pro fluxo de adicionar
  async function pick(song) {
    setBusyId(song._id);
    try {
      onAddSong(await resolveSong(song));
    } catch {
      toast("Não achei o vídeo dessa 😢 tenta pela busca!", "error");
    } finally {
      setBusyId(null);
    }
  }

  const genreList = genres.map((g) => (typeof g === "string" ? { genre: g } : g));
  const artistList = artists.map((a) => (typeof a === "string" ? { artist: a } : a));

  return (
    <div className="flex flex-col gap-3">
      {/* Código numérico + busca local, lado a lado */}
      <div className="flex gap-2">
        <input
          value={codeInput}
          onChange={(e) => lookupCode(e.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="📖 Código"
          aria-label="Código da música"
          className="input-base !w-28 shrink-0 text-center font-display text-base tracking-[0.15em]"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por música ou artista…"
          className="input-base flex-1 min-w-0"
        />
      </div>
      {codeLoading && (
        <p className="text-white/40 text-xs text-center">Folheando o livro…</p>
      )}
      {codeSong && (
        <SongRow song={codeSong} onPick={pick} busyId={busyId} hideAdd={hideAdd} />
      )}
      {!codeLoading && codeInput.length >= 1 && !codeSong && (
        <p className="text-white/40 text-xs text-center">
          Nenhuma música com esse código (ainda) 🤷
        </p>
      )}

      {/* Filtros gênero */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => {
            setGenre(null);
            setArtist(null);
          }}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
            !genre && !artist
              ? "bg-neon-purple/20 border-neon-purple text-white"
              : "bg-ink-3 border-white/10 text-white/60"
          }`}
        >
          Tudo
        </button>
        {genreList.map((g) => (
          <button
            key={g.genre}
            onClick={() => {
              setGenre(genre === g.genre ? null : g.genre);
              setArtist(null);
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors capitalize ${
              genre === g.genre
                ? "bg-neon-pink/20 border-neon-pink text-white"
                : "bg-ink-3 border-white/10 text-white/60"
            }`}
          >
            {GENRE_EMOJI[g.genre] || "🎶"} {g.genre}
            {g.count ? ` (${g.count})` : ""}
          </button>
        ))}
      </div>

      {/* Browse por artista */}
      <div>
        <button
          onClick={() => setShowArtists((v) => !v)}
          className="text-sm text-neon-cyan font-medium"
        >
          {showArtists ? "▾" : "▸"} Procurar por artista{artist ? `: ${artist}` : ""}
        </button>
        {showArtists && (
          <div className="flex flex-wrap gap-2 mt-2 max-h-48 overflow-y-auto">
            {artistList.map((a) => (
              <button
                key={a.artist}
                onClick={() => {
                  setArtist(artist === a.artist ? null : a.artist);
                  setShowArtists(false);
                }}
                className={`rounded-full px-3 py-1.5 text-xs border ${
                  artist === a.artist
                    ? "bg-neon-cyan/20 border-neon-cyan text-white"
                    : "bg-ink-3 border-white/10 text-white/60"
                }`}
              >
                {a.artist}
                {a.count ? ` (${a.count})` : ""}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-white/40 py-6">Carregando o repertório… 🎼</p>
      ) : songs.length ? (
        <>
          <p className="text-xs text-white/30">{total} música(s) no livro</p>
          <div className="flex flex-col gap-2">
            {songs.map((s) => (
              <SongRow key={s._id} song={s} onPick={pick} busyId={busyId} hideAdd={hideAdd} />
            ))}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-ghost disabled:opacity-20"
              >
                ← Anterior
              </button>
              <span className="text-white/50 text-sm">
                {page} / {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="btn-ghost disabled:opacity-20"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-white/40 py-6">
          Nada por aqui… tenta a aba Buscar! 🔎
        </p>
      )}
    </div>
  );
}
