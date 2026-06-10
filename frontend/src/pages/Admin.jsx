import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { useToast } from "../context/ToastContext";

export default function Admin() {
  const { toast } = useToast();
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [parties, setParties] = useState([]);
  const [busy, setBusy] = useState(false);

  async function load(adminPin) {
    const { data } = await api.get("/api/party", {
      headers: { "x-admin-pin": adminPin },
    });
    setParties(data.parties || data || []);
  }

  async function unlock(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await load(pin);
      setAuthed(true);
    } catch {
      toast("PIN errado, chefe 🚫", "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeParty(code) {
    if (!window.confirm(`Encerrar a festa ${code}?`)) return;
    try {
      await api.delete(`/api/party/${code}`, {
        headers: { "x-admin-pin": pin },
      });
      toast(`Festa ${code} encerrada 🧹`);
      await load(pin);
    } catch {
      toast("Não consegui deletar 😬", "error");
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <Link to="/" className="absolute top-4 left-4 btn-ghost">
          ← início
        </Link>
        <p className="text-5xl mb-4">🛠️</p>
        <h1 className="font-display text-2xl mb-8">Painel do chefe</h1>
        <form onSubmit={unlock} className="card p-6 w-full max-w-xs flex flex-col gap-4">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            type="password"
            inputMode="numeric"
            placeholder="PIN de admin"
            className="input-base text-center tracking-[0.4em]"
            autoFocus
          />
          <button type="submit" disabled={!pin || busy} className="btn-primary disabled:opacity-50">
            {busy ? "Conferindo…" : "Entrar 🔓"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl">🛠️ Festas ativas ({parties.length})</h1>
        <button onClick={() => load(pin)} className="btn-ghost border border-white/10 rounded-xl">
          ↻ atualizar
        </button>
      </div>

      {parties.length === 0 ? (
        <p className="text-white/40 text-center py-16">
          Nenhuma festa rolando agora. Que silêncio… 🦗
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {parties.map((p) => (
            <div key={p.code} className="card p-4 flex items-center gap-4">
              <span className="font-display text-neon-cyan text-xl tracking-widest shrink-0">
                {p.code}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.name || "(sem nome)"}</p>
                <p className="text-xs text-white/40">
                  host: {p.hostName} · fila: {p.queue?.length ?? 0} · criada:{" "}
                  {p.createdAt ? new Date(p.createdAt).toLocaleString("pt-BR") : "?"}
                </p>
              </div>
              <Link
                to={`/party/${p.code}`}
                className="bg-ink-3 border border-white/10 rounded-xl px-3 py-2 text-sm shrink-0"
              >
                ver
              </Link>
              <button
                onClick={() => removeParty(p.code)}
                className="bg-red-950/60 border border-red-500/40 text-red-300 rounded-xl px-3 py-2 text-sm shrink-0"
              >
                encerrar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
