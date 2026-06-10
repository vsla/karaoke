require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const { initSocket, parseCorsOrigins } = require('./socket');
const { runSeed } = require('./seed/seed');
const Song = require('./models/Song');

const authRoutes = require('./routes/auth');
const partyRoutes = require('./routes/party');
const songsRoutes = require('./routes/songs');
const searchRoutes = require('./routes/search');
const favoritesRoutes = require('./routes/favorites');
const partyHistoryRoutes = require('./routes/partyHistory');

const app = express();
const server = http.createServer(app);

// Socket.io
initSocket(server);

// CORS (lista separada por vírgula em CORS_ORIGIN)
app.use(
  cors({
    origin: parseCorsOrigins(),
  })
);

app.use(express.json({ limit: '100kb' }));

// Rate limit global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições, tente novamente em alguns minutos' },
});
app.use('/api', globalLimiter);

// Rate limit mais agressivo em /auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas, tente novamente em alguns minutos' },
});
app.use('/api/auth', authLimiter);

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/party', partyRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/me/favorites', favoritesRoutes);
app.use('/api/me/parties', partyHistoryRoutes);

// 404 de API
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Handler de erro genérico
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/karaoke';

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET é obrigatório. Configure no .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB conectado');
  } catch (err) {
    console.error('Falha ao conectar no MongoDB:', err.message);
    process.exit(1);
  }

  // Auto-seed se a coleção songs estiver vazia
  try {
    const count = await Song.estimatedDocumentCount();
    if (count === 0) {
      console.log('Coleção songs vazia — rodando seed automático...');
      await runSeed();
    }
  } catch (err) {
    console.error('Erro no auto-seed (seguindo mesmo assim):', err.message);
  }

  server.listen(PORT, () => {
    console.log(`Karaoke Party backend rodando na porta ${PORT}`);
  });
}

start();
