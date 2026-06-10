const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();
const MAX_HISTORY = 20;

router.use(auth);

// GET /api/me/parties
router.get('/', (req, res) => {
  return res.json({ parties: req.user.partyHistory || [] });
});

// POST /api/me/parties — adiciona/atualiza festa no histórico
router.post('/', async (req, res) => {
  try {
    const { code, name, role } = req.body || {};

    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'code é obrigatório' });
    }
    const upperCode = code.trim().toUpperCase();
    const validRole = role === 'host' ? 'host' : 'guest';

    const history = req.user.partyHistory || [];
    const idx = history.findIndex((p) => p.code === upperCode);

    if (idx >= 0) {
      // Atualiza existente
      const existing = history[idx];
      existing.lastSeen = new Date();
      if (name && typeof name === 'string') existing.name = name.trim();
      if (validRole === 'host') existing.role = 'host';
      // Move pro topo
      history.splice(idx, 1);
      history.unshift(existing);
    } else {
      history.unshift({
        code: upperCode,
        name: name && typeof name === 'string' ? name.trim() : '',
        role: validRole,
        lastSeen: new Date(),
      });
    }

    // Limita tamanho
    req.user.partyHistory = history.slice(0, MAX_HISTORY);
    await req.user.save();

    return res.json({ parties: req.user.partyHistory });
  } catch (err) {
    console.error('Erro ao salvar histórico de festa:', err);
    return res.status(500).json({ error: 'Erro ao salvar histórico' });
  }
});

// DELETE /api/me/parties/:code
router.delete('/:code', async (req, res) => {
  try {
    const upperCode = req.params.code.trim().toUpperCase();
    const before = req.user.partyHistory.length;
    req.user.partyHistory = req.user.partyHistory.filter((p) => p.code !== upperCode);
    if (req.user.partyHistory.length === before) {
      return res.status(404).json({ error: 'Festa não encontrada no histórico' });
    }
    await req.user.save();
    return res.json({ parties: req.user.partyHistory });
  } catch (err) {
    console.error('Erro ao remover do histórico:', err);
    return res.status(500).json({ error: 'Erro ao remover do histórico' });
  }
});

module.exports = router;
