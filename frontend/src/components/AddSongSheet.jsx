import { useState } from "react";
import api from "../api/api";
import { useToast } from "../context/ToastContext";
import SongbookTab from "./SongbookTab";
import YouTubeSearchTab from "./YouTubeSearchTab";
import FavoritesTab from "./FavoritesTab";

const TABS = [
  { id: "book", label: "📖 Livro" },
  { id: "search", label: "🔎 Buscar" },
  { id: "favs", label: "⭐ Favoritas" },
];

export default function AddSongSheet({ code, settings, onClose }) {
  const { toast } = useToast();
  const tabs = settings?.catalogOnly
    ? TABS.filter((t) => t.id !== "search")
    : TABS;
  const [tab, setTab] = useState("book");
  const [pending, setPending] = useState(null); // música escolhida aguardando "quem canta"
  const [singer, setSinger] = useState(localStorage.getItem("kp_name") || "");
  const [sending, setSending] = useState(false);

  function handlePick(song) {
    const saved = (localStorage.getItem("kp_name") || "").trim();
    // Já tem nome salvo (pedido na entrada da festa): adiciona direto
    if (saved) {
      addToQueue(song, saved);
      return;
    }
    setSinger("");
    setPending(song);
  }

  async function addToQueue(song, name) {
    if (sending) return;
    setSending(true);
    try {
      await api.post(`/api/party/${code}/queue`, {
        videoId: song.videoId,
        title: song.title,
        thumbnail:
          song.thumbnail ||
          `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`,
        singer: name,
      });
      localStorage.setItem("kp_name", name);
      toast(`Música adicionada pra ${name}! Bora cantar! 🎤`);
      setPending(null);
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || "Deu ruim ao adicionar 😬", "error");
    } finally {
      setSending(false);
    }
  }

  async function confirmAdd(e) {
    e?.preventDefault();
    const name = singer.trim();
    if (!name || !pending) return;
    await addToQueue(pending, name);
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink flex flex-col animate-slide-up">
      {/* Header */}
      <div className="w-full max-w-2xl mx-auto flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <h2 className="font-display text-lg neon-text">Adicionar música</h2>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-ink-3 text-white/70 active:scale-90"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-2xl mx-auto flex gap-2 px-4 pb-2.5 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl py-2 text-xs sm:text-sm font-display transition-all ${
              tab === t.id
                ? "bg-gradient-to-r from-neon-pink/25 to-neon-purple/25 border border-neon-pink/50 text-white shadow-glow-pink"
                : "bg-ink-3 border border-white/10 text-white/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto px-4 pb-8">
          {tab === "book" && <SongbookTab onAddSong={handlePick} />}
          {tab === "search" && !settings?.catalogOnly && (
            <YouTubeSearchTab onAddSong={handlePick} />
          )}
          {tab === "favs" && <FavoritesTab onAddSong={handlePick} />}
        </div>
      </div>

      {/* Confirmação: quem vai cantar */}
      {pending && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setPending(null)}
        >
          <form
            onSubmit={confirmAdd}
            onClick={(e) => e.stopPropagation()}
            className="card w-full sm:max-w-md m-0 sm:m-4 rounded-b-none sm:rounded-2xl p-5 animate-slide-up border-neon-pink/40"
          >
            <p className="font-display text-lg mb-1">Quem vai soltar a voz? 🎤</p>
            <p className="text-sm text-white/50 truncate mb-4">{pending.title}</p>
            <input
              value={singer}
              onChange={(e) => setSinger(e.target.value)}
              placeholder="Nome de quem canta"
              maxLength={30}
              autoFocus
              className="input-base mb-4"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="btn-ghost flex-1 border border-white/10 rounded-2xl py-3"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={!singer.trim() || sending}
                className="btn-primary flex-1 !py-3 disabled:opacity-50"
              >
                {sending ? "Enviando…" : "Pra fila! 🚀"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
