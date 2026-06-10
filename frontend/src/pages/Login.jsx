import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("login"); // login | register
  const [name, setName] = useState(localStorage.getItem("kp_name") || "");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (tab === "login") {
        await login(name.trim(), pin);
        toast(`Bem-vindo de volta, ${name.trim()}! 🎤`);
      } else {
        await register(name.trim(), pin);
        toast("Conta criada! Agora favorita sem dó ⭐");
      }
      navigate(-1);
    } catch (err) {
      toast(err.response?.data?.error || "Não deu certo 😬 confere os dados!", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link to="/" className="absolute top-4 left-4 btn-ghost">
        ← início
      </Link>

      <p className="text-5xl mb-4 animate-floaty">⭐</p>
      <h1 className="font-display text-2xl neon-text mb-2 text-center">Sua conta</h1>
      <p className="text-white/40 text-sm mb-8 text-center max-w-xs">
        Conta é opcional — serve só pra guardar suas músicas favoritas entre festas.
      </p>

      <div className="card p-6 w-full max-w-sm">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 rounded-xl py-2.5 font-display text-sm transition-all ${
              tab === "login"
                ? "bg-neon-cyan/15 border border-neon-cyan/60 text-neon-cyan"
                : "bg-ink-3 border border-white/10 text-white/50"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 rounded-xl py-2.5 font-display text-sm transition-all ${
              tab === "register"
                ? "bg-neon-pink/15 border border-neon-pink/60 text-neon-pink"
                : "bg-ink-3 border border-white/10 text-white/50"
            }`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            minLength={2}
            maxLength={20}
            required
            className="input-base"
          />
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="PIN (4 a 6 números)"
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            minLength={4}
            maxLength={6}
            required
            className="input-base text-center tracking-[0.5em] font-display"
          />
          <button
            type="submit"
            disabled={busy || name.trim().length < 2 || pin.length < 4}
            className="btn-primary disabled:opacity-50"
          >
            {busy ? "Um segundo…" : tab === "login" ? "Entrar 🎶" : "Criar conta 🌟"}
          </button>
        </form>
        {tab === "register" && (
          <p className="text-white/30 text-xs mt-4 text-center">
            Sem e-mail, sem senha gigante. Só nome + PIN. Simples assim. 😎
          </p>
        )}
      </div>
    </div>
  );
}
