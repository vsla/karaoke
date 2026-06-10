import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/api";
import { getSocket } from "../api/socket";
import QRCode from "../components/QRCode";

// ── YouTube IFrame API: carregada UMA vez ────────────────────────────────────
let ytApiPromise = null;
function loadYouTubeApi() {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

const TRANSITION_SECONDS = 6;

export default function Player() {
  const { code: rawCode } = useParams();
  const code = (rawCode || "").toUpperCase();

  const [party, setParty] = useState(null);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [transition, setTransition] = useState(null); // {next, count} | null

  // UM player persistente — nunca recriado
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const lastLoadedRef = useRef(null);
  const partyRef = useRef(null);
  const transitionRef = useRef(null);
  partyRef.current = party;
  transitionRef.current = transition;

  // Estado inicial
  useEffect(() => {
    api
      .get(`/api/party/${code}`)
      .then(({ data }) => setParty(data.party || data))
      .catch(() => setParty(false));
  }, [code]);

  // Socket
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit("joinParty", code);
    join();
    socket.on("connect", join);
    const onQueue = ({ queue, nowPlaying }) =>
      setParty((p) => (p ? { ...p, queue, nowPlaying } : { code, queue, nowPlaying }));
    socket.on("queueUpdated", onQueue);
    const onDeleted = () => setParty(false);
    socket.on("partyDeleted", onDeleted);
    return () => {
      socket.off("connect", join);
      socket.off("queueUpdated", onQueue);
      socket.off("partyDeleted", onDeleted);
    };
  }, [code]);

  const callNext = useCallback(async () => {
    try {
      await api.post(`/api/party/${code}/next`);
    } catch {
      /* socket vai corrigir o estado */
    }
    setTransition(null);
  }, [code]);

  // Vídeo terminou → transição 6s → next
  const handleEnded = useCallback(() => {
    if (transitionRef.current) return;
    const next = partyRef.current?.queue?.[0] || null;
    if (!next) {
      // ninguém na fila: limpa nowPlaying e cai na tela idle
      callNext();
      return;
    }
    setTransition({ next, count: TRANSITION_SECONDS });
  }, [callNext]);

  // Countdown da transição
  useEffect(() => {
    if (!transition) return;
    if (transition.count <= 0) {
      callNext();
      return;
    }
    const t = setTimeout(
      () => setTransition((tr) => (tr ? { ...tr, count: tr.count - 1 } : tr)),
      1000
    );
    return () => clearTimeout(t);
  }, [transition, callNext]);

  // Cria o player UMA vez, após o gesto do usuário
  async function startPlayer() {
    setStarted(true);
    const YT = await loadYouTubeApi();
    if (playerRef.current) return;
    const videoId = partyRef.current?.nowPlaying?.videoId || undefined;
    lastLoadedRef.current = videoId || null;
    playerRef.current = new YT.Player(containerRef.current, {
      width: "100%",
      height: "100%",
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onReady: (e) => {
          if (videoId) e.target.playVideo();
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) handleEnded();
          else if (e.data === YT.PlayerState.PAUSED) setPaused(true);
          else if (e.data === YT.PlayerState.PLAYING) setPaused(false);
        },
        onError: () => {
          // vídeo indisponível → pula pro próximo
          handleEnded();
        },
      },
    });
  }

  // nowPlaying mudou → loadVideoById no MESMO player
  const nowVideoId = party?.nowPlaying?.videoId || null;
  useEffect(() => {
    if (!started || !playerRef.current?.loadVideoById) return;
    if (nowVideoId && nowVideoId !== lastLoadedRef.current) {
      lastLoadedRef.current = nowVideoId;
      setPaused(false);
      playerRef.current.loadVideoById(nowVideoId);
    } else if (!nowVideoId && lastLoadedRef.current) {
      lastLoadedRef.current = null;
      playerRef.current.stopVideo?.();
    }
  }, [nowVideoId, started]);

  function togglePause() {
    const p = playerRef.current;
    if (!p) return;
    if (paused) p.playVideo();
    else p.pauseVideo();
  }

  function skip() {
    setTransition(null);
    callNext();
  }

  if (party === false) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="font-display text-2xl text-white/60">Festa não encontrada 🥀</p>
      </div>
    );
  }

  const nowPlaying = party?.nowPlaying || null;
  const queue = party?.queue || [];
  const idle = started && !nowPlaying && !transition;
  const partyUrl = `${window.location.origin}/party/${code}`;

  return (
    <div className="h-screen w-screen bg-ink overflow-hidden relative group select-none">
      {/* Player YT — sempre montado, nunca recriado */}
      <div
        className={`absolute inset-0 ${
          started && nowPlaying && !transition ? "opacity-100" : "opacity-0 pointer-events-none"
        } transition-opacity duration-500`}
      >
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Tela inicial: gesto pro autoplay */}
      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 z-20">
          <p className="text-7xl animate-floaty">🎤</p>
          <h1 className="font-display font-black text-5xl neon-text text-center">
            KARAOKE PARTY
          </h1>
          <p className="text-white/50 font-display text-2xl tracking-[0.3em]">
            {party?.name || ""} · {code}
          </p>
          <button
            onClick={startPlayer}
            className="btn-primary text-3xl px-12 py-6 animate-pulse-glow"
          >
            ▶ Iniciar player
          </button>
          <div className="flex flex-col items-center gap-2 mt-4">
            <QRCode url={partyUrl} size={160} />
            <p className="text-white/30 text-sm">Escaneie pra entrar na festa 📱</p>
          </div>
        </div>
      )}

      {/* Transição: próximo cantor */}
      {started && transition && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-ink animate-fade-in">
          <p className="text-6xl animate-floaty">🎤</p>
          <p className="font-display text-2xl text-white/50 uppercase tracking-widest">
            Próximo no palco
          </p>
          <h2 className="font-display font-black text-5xl md:text-6xl neon-text text-center px-10 leading-tight">
            {transition.next.singer}
          </h2>
          <p className="text-2xl text-white/70 text-center px-10 max-w-4xl">
            {transition.next.title}
          </p>
          <div className="w-24 h-24 rounded-full border-4 border-neon-pink shadow-glow-pink flex items-center justify-center font-display text-5xl text-neon-pink mt-4">
            {transition.count}
          </div>
          <button onClick={skip} className="text-white/30 hover:text-white text-sm mt-2">
            pular espera →
          </button>
        </div>
      )}

      {/* Tela idle: fila vazia, código gigante */}
      {idle && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6">
          <p className="text-6xl animate-floaty">🪩</p>
          <p className="font-display text-2xl text-white/60">
            {party?.name || "Karaoke Party"}
          </p>
          <p className="font-display text-white/40 uppercase tracking-widest">
            Entra com o código
          </p>
          <div className="flex gap-4">
            {code.split("").map((c, i) => (
              <span
                key={i}
                className="font-display font-black text-7xl md:text-9xl text-neon-cyan drop-shadow-[0_0_30px_rgba(34,211,238,0.6)]"
              >
                {c}
              </span>
            ))}
          </div>
          <div className="flex flex-col items-center gap-3 mt-6">
            <QRCode url={partyUrl} size={200} />
            <p className="text-white/40 text-lg">
              Escaneie ou acesse · A fila tá vazia, escolhe teu hino! 🎶
            </p>
          </div>
        </div>
      )}

      {/* Overlay agora cantando + controles (hover) */}
      {started && nowPlaying && !transition && (
        <>
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-neon-pink font-display text-xs uppercase tracking-widest">
                🎤 Agora: {nowPlaying.singer}
              </p>
              <p className="text-white/80 truncate max-w-xl">{nowPlaying.title}</p>
            </div>
            <p className="font-display text-neon-cyan tracking-widest shrink-0">{code}</p>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={togglePause}
              className="bg-ink-2/90 border border-white/20 rounded-2xl px-6 py-3 font-display backdrop-blur active:scale-95"
            >
              {paused ? "▶ Continuar" : "⏸ Pausar"}
            </button>
            <button
              onClick={skip}
              className="bg-ink-2/90 border border-neon-pink/50 text-neon-pink rounded-2xl px-6 py-3 font-display backdrop-blur active:scale-95"
            >
              ⏭ Pular
            </button>
          </div>
        </>
      )}

      {/* Fila lateral compacta (próximos 3) */}
      {started && queue.length > 0 && !transition && (
        <div className="absolute right-4 bottom-20 z-10 w-72 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="font-display text-xs uppercase tracking-widest text-white/50 text-right">
            A seguir
          </p>
          {queue.slice(0, 3).map((q, i) => (
            <div
              key={q.queueId}
              className="bg-ink-2/90 border border-white/10 rounded-xl p-2.5 backdrop-blur flex items-center gap-2"
            >
              <span className="font-display text-neon-purple shrink-0">{i + 1}º</span>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{q.title}</p>
                <p className="text-[11px] text-neon-cyan truncate">🎤 {q.singer}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
