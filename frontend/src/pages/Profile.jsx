import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import SongResultRow from "../components/SongResultRow";
import SongbookTab from "../components/SongbookTab";
import YouTubeSearchTab from "../components/YouTubeSearchTab";

const ADD_TABS = [
  { id: "book", label: "📖 Livro" },
  { id: "search", label: "🔎 Buscar" },
];

export default function Profile() {
  const { user, loading, favorites, logout } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("book");
  const [showPin, setShowPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  async function changePin(e) {
    e.preventDefault();
    if (pinBusy) return;
    setPinBusy(true);
    try {
      await api.put("/api/auth/pin", { newPin });
      toast("PIN alterado com sucesso! 🔐");
      setShowPin(false);
      setNewPin("");
    } catch (err) {
      toast(err.response?.data?.error || "Não rolou trocar o PIN 😬", "error");
    } finally {
      setPinBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40 animate-pulse font-display">Carregando… ⭐</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 pb-12">
      {/* Header */}
      <header className="flex items-center justify-between py-4 sticky top-0 bg-ink/90 backdrop-blur z-10">
        <div className="min-w-0">
          <h1 className="font-display text-lg neon-text truncate">Meu perfil</h1>
          <p className="text-xs text-white/40">
            olá, <span className="text-neon-cyan">{user.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/"
            className="bg-ink-3 border border-white/10 rounded-xl px-3 py-2 text-sm active:scale-95"
          >
            ← início
          </Link>
          <button
            onClick={logout}
            className="bg-ink-3 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/50 active:scale-95"
          >
            sair
          </button>
        </div>
      </header>

      {/* Favoritas */}
      <section className="mb-8">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-3">
          ⭐ Minhas favoritas ({favorites.length})
        </h2>
        {favorites.length ? (
          <div className="flex flex-col gap-2">
            {favorites.map((f) => (
              <SongResultRow
                key={f.videoId}
                song={{
                  ...f,
                  thumbnail:
                    f.thumbnail ||
                    `https://i.ytimg.com/vi/${f.videoId}/mqdefault.jpg`,
                }}
                badge={
                  f.songCode
                    ? `Livro #${String(f.songCode).padStart(4, "0")}`
                    : null
                }
                hideAdd
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/40 card">
            <p className="text-4xl mb-3">🌵</p>
            <p>Nenhuma favorita ainda.</p>
            <p className="text-sm mt-1">
              Busca abaixo e toca na ⭐ pra montar teu repertório!
            </p>
          </div>
        )}
      </section>

      {/* Conta / trocar PIN */}
      <section className="mb-8">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-3">
          🔐 Minha conta
        </h2>
        {!showPin ? (
          <button
            onClick={() => setShowPin(true)}
            className="card px-4 py-3 w-full text-left text-sm text-white/60 hover:text-white transition-colors"
          >
            Trocar PIN →
          </button>
        ) : (
          <form onSubmit={changePin} className="card p-4 flex flex-col gap-3">
            <input
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Novo PIN (4-6 dígitos)"
              inputMode="numeric"
              pattern="[0-9]{4,6}"
              minLength={4}
              maxLength={6}
              required
              autoFocus
              className="input-base text-center tracking-[0.5em] font-display"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowPin(false); setNewPin(""); }}
                className="btn-ghost flex-1 border border-white/10 rounded-2xl py-2.5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pinBusy || newPin.length < 4}
                className="btn-primary flex-1 !py-2.5 disabled:opacity-50"
              >
                {pinBusy ? "Salvando…" : "Trocar PIN"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Adicionar favoritas */}
      <section>
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-3">
          ➕ Garimpar novas favoritas
        </h2>
        <div className="flex gap-2 mb-4">
          {ADD_TABS.map((t) => (
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
        {tab === "book" && <SongbookTab hideAdd />}
        {tab === "search" && <YouTubeSearchTab hideAdd />}
      </section>
    </div>
  );
}
