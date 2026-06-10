import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/api";
import { syncFromBackend } from "../utils/partyHistory";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(!!localStorage.getItem("kp_token"));

  // Restaura sessão no boot
  useEffect(() => {
    const token = localStorage.getItem("kp_token");
    if (!token) return;
    api
      .get("/api/auth/me")
      .then(({ data }) => {
        setUser({ name: data.user.name });
        setFavorites(data.user.favorites || []);
        if (data.user.name && !localStorage.getItem("kp_name")) {
          localStorage.setItem("kp_name", data.user.name);
        }
        syncFromBackend();
      })
      .catch(() => {
        localStorage.removeItem("kp_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const applyAuth = useCallback((data) => {
    localStorage.setItem("kp_token", data.token);
    setUser({ name: data.user.name });
    setFavorites(data.user.favorites || []);
    localStorage.setItem("kp_name", data.user.name);
    // Carrega favoritos completos + sincroniza histórico de festas
    api
      .get("/api/me/favorites")
      .then(({ data: fav }) => setFavorites(fav.favorites || fav || []))
      .catch(() => {});
    syncFromBackend();
  }, []);

  const login = useCallback(
    async (name, pin) => {
      const { data } = await api.post("/api/auth/login", { name, pin });
      applyAuth(data);
      return data.user;
    },
    [applyAuth]
  );

  const register = useCallback(
    async (name, pin) => {
      const { data } = await api.post("/api/auth/register", { name, pin });
      applyAuth(data);
      return data.user;
    },
    [applyAuth]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("kp_token");
    setUser(null);
    setFavorites([]);
  }, []);

  const isFavorite = useCallback(
    (videoId) => favorites.some((f) => f.videoId === videoId),
    [favorites]
  );

  const addFavorite = useCallback(async (song) => {
    // song: {videoId, title, thumbnail, artist?, songCode?}
    setFavorites((f) =>
      f.some((x) => x.videoId === song.videoId) ? f : [...f, song]
    );
    try {
      await api.post("/api/me/favorites", song);
    } catch (e) {
      setFavorites((f) => f.filter((x) => x.videoId !== song.videoId));
      throw e;
    }
  }, []);

  const removeFavorite = useCallback(async (videoId) => {
    let removed;
    setFavorites((f) => {
      removed = f.find((x) => x.videoId === videoId);
      return f.filter((x) => x.videoId !== videoId);
    });
    try {
      await api.delete(`/api/me/favorites/${videoId}`);
    } catch (e) {
      if (removed) setFavorites((f) => [...f, removed]);
      throw e;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        favorites,
        login,
        register,
        logout,
        isFavorite,
        addFavorite,
        removeFavorite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
