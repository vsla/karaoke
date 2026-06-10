import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SongResultRow from "./SongResultRow";

export default function FavoritesTab({ onAddSong }) {
  const { user, favorites } = useAuth();

  if (!user) {
    return (
      <div className="text-center py-10">
        <p className="text-4xl mb-3">⭐</p>
        <p className="font-display text-lg mb-2">Suas favoritas moram aqui</p>
        <p className="text-white/40 mb-6 text-sm">
          Cria uma conta rapidinho (nome + PIN) e nunca mais esquece aquele hino.
        </p>
        <Link to="/login" className="btn-secondary inline-block">
          Criar conta / Entrar
        </Link>
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <div className="text-center py-10 text-white/40">
        <p className="text-4xl mb-3">🌵</p>
        <p>Nenhuma favorita ainda.</p>
        <p className="text-sm mt-1">Toca na ⭐ de qualquer música pra salvar!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {favorites.map((f) => (
        <SongResultRow
          key={f.videoId}
          song={{
            ...f,
            thumbnail:
              f.thumbnail || `https://i.ytimg.com/vi/${f.videoId}/mqdefault.jpg`,
          }}
          badge={f.songCode ? `Livro #${String(f.songCode).padStart(4, "0")}` : null}
          onAdd={onAddSong}
        />
      ))}
    </div>
  );
}
