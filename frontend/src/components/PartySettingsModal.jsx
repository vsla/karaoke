import { useState } from "react";
import api from "../api/api";
import { useToast } from "../context/ToastContext";

const MAX_OPTIONS = [
  { value: 0, label: "Ilimitado" },
  { value: 1, label: "1 música" },
  { value: 2, label: "2 músicas" },
  { value: 3, label: "3 músicas" },
  { value: 5, label: "5 músicas" },
];

function Toggle({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 w-full text-left"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-white/40">{hint}</span>}
      </span>
      <span
        className={`shrink-0 w-11 h-6 rounded-full border transition-colors relative ${
          checked
            ? "bg-neon-pink/40 border-neon-pink"
            : "bg-ink-3 border-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export default function PartySettingsModal({ code, settings, onClose }) {
  const { toast } = useToast();
  const [maxPerSinger, setMaxPerSinger] = useState(settings?.maxPerSinger ?? 0);
  const [blockDuplicates, setBlockDuplicates] = useState(
    settings?.blockDuplicates ?? false
  );
  const [catalogOnly, setCatalogOnly] = useState(settings?.catalogOnly ?? false);
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.patch(`/api/party/${code}/settings`, {
        settings: { maxPerSinger, blockDuplicates, catalogOnly },
      });
      toast("Configurações salvas! ⚙️✨");
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || "Não rolou salvar 😬", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="card w-full sm:max-w-md m-0 sm:m-4 rounded-b-none sm:rounded-2xl p-5 animate-slide-up border-neon-cyan/40 flex flex-col gap-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">⚙️ Regras da festa</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-ink-3 text-white/70 active:scale-90"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Músicas por pessoa na fila</p>
          <p className="text-xs text-white/40 mb-2">
            Evita que alguém domine o microfone 🎤
          </p>
          <div className="flex gap-2 flex-wrap">
            {MAX_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setMaxPerSinger(o.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  maxPerSinger === o.value
                    ? "bg-neon-pink/20 border-neon-pink text-white"
                    : "bg-ink-3 border-white/10 text-white/60"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <Toggle
          checked={blockDuplicates}
          onChange={setBlockDuplicates}
          label="Bloquear músicas repetidas"
          hint="Ninguém adiciona uma música que já está na fila"
        />

        <Toggle
          checked={catalogOnly}
          onChange={setCatalogOnly}
          label="Somente músicas do livro"
          hint="Esconde a busca livre no YouTube"
        />

        <button
          type="submit"
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar regras ✅"}
        </button>
      </form>
    </div>
  );
}
