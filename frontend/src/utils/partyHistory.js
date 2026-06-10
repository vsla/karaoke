import api from "../api/api";

const KEY = "kp_parties";
const MAX = 20;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

function isLoggedIn() {
  return !!localStorage.getItem("kp_token");
}

// Salva ou atualiza uma festa no histórico (localStorage + backend se logado)
export function trackParty({ code, name, role }) {
  const list = load();
  const idx = list.findIndex((p) => p.code === code);
  const entry = {
    code,
    name: name || "",
    role: role || "guest",
    lastSeen: Date.now(),
  };
  if (idx >= 0) {
    if (list[idx].role === "host") entry.role = "host";
    if (list[idx].name && !entry.name) entry.name = list[idx].name;
    list.splice(idx, 1);
  }
  list.unshift(entry);
  save(list);

  // Sync com backend (fire and forget)
  if (isLoggedIn()) {
    api.post("/api/me/parties", { code, name: entry.name, role: entry.role }).catch(() => {});
  }
}

// Retorna lista de festas (mais recentes primeiro)
export function getPartyHistory() {
  return load();
}

// Remove festa do histórico
export function removeFromHistory(code) {
  save(load().filter((p) => p.code !== code));

  if (isLoggedIn()) {
    api.delete(`/api/me/parties/${code}`).catch(() => {});
  }
}

// Merge backend → localStorage (chamado no login/boot)
export async function syncFromBackend() {
  if (!isLoggedIn()) return;
  try {
    const { data } = await api.get("/api/me/parties");
    const remote = data.parties || [];
    const local = load();

    // Merge: backend é fonte de verdade, local pode ter festas mais recentes
    const merged = new Map();
    for (const p of remote) {
      merged.set(p.code, {
        code: p.code,
        name: p.name || "",
        role: p.role || "guest",
        lastSeen: new Date(p.lastSeen).getTime(),
      });
    }
    for (const p of local) {
      const existing = merged.get(p.code);
      if (!existing || p.lastSeen > existing.lastSeen) {
        merged.set(p.code, p);
        // Push local-only to backend
        if (!existing) {
          api.post("/api/me/parties", { code: p.code, name: p.name, role: p.role }).catch(() => {});
        }
      }
    }

    const result = [...merged.values()]
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, MAX);
    save(result);
  } catch {
    // offline — usa localStorage
  }
}
