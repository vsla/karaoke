# Karaoke Party — SPEC v2

Reescrita completa do app de karaokê. Monorepo:

```
Karaoke/
├── backend/          # Node 20, Express 4, Mongoose 8, Socket.io 4 (CommonJS)
├── frontend/         # Vite + React 18 + Tailwind CSS 3 (JSX, sem TypeScript)
├── docker-compose.yml
├── .env.example
└── README.md
```

Pastas antigas `backend-karaoke-app/` e `frontend-karaoke-app/` ficam intocadas (backup, serão removidas pelo usuário depois).

## Conceito de produto

App de festa de karaokê. Host cria festa, projeta a tela do Player numa TV. Convidados entram pelo celular com código de 4 letras, escolhem músicas (catálogo pré-indexado tipo "livro de karaokê" com código numérico, busca YouTube, ou favoritas) e entram na fila. Player toca automaticamente, em sequência, mostrando quem canta a próxima.

Tom visual: dark, neon (roxo/rosa/ciano), vibe festa, mobile-first. Nome do app: **Karaoke Party**.

## Variáveis de ambiente (backend)

```
PORT=5000
MONGO_URI=mongodb://mongo:27017/karaoke
JWT_SECRET=<obrigatório>
YOUTUBE_API_KEY=<obrigatório>
ADMIN_PIN=<PIN do painel admin>
CORS_ORIGIN=http://localhost:3000   # em prod, domínio do frontend; aceita lista separada por vírgula
```

Frontend (Vite): `VITE_API_URL` (ex.: `http://localhost:5000`). Em produção atrás do nginx, frontend chama caminho relativo `/api` e socket no mesmo host — usar `VITE_API_URL` vazio = mesma origem.

## Modelos (Mongoose)

### User
- `name`: String, unique, trim, lowercase para unicidade case-insensitive (guardar `displayName` original), 2–20 chars
- `pinHash`: String (bcrypt do PIN de 4–6 dígitos)
- `favorites`: [{ `videoId`, `title`, `thumbnail`, `artist` (opcional), `songCode` (opcional, ref ao catálogo) }]
- `createdAt`

### Party
- `code`: String unique, 4 letras maiúsculas A-Z sem ambíguas (sem I, O) — ex.: `KZTB`
- `name`: String opcional ("Festa da Ana")
- `hostName`: String (displayName de quem criou; se logado, do token)
- `queue`: [{ `queueId` (uuid), `videoId` (YouTube), `title`, `thumbnail`, `singer` (nome de quem canta) , `addedAt` }]
- `nowPlaying`: objeto igual a item da queue ou null. **Fluxo**: `next` faz `nowPlaying = queue.shift()`. Player só lê `nowPlaying`; fila visível são os próximos.
- `createdAt` com TTL index de 48h (festa expira sozinha)

### Song (catálogo)
- `code`: Number unique (1–9999) — "código do livro"
- `title`, `artist`, `genre` (ex.: sertanejo, mpb, pagode, rock, pop, internacional, axé, forró, bossa), `language` (`pt`/`en`/`es`)
- `videoId`: String|null — resolvido lazy
- `searchQuery`: String (ex.: "Evidências Chitãozinho Xororó karaokê")
- Text index em `title` + `artist`

### SearchCache
- `query`: String unique (normalizada lowercase+trim)
- `results`: Mixed (array de itens já no formato do frontend: `{videoId, title, thumbnail, channel}`)
- `createdAt` com TTL de 7 dias

## API REST (prefixo /api)

Erros sempre `{ error: "mensagem" }` com status adequado. Validação de input em todas rotas. `express-rate-limit` global (ex.: 300 req/15min/IP) e mais agressivo em `/auth` (10/15min).

### Auth (`/api/auth`)
- `POST /register` `{name, pin}` → `{token, user:{name}}` — 409 se nome existe
- `POST /login` `{name, pin}` → `{token, user}` — 401 inválido
- `GET /me` (Bearer) → `{user:{name, favorites}}`
- JWT 30 dias. Middleware `auth` (obrigatório) e `authOptional`.

### Party (`/api/party`)
- `POST /` `{name?, hostName}` → cria, retorna party. Sem auth obrigatória.
- `GET /:code` → party (404 se não existe). Code case-insensitive.
- `POST /:code/queue` `{videoId, title, thumbnail, singer}` → adiciona; se `nowPlaying === null` e fila vazia, vai direto pra `nowPlaying`. Emite socket.
- `DELETE /:code/queue/:queueId` → remove. Emite.
- `PUT /:code/queue` `{queue: [...]}` → reordena (valida que são os mesmos queueIds). Emite.
- `POST /:code/next` → `nowPlaying = queue.shift() ?? null`. Emite. (Corrige bug antigo do length>2.)
- `DELETE /:code` → requer header `x-admin-pin` correto OU ser host (simplificação: aceitar admin pin). Emite `partyDeleted`.
- `GET /` → lista festas, requer `x-admin-pin`.

### Songs (`/api/songs`)
- `GET /` query: `search` (text/regex em title+artist), `genre`, `artist`, `language`, `page` (50/página) → `{songs, total, page, pages}`
- `GET /artists` → lista distinct de artistas com contagem
- `GET /genres` → distinct genres com contagem
- `GET /code/:code` → música por código numérico (404 se não existe)
- `POST /:id/resolve` → se `videoId` null: busca YouTube por `searchQuery` (com cache), pega primeiro resultado, salva e retorna song com videoId. Se já tem, retorna direto. **Frontend sempre chama resolve antes de enfileirar música do catálogo.**

### Search (`/api/search`)
- `GET /?q=` → busca YouTube com **cache no Mongo** (SearchCache). Acrescentar `" karaokê"` ao termo se não contiver "karaoke/karaokê" (aumenta relevância). Retorna `{items:[{videoId, title, thumbnail, channel}]}` — formato já limpo, sem expor resposta crua do Google. maxResults=12. Sem paginação (corta quota).

### Favorites (`/api/me/favorites`) — requer auth
- `GET /` → lista
- `POST /` `{videoId, title, thumbnail, artist?, songCode?}` → adiciona (sem duplicar videoId)
- `DELETE /:videoId` → remove

## Socket.io

Cliente emite: `joinParty(code)`.
Servidor emite para sala `code`:
- `queueUpdated` `{queue, nowPlaying}` — após qualquer mutação
- `partyDeleted`

CORS do socket = mesmo `CORS_ORIGIN`.

## Seed do catálogo

`backend/src/seed/songs.json` (gerado por agente, 500+ entradas) + `npm run seed` (`src/seed/seed.js`): upsert por `code`, não duplica, não sobrescreve `videoId` já resolvido. Rodar seed automaticamente no boot se coleção vazia.

## Frontend (Vite + React + Tailwind)

SPA com react-router. Axios instance em `src/api/api.js` (baseURL `import.meta.env.VITE_API_URL || ""`), interceptor que injeta JWT do localStorage. Socket singleton em `src/api/socket.js`.

### Design system
- Tailwind, dark only. bg `#0a0a14`/gradientes escuros, acentos neon: rosa `#ff2d95`, ciano `#22d3ee`, roxo `#a855f7`. Fonte display chamativa pra títulos (ex.: Google Fonts "Outfit"/"Unbounded" via index.html), corpo legível.
- Botões grandes (festa = dedo gordo + bebida), cantos arredondados, glow sutil em CTAs.
- Toasts próprios simples (context) pra feedback ("Música adicionada 🎤").

### Rotas/páginas
- `/` **Home**: logo grande, dois CTAs: "Criar festa" (pede nome da festa + seu nome) e "Entrar na festa" (input 4 letras maiúsculo automático). Link discreto login/conta.
- `/login` ou modal: tabs Entrar/Criar conta — nome + PIN (input numérico). Conta é opcional, só pra favoritos.
- `/party/:code` **Festa** (mobile): header com nome/código da festa + botão copiar link + quem sou eu. "Agora cantando" destacado (thumbnail + cantor). Fila abaixo (posição, título, cantor). FAB/CTA grande "🎤 Adicionar música" abre tela/modal full-screen com **4 abas**:
  1. **Livro** (catálogo): input "Código da música" (digitou 1234 → mostra música → confirmar) + browse por gênero/artista + busca local no catálogo. Lista com código visível tipo livro de karaokê.
  2. **Buscar** (YouTube): busca com debounce manual (botão), resultados com thumb + add.
  3. **Favoritas**: lista das suas, add em 1 toque. Se não logado, CTA pra criar conta.
  4. Em toda música listada: botão ⭐ favoritar (se logado).
  Ao adicionar: pergunta/usa "quem vai cantar" (default = username salvo). Reordenar/remover: só host (flag local de quem criou) — manter simples: botões subir/descer.
- `/party/:code/player` **Player (TV)**: full-screen dark. YouTube IFrame API com **um único player persistente** — trocar vídeo com `loadVideoById`, NUNCA recriar player nem recarregar página. Ao `ENDED`: tela de transição 6s "🎤 Próximo: {singer} — {title}" com countdown, depois `POST next` + autoplay. Botões discretos (hover): pular, pausar. Mostrar fila lateral compacta (próximos 3). Se fila vazia: tela idle bonita com código da festa gigante pra galera entrar.
- `/admin`: PIN gate (header x-admin-pin), tabela de festas + deletar.

### Detalhes de implementação Player
- Autoplay: browsers exigem interação — botão "▶ Iniciar player" no primeiro load, depois tudo automático (mute não necessário após gesto).
- Estado vem de `queueUpdated` socket; `nowPlaying` muda → `loadVideoById`.
- `useRef` pro player YT; carregar iframe_api uma vez.

## Docker

- `backend/Dockerfile`: node:20-alpine, npm ci, CMD node src/server.js
- `frontend/Dockerfile`: build Vite → nginx:alpine servindo `dist` + `nginx.conf` com proxy `/api` e `/socket.io` (websocket upgrade) pro serviço `backend:5000`, e fallback SPA (`try_files ... /index.html`).
- `docker-compose.yml`: serviços `mongo` (volume nomeado), `backend` (env via .env), `frontend` (porta 80). Healthcheck simples no backend (`GET /api/health`).
- `GET /api/health` → `{ok:true}`.
- README: passos pra VPS Azure: clonar, copiar `.env.example`→`.env`, preencher chaves, `docker compose up -d --build`.
