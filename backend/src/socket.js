const { Server } = require('socket.io');

let io = null;

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGIN || '*';
  if (raw === '*') return '*';
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: parseCorsOrigins(),
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('joinParty', (code) => {
      if (typeof code !== 'string') return;
      const room = code.trim().toUpperCase();
      if (!/^[A-Z]{4}$/.test(room)) return;
      socket.join(room);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io não inicializado');
  return io;
}

// Emite atualização de fila para a sala da festa
function emitQueueUpdated(code, party) {
  if (!io) return;
  io.to(code.toUpperCase()).emit('queueUpdated', {
    queue: party.queue,
    nowPlaying: party.nowPlaying,
    settings: party.settings,
    played: party.played,
  });
}

function emitPartyDeleted(code) {
  if (!io) return;
  io.to(code.toUpperCase()).emit('partyDeleted');
}

module.exports = { initSocket, getIO, emitQueueUpdated, emitPartyDeleted, parseCorsOrigins };
