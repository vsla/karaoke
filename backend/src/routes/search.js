const express = require('express');
const { searchYouTube } = require('../utils/youtube');

const router = express.Router();

// GET /api/search?q=
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (typeof q !== 'string' || !q.trim()) {
      return res.status(400).json({ error: 'Informe o termo de busca (q)' });
    }
    if (q.trim().length > 100) {
      return res.status(400).json({ error: 'Termo de busca muito longo' });
    }

    const items = await searchYouTube(q.trim(), 12);
    return res.json({ items });
  } catch (err) {
    console.error('Erro na busca do YouTube:', err);
    return res.status(502).json({ error: 'Erro ao buscar no YouTube' });
  }
});

module.exports = router;
