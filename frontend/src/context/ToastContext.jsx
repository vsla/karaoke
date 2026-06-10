import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback(
    (message, type = "success") => {
      const id = nextId++;
      setToasts((t) => [...t, { id, message, type }]);
      timers.current[id] = setTimeout(() => remove(id), 3500);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            className={`pointer-events-auto animate-slide-up rounded-2xl px-4 py-3 text-center font-medium backdrop-blur border shadow-lg cursor-pointer ${
              t.type === "error"
                ? "bg-red-950/90 border-red-500/50 text-red-200"
                : t.type === "info"
                ? "bg-ink-2/95 border-neon-cyan/50 text-neon-cyan"
                : "bg-ink-2/95 border-neon-pink/50 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
