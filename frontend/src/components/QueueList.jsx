import api from "../api/api";
import { useToast } from "../context/ToastContext";

export default function QueueList({ code, queue, isHost, myName }) {
  const { toast } = useToast();

  async function remove(queueId) {
    try {
      await api.delete(`/api/party/${code}/queue/${queueId}`);
      toast("Música removida da fila", "info");
    } catch {
      toast("Não consegui remover 😅", "error");
    }
  }

  async function move(index, dir) {
    const next = [...queue];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await api.put(`/api/party/${code}/queue`, { queue: next });
    } catch {
      toast("Não consegui reordenar 😅", "error");
    }
  }

  if (!queue.length) {
    return (
      <div className="text-center py-10 text-white/40">
        <p className="text-3xl mb-2">🦗</p>
        <p>Fila vazia... cadê a coragem?</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {queue.map((item, i) => {
        const mine = item.singer === myName;
        return (
          <li
            key={item.queueId}
            className={`card p-3 flex items-center gap-3 animate-fade-in ${
              mine ? "border-neon-cyan/40" : ""
            }`}
          >
            <span className="font-display text-lg w-8 text-center text-neon-purple shrink-0">
              {i + 1}º
            </span>
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt=""
                className="w-16 h-11 object-cover rounded-lg border border-white/10 shrink-0"
              />
            ) : (
              <div className="w-16 h-11 rounded-lg bg-ink-3 flex items-center justify-center shrink-0">
                🎵
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-neon-cyan truncate">
                🎤 {item.singer}
                {mine && <span className="text-white/40"> (você!)</span>}
              </p>
            </div>
            {isHost && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="w-8 h-8 rounded-lg bg-ink-3 text-white/70 disabled:opacity-20 active:scale-90"
                  aria-label="Subir"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === queue.length - 1}
                  className="w-8 h-8 rounded-lg bg-ink-3 text-white/70 disabled:opacity-20 active:scale-90"
                  aria-label="Descer"
                >
                  ↓
                </button>
                <button
                  onClick={() => remove(item.queueId)}
                  className="w-8 h-8 rounded-lg bg-red-950/60 text-red-300 active:scale-90"
                  aria-label="Remover"
                >
                  ✕
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
