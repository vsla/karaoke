const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas exigem auth
router.use(auth);

// GET /api/me/favorites
router.get('/', async (req, res) => {
  return res.json({ favorites: req.user.favorites });
});

// POST /api/me/favorites
router.post('/', async (req, res) => {
  try {
    const { videoId, title, thumbnail, artist, songCode } = req.body || {};

    if (typeof videoId !== 'string' || !videoId.trim()) {
      return res.status(400).json({ error: 'videoId é obrigatório' });
    }
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title é obrigatório' });
    }
    if (thumbnail !== undefined && typeof thumbnail !== 'string') {
      return res.status(400).json({ error: 'thumbnail inválida' });
    }
    if (artist !== undefined && typeof artist !== 'string') {
      return res.status(400).json({ error: 'artist inválido' });
    }
    if (songCode !== undefined && !Number.isInteger(Number(songCode))) {
      return res.status(400).json({ error: 'songCode inválido' });
    }

    const exists = req.user.favorites.some((f) => f.videoId === videoId.trim());
    if (exists) {
      return res.status(409).json({ error: 'Música já está nas favoritas' });
    }

    req.user.favorites.push({
      videoId: videoId.trim(),
      title: title.trim(),
      thumbnail: thumbnail ? String(thumbnail) : '',
      artist: artist ? artist.trim() : undefined,
      songCode: songCode !== undefined ? Number(songCode) : undefined,
    });
    await req.user.save();

    return res.status(201).json({ favorites: req.user.favorites });
  } catch (err) {
    console.error('Erro ao adicionar favorita:', err);
    return res.status(500).json({ error: 'Erro ao adicionar favorita' });
  }
});

// DELETE /api/me/favorites/:videoId
router.delete('/:videoId', async (req, res) => {
  try {
    const before = req.user.favorites.length;
    req.user.favorites = req.user.favorites.filter((f) => f.videoId !== req.params.videoId);
    if (req.user.favorites.length === before) {
      return res.status(404).json({ error: 'Favorita não encontrada' });
    }
    await req.user.save();
    return res.json({ favorites: req.user.favorites });
  } catch (err) {
    console.error('Erro ao remover favorita:', err);
    return res.status(500).json({ error: 'Erro ao remover favorita' });
  }
});

module.exports = router;
