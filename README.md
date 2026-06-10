# 🎤 Karaoke Party

App de festa de karaokê. O host cria a festa e projeta o player na TV; os convidados entram pelo celular com um código de 4 letras, escolhem músicas (livro pré-indexado com 680+ músicas por código, busca no YouTube ou favoritas) e a reprodução é automática.

## Estrutura

```
backend/    Express + MongoDB + Socket.io (API, auth, catálogo, cache de busca)
frontend/   Vite + React + Tailwind (SPA servida por nginx, que faz proxy da API)
```

As pastas `backend-karaoke-app/` e `frontend-karaoke-app/` são a versão antiga (backup) e podem ser apagadas.

## Funcionalidades

- Festa com código de 4 letras, expira sozinha em 48h
- Livro de karaokê: 687 músicas pré-indexadas com código numérico (1001 = Evidências 😄), navegação por gênero/artista
- Busca YouTube com cache no Mongo (economiza quota da API)
- Conta opcional (nome + PIN) para salvar músicas favoritas
- Fila em tempo real (Socket.io), reordenação pelo host
- Player de TV com autoplay contínuo, transição "Próximo: fulano — música" e tela idle com o código da festa
- Painel admin protegido por PIN

## Rodando em produção (VPS / Azure)

Pré-requisito: Docker + Docker Compose instalados na VPS.

```bash
git clone <seu-repo> karaoke && cd karaoke
cp .env.example .env
nano .env   # preencha JWT_SECRET, YOUTUBE_API_KEY, ADMIN_PIN, CORS_ORIGIN
docker compose up -d --build
```

Pronto: app em `http://<ip-da-vps>`. O seed do catálogo roda sozinho no primeiro boot (coleção vazia).

- `CORS_ORIGIN` deve ser a URL pública do frontend (ex.: `http://20.30.40.50` ou seu domínio).
- A chave do YouTube vem do [Google Cloud Console](https://console.cloud.google.com/) → YouTube Data API v3.
- Atualizar: `git pull && docker compose up -d --build`.
- Logs: `docker compose logs -f backend`.

## Desenvolvimento local

```bash
# Mongo
docker run -d -p 27017:27017 mongo:7

# Backend
cd backend
cp .env.example .env   # MONGO_URI=mongodb://localhost:27017/karaoke
npm install && npm run dev

# Frontend (proxy /api e /socket.io para :5000 já configurado no vite.config.js)
cd frontend
npm install && npm run dev
```

Frontend em `http://localhost:3000`.

## Rotas principais

| Rota | O quê |
|---|---|
| `/` | Criar/entrar na festa |
| `/party/ABCD` | Tela do convidado (fila + adicionar música) |
| `/party/ABCD/player` | Player para a TV |
| `/login` | Conta (nome + PIN) para favoritas |
| `/admin` | Painel admin (PIN) |
