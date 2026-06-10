import { useRef } from "react";

// Input de código da festa: 4 letras, maiúsculas automáticas
export default function CodeInput({ value, onChange, onSubmit, autoFocus }) {
  const ref = useRef(null);

  function handleChange(e) {
    const v = e.target.value
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 4);
    onChange(v);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && value.length === 4 && onSubmit) onSubmit();
  }

  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={4}
        placeholder=""
        aria-label="Código da festa"
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
      />
      <div className="flex gap-3 justify-center pointer-events-none">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-14 h-16 sm:w-16 sm:h-20 rounded-2xl border-2 flex items-center justify-center font-display text-3xl sm:text-4xl font-bold transition-all ${
              value[i]
                ? "border-neon-cyan text-neon-cyan shadow-glow-cyan bg-ink-3"
                : i === value.length
                ? "border-neon-pink/70 bg-ink-3 animate-pulse"
                : "border-white/15 bg-ink-2 text-white/30"
            }`}
          >
            {value[i] || ""}
          </div>
        ))}
      </div>
    </div>
  );
}
