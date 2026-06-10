const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Song = require('../models/Song');

const SONGS_FILE = path.join(__dirname, 'songs.json');

// Faz o upsert do catálogo a partir de songs.json.
// - upsert por `code`
// - não sobrescreve `videoId` já resolvido
// Retorna { upserted, skipped } ou null se o arquivo não existir.
async function runSeed() {
  if (!fs.existsSync(SONGS_FILE)) {
    console.warn('[seed] Aviso: src/seed/songs.json não encontrado — seed ignorado.');
    return null;
  }

  let songs;
  try {
    songs = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf8'));
  } catch (err) {
    console.error('[seed] Erro ao ler/parsear songs.json:', err.message);
    return null;
  }

  if (!Array.isArray(songs)) {
    console.error('[seed] songs.json deve conter um array.');
    return null;
  }

  let upserted = 0;
  let skipped = 0;

  for (const song of songs) {
    if (
      !song ||
      !Number.isInteger(song.code) ||
      song.code < 1 ||
      song.code > 9999 ||
      typeof song.title !== 'string' ||
      typeof song.artist !== 'string'
    ) {
      skipped++;
      continue;
    }

    const searchQuery =
      typeof song.searchQuery === 'string' && song.searchQuery.trim()
        ? song.searchQuery.trim()
        : `${song.title} ${song.artist} karaokê`;

    const set = {
      title: song.title.trim(),
      artist: song.artist.trim(),
      genre: song.genre ? String(song.genre).trim().toLowerCase() : undefined,
      language: ['pt', 'en', 'es'].includes(song.language) ? song.language : 'pt',
      searchQuery,
    };

    // Não sobrescreve videoId já resolvido: só seta se o doc existente não tiver
    const existing = await Song.findOne({ code: song.code });
    if (existing) {
      Object.assign(existing, set);
      if (!existing.videoId && song.videoId) {
        existing.videoId = song.videoId;
      }
      await existing.save();
    } else {
      await Song.create({
        code: song.code,
        ...set,
        videoId: song.videoId || null,
      });
    }
    upserted++;
  }

  console.log(`[seed] Concluído: ${upserted} músicas upsertadas, ${skipped} ignoradas.`);
  return { upserted, skipped };
}

// Execução direta: npm run seed
if (require.main === module) {
  require('dotenv').config();
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/karaoke';
  mongoose
    .connect(uri)
    .then(() => runSeed())
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] Falha:', err);
      process.exit(1);
    });
}

module.exports = { runSeed };
