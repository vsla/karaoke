import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
import { getSocket } from "../api/socket";
import { useToast } from "../context/ToastContext";
import NowPlayingCard from "../components/NowPlayingCard";
import QueueList from "../components/QueueList";
import AddSongSheet from "../components/AddSongSheet";
import PartySettingsModal from "../components/PartySettingsModal";
import { trackParty } from "../utils/partyHistory";

export default function Party() {
  const { code: rawCode } = useParams();
  const code = (rawCode || "").toUpperCase();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [party, setParty] = useState(null);
  const [error, setError] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [myName, setMyName] = useState(localStorage.getItem("kp_name") || "");
  const [nameInput, setNameInput] = useState("");
  const isHost = !!localStorage.getItem(`kp_host_${code}`);

  // Estado inicial via REST
  useEffect(() => {
    api
      .get(`/api/party/${code}`)
      .then(({ data }) => {
        const p = data.party || data;
        setParty(p);
        trackParty({ code, name: p.name, role: isHost ? "host" : "guest" });
      })
      .catch((err) =>
        setError(err.response?.status === 404 ? "Festa não encontrada (ou já acabou) 🥀" : "Erro ao carregar a festa 😵")
      );
  }, [code]);

  // Tempo real via socket
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit("joinParty", code);
    join();
    socket.on("connect", join);

    const onQueue = ({ queue, nowPlaying, settings, played }) =>
      setParty((p) =>
        p
          ? {
              ...p,
              queue,
              nowPlaying,
              ...(settings ? { settings } : {}),
              ...(played ? { played } : {}),
            }
          : p
      );
    const onDeleted = () => {
      toast("A festa acabou! Valeu por cantar 💜", "info");
      navigate("/");
    };
    socket.on("queueUpdated", onQueue);
    socket.on("partyDeleted", onDeleted);
    return () => {
      socket.off("connect", join);
      socket.off("queueUpdated", onQueue);
      socket.off("partyDeleted", onDeleted);
    };
  }, [code, navigate, toast]);

  function saveName(e) {
    e.preventDefault();
    const n = nameInput.trim();
    if (!n) return;
    localStorage.setItem("kp_name", n);
    setMyName(n);
    toast(`Beleza, ${n}! Agora escolhe teu hino 🎶`);
  }

  function copyLink() {
    navigator.clipboard
      .writeText(window.location.origin + `/party/${code}`)
      .then(() => toast("Link copiado! Manda no grupo 📲"))
      .catch(() => toast(`Código da festa: ${code}`, "info"));
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl mb-4">🥀</p>
        <p className="font-display text-xl mb-6">{error}</p>
        <Link to="/" className="btn-primary">
          Voltar ao início
        </Link>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40 animate-pulse font-display">Entrando na festa… 🪩</p>
      </div>
    );
  }

  // Pergunta o nome na entrada
  if (!myName) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-5xl mb-4 animate-floaty">🪩</p>
        <h1 className="font-display text-2xl text-center mb-1">
          {party.name || "Festa"} <span className="text-neon-cyan">{code}</span>
        </h1>
        <p className="text-white/40 mb-8">Como te chamam no palco?</p>
        <form onSubmit={saveName} className="w-full max-w-sm flex flex-col gap-4">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Seu nome artístico ✨"
            maxLength={30}
            autoFocus
            className="input-base text-center"
          />
          <button type="submit" disabled={!nameInput.trim()} className="btn-primary disabled:opacity-50">
            Entrar na festa 🎤
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto px-4 pb-28">
      {/* Header */}
      <header className="sticky top-0 bg-ink/90 backdrop-blur z-10 py-3">
        {/* Linha 1: voltar + nome + ações */}
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="shrink-0 w-9 h-9 rounded-xl bg-ink-3 border border-white/10 flex items-center justify-center text-white/50 hover:text-white active:scale-90 transition-all"
            aria-label="Voltar ao início"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base truncate leading-tight">
              {party.name || "Karaoke Party"}
            </h1>
            <p className="text-[11px] text-white/40 leading-tight">
              <button
                onClick={() => {
                  navigator.clipboard
                    .writeText(code)
                    .then(() => toast("Código copiado! 📋"))
                    .catch(() => {});
                }}
                className="inline-flex items-center gap-0.5 font-display text-neon-cyan tracking-widest hover:text-white transition-colors active:scale-95"
                title="Copiar código"
              >
                {code}
                <span className="text-[9px] opacity-60">📋</span>
              </button>
              {" · "}<span className="text-neon-pink">{myName}</span>
              {isHost && " 👑"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={copyLink}
              className="w-9 h-9 rounded-xl bg-ink-3 border border-white/10 text-sm active:scale-90 transition-transform"
              title="Copiar link da festa"
            >
              🔗
            </button>
            {isHost && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="w-9 h-9 rounded-xl bg-ink-3 border border-white/10 text-sm active:scale-90 transition-transform"
                title="Regras da festa"
              >
                ⚙️
              </button>
            )}
            {isHost && (
              <Link
                to={`/party/${code}/player`}
                className="h-9 rounded-xl bg-ink-3 border border-neon-cyan/40 text-neon-cyan px-2.5 text-xs font-display flex items-center gap-1 active:scale-90 transition-transform"
                title="Abrir player"
              >
                📺 Player
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Agora cantando */}
      <section className="mb-6">
        <NowPlayingCard nowPlaying={party.nowPlaying} />
      </section>

      {/* Fila */}
      <section className="flex-1">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-3">
          🎶 Próximos do palco ({party.queue?.length || 0})
        </h2>
        <QueueList code={code} queue={party.queue || []} isHost={isHost} myName={myName} />
      </section>

      {/* Já tocaram */}
      {party.played?.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/30 mb-3">
            ✅ Já tocaram ({party.played.length})
          </h2>
          <div className="flex flex-col gap-1.5">
            {[...party.played].reverse().map((item) => (
              <div
                key={item.queueId}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-ink-2/50 border border-white/5 opacity-50"
              >
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-10 h-7 object-cover rounded-md shrink-0 grayscale"
                  />
                ) : (
                  <div className="w-10 h-7 rounded-md bg-ink-3 flex items-center justify-center text-xs shrink-0">
                    🎵
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs truncate">{item.title}</p>
                  <p className="text-[11px] text-white/30 truncate">🎤 {item.singer}</p>
                </div>
                <span className="text-[10px] text-white/20 shrink-0">✅</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAB adicionar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-ink via-ink/95 to-transparent">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setSheetOpen(true)}
            className="btn-primary w-full animate-pulse-glow text-xl"
          >
            🎤 Adicionar música
          </button>
        </div>
      </div>

      {sheetOpen && (
        <AddSongSheet
          code={code}
          settings={party.settings}
          onClose={() => setSheetOpen(false)}
        />
      )}
      {settingsOpen && (
        <PartySettingsModal
          code={code}
          settings={party.settings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
