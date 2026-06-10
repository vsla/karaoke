import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

// Estrela de favoritar — aparece em toda música listada, exige login.
// Se a música ainda não tem videoId (catálogo não resolvido), recebe um
// `resolve` async que busca o videoId na hora de favoritar.
export default function FavoriteButton({ song, resolve, className = "" }) {
  const { user, isFavorite, addFavorite, removeFavorite } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (!user || (!song?.videoId && !resolve)) return null;
  const fav = song?.videoId ? isFavorite(song.videoId) : false;

  async function toggle(e) {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      let s = song;
      if (!s.videoId) {
        s = await resolve();
        if (!s?.videoId) throw new Error("sem videoId");
      }
      if (isFavorite(s.videoId)) {
        await removeFavorite(s.videoId);
        toast("Tirada das favoritas 💔", "info");
      } else {
        await addFavorite({
          videoId: s.videoId,
          title: s.title,
          thumbnail: s.thumbnail,
          artist: s.artist,
          songCode: s.songCode,
        });
        toast("Salva nas favoritas ⭐");
      }
    } catch {
      toast("Ops, não rolou. Tenta de novo!", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={fav ? "Remover das favoritas" : "Favoritar"}
      className={`text-xl px-1.5 py-1 active:scale-90 transition-transform ${
        busy ? "animate-pulse" : ""
      } ${
        fav ? "drop-shadow-[0_0_8px_rgba(255,200,0,0.6)]" : "opacity-40 grayscale"
      } ${className}`}
    >
      ⭐
    </button>
  );
}
