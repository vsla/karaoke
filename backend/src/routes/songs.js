const express = require('express');
const mongoose = require('mongoose');
const Song = require('../models/Song');
const { searchYouTube } = require('../utils/youtube');

const router = express.Router();

const PAGE_SIZE = 50;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/songs — lista/busca catálogo
router.get('/', async (req, res) => {
  try {
    const { search, genre, artist, language } = req.query;
    let page = parseInt(req.query.page, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;

    const filter = {};

    if (search !== undefined) {
      if (typeof search !== 'string' || search.trim().length > 100) {
        return res.status(400).json({ error: 'Busca inválida' });
      }
      const term = search.trim();
      if (term) {
        const rx = new RegExp(escapeRegex(term), 'i');
        filter.$or = [{ title: rx }, { artist: rx }];
      }
    }
    if (genre) {
      if (typeof genre !== 'string' || genre.length > 40) {
        return res.status(400).json({ error: 'Gênero inválido' });
      }
      filter.genre = genre.trim().toLowerCase();
    }
    if (artist) {
      if (typeof artist !== 'string' || artist.length > 60) {
        return res.status(400).json({ error: 'Artista inválido' });
      }
      filter.artist = new RegExp(`^${escapeRegex(artist.trim())}$`, 'i');
    }
    if (language) {
      if (!['pt', 'en', 'es'].includes(language)) {
        return res.status(400).json({ error: 'Idioma inválido' });
      }
      filter.language = language;
    }

    const total = await Song.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const songs = await Song.find(filter)
      .sort({ artist: 1, title: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

    return res.json({ songs, total, page, pages });
  } catch (err) {
    console.error('Erro ao listar músicas:', err);
    return res.status(500).json({ error: 'Erro ao listar músicas' });
  }
});

// GET /api/songs/artists — artistas distintos com contagem
router.get('/artists', async (req, res) => {
  try {
    const artists = await Song.aggregate([
      { $group: { _id: '$artist', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, artist: '$_id', count: 1 } },
    ]);
    return res.json({ artists });
  } catch (err) {
    console.error('Erro ao listar artistas:', err);
    return res.status(500).json({ error: 'Erro ao listar artistas' });
  }
});

// GET /api/songs/genres — gêneros distintos com contagem
router.get('/genres', async (req, res) => {
  try {
    const genres = await Song.aggregate([
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, genre: '$_id', count: 1 } },
    ]);
    return res.json({ genres });
  } catch (err) {
    console.error('Erro ao listar gêneros:', err);
    return res.status(500).json({ error: 'Erro ao listar gêneros' });
  }
});

// GET /api/songs/code/:code — música por código do livro
router.get('/code/:code', async (req, res) => {
  try {
    const code = parseInt(req.params.code, 10);
    if (!Number.isInteger(code) || code < 1 || code > 9999) {
      return res.status(400).json({ error: 'Código inválido (1–9999)' });
    }
    const song = await Song.findOne({ code });
    if (!song) {
      return res.status(404).json({ error: 'Música não encontrada' });
    }
    return res.json(song);
  } catch (err) {
    console.error('Erro ao buscar música por código:', err);
    return res.status(500).json({ error: 'Erro ao buscar música' });
  }
});

// POST /api/songs/:id/resolve — resolve videoId lazy via YouTube
router.post('/:id/resolve', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Música não encontrada' });
    }

    if (song.videoId) {
      return res.json(song);
    }

    const items = await searchYouTube(song.searchQuery, 12);
    if (!items.length) {
      return res.status(404).json({ error: 'Nenhum vídeo encontrado para essa música' });
    }

    song.videoId = items[0].videoId;
    await song.save();
    return res.json(song);
  } catch (err) {
    console.error('Erro ao resolver vídeo:', err);
    return res.status(502).json({ error: 'Erro ao buscar vídeo no YouTube' });
  }
});

module.exports = router;
