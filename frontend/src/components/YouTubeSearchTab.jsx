import { useState } from "react";
import api from "../api/api";
import { useToast } from "../context/ToastContext";
import SongResultRow from "./SongResultRow";

export default function YouTubeSearchTab({ onAddSong, hideAdd }) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);

  async function search(e) {
    e?.preventDefault();
    if (!q.trim() || loading) return;
    setLoading(true);
    try {
      const { data } = await api.get("/api/search", { params: { q: q.trim() } });
      setItems(data.items || []);
    } catch {
      toast("A busca falhou 😵 tenta de novo!", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={search} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Qual vai ser o hino? 🎶"
          className="input-base flex-1"
          enterKeyHint="search"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="btn-primary !px-5 !py-0 shrink-0 disabled:opacity-50"
        >
          {loading ? "…" : "🔎"}
        </button>
      </form>
      <p className="text-xs text-white/30 -mt-2">
        Dica: a gente já adiciona "karaokê" na busca pra você 😉
      </p>

      {loading && (
        <p className="text-center text-white/40 py-8">Procurando no YouTube… 📡</p>
      )}

      {!loading && items && items.length === 0 && (
        <p className="text-center text-white/40 py-8">
          Nenhum resultado… esse hino é raro demais 💎
        </p>
      )}

      {!loading && items?.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <SongResultRow key={it.videoId} song={it} onAdd={onAddSong} hideAdd={hideAdd} />
          ))}
        </div>
      )}

      {!loading && items === null && (
        <div className="text-center text-white/30 py-10">
          <p className="text-4xl mb-3">🎬</p>
          <p>Busca qualquer música — do clássico ao vergonha alheia.</p>
        </div>
      )}
    </div>
  );
}
