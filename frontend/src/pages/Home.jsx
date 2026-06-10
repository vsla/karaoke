import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import CodeInput from "../components/CodeInput";
import { getPartyHistory, removeFromHistory, trackParty } from "../utils/partyHistory";

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [code, setCode] = useState("");
  const [partyName, setPartyName] = useState("");
  const [hostName, setHostName] = useState(localStorage.getItem("kp_name") || "");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(() => getPartyHistory());

  async function createParty(e) {
    e.preventDefault();
    if (!hostName.trim() || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post("/api/party", {
        name: partyName.trim() || undefined,
        hostName: hostName.trim(),
      });
      const party = data.party || data;
      localStorage.setItem("kp_name", hostName.trim());
      localStorage.setItem(`kp_host_${party.code}`, "1");
      trackParty({ code: party.code, name: partyName.trim(), role: "host" });
      setHistory(getPartyHistory());
      toast(`Festa ${party.code} criada! 🎉`);
      navigate(`/party/${party.code}`);
    } catch (err) {
      toast(err.response?.data?.error || "Não rolou criar a festa 😬", "error");
    } finally {
      setBusy(false);
    }
  }

  async function joinParty() {
    if (code.length !== 4 || busy) return;
    setBusy(true);
    try {
      await api.get(`/api/party/${code}`);
      navigate(`/party/${code}`);
    } catch {
      toast("Festa não encontrada… confere o código! 🧐", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 relative">
      {/* Conta */}
      <div className="absolute top-4 right-4 text-sm flex items-center gap-3">
        {user ? (
          <>
            <span className="text-white/50">
              olá, <span className="text-neon-cyan">{user.name}</span>
            </span>
            <Link
              to="/profile"
              className="bg-ink-3 border border-neon-cyan/40 text-neon-cyan rounded-xl px-3 py-1.5 text-xs font-display active:scale-95 hover:bg-neon-cyan/10 transition-colors"
            >
              ⭐ Meu perfil
            </Link>
            <button onClick={logout} className="text-white/30 hover:text-white/60 text-xs underline">
              sair
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="bg-ink-3 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/50 hover:text-neon-cyan hover:border-neon-cyan/40 transition-colors"
          >
            entrar / criar conta
          </Link>
        )}
      </div>

      {/* Logo */}
      <div className="text-center mb-12 animate-fade-in">
        <p className="text-6xl mb-4 animate-floaty">🎤</p>
        <h1 className="font-display font-black text-4xl sm:text-6xl neon-text leading-tight">
          KARAOKE
          <br />
          PARTY
        </h1>
        <p className="text-white/50 mt-3 font-medium">
          A noite é sua. O microfone também. 🌙✨
        </p>
      </div>

      {/* CTAs */}
      {mode === null && (
        <div className="flex flex-col gap-4 w-full max-w-sm animate-fade-in">
          <button onClick={() => setMode("create")} className="btn-primary animate-pulse-glow">
            🎉 Criar festa
          </button>
          <button onClick={() => setMode("join")} className="btn-secondary">
            🚪 Entrar na festa
          </button>
        </div>
      )}

      {mode === "create" && (
        <form onSubmit={createParty} className="card p-6 w-full max-w-sm flex flex-col gap-4 animate-slide-up">
          <h2 className="font-display text-xl text-center">Bora montar o palco 🎪</h2>
          <input
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="Nome da festa (opcional)"
            maxLength={40}
            className="input-base"
          />
          <input
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="Seu nome"
            maxLength={30}
            required
            className="input-base"
          />
          <button type="submit" disabled={!hostName.trim() || busy} className="btn-primary disabled:opacity-50">
            {busy ? "Criando…" : "Criar festa 🚀"}
          </button>
          <button type="button" onClick={() => setMode(null)} className="btn-ghost">
            ← voltar
          </button>
        </form>
      )}

      {mode === "join" && (
        <div className="card p-6 w-full max-w-sm flex flex-col gap-5 animate-slide-up">
          <h2 className="font-display text-xl text-center">Qual o código da festa?</h2>
          <CodeInput value={code} onChange={setCode} onSubmit={joinParty} autoFocus />
          <button
            onClick={joinParty}
            disabled={code.length !== 4 || busy}
            className="btn-primary disabled:opacity-50"
          >
            {busy ? "Procurando…" : "Bora cantar! 🎤"}
          </button>
          <button onClick={() => setMode(null)} className="btn-ghost">
            ← voltar
          </button>
        </div>
      )}

      {/* Histórico de festas */}
      {history.length > 0 && (
        <div className="w-full max-w-sm mt-10 animate-fade-in">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/40 mb-3 text-center">
            🕓 Suas festas recentes
          </h2>
          <div className="flex flex-col gap-2">
            {history.map((p) => (
              <div
                key={p.code}
                className="card px-4 py-3 flex items-center gap-3"
              >
                <span className="text-lg">{p.role === "host" ? "👑" : "🎤"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {p.name || "Festa"}{" "}
                    <span className="font-display text-neon-cyan text-xs">
                      {p.code}
                    </span>
                  </p>
                  <p className="text-[11px] text-white/30">
                    {p.role === "host" ? "Criada por você" : "Participou"}{" · "}
                    {new Date(p.lastSeen).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/party/${p.code}`)}
                  className="shrink-0 bg-gradient-to-r from-neon-pink to-neon-purple rounded-xl px-3 py-2 text-xs font-display shadow-glow-pink active:scale-90"
                >
                  Entrar
                </button>
                <button
                  onClick={() => {
                    removeFromHistory(p.code);
                    setHistory(getPartyHistory());
                  }}
                  className="shrink-0 text-white/20 hover:text-white/60 text-sm active:scale-90"
                  title="Remover do histórico"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="absolute bottom-4 text-white/20 text-xs">
        feito pra cantar alto demais 🔊
      </p>
    </div>
  );
}
