const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
}

function validateCredentials(name, pin) {
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 20) {
    return 'Nome deve ter entre 2 e 20 caracteres';
  }
  if (typeof pin !== 'string' && typeof pin !== 'number') {
    return 'PIN é obrigatório';
  }
  const pinStr = String(pin);
  if (!/^\d{4,6}$/.test(pinStr)) {
    return 'PIN deve ter de 4 a 6 dígitos';
  }
  return null;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, pin } = req.body || {};
    const validationError = validateCredentials(name, pin);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const displayName = name.trim();
    const lowerName = displayName.toLowerCase();

    const exists = await User.findOne({ name: lowerName });
    if (exists) {
      return res.status(409).json({ error: 'Esse nome já está em uso' });
    }

    const pinHash = await bcrypt.hash(String(pin), 10);
    const user = await User.create({
      name: lowerName,
      displayName,
      pinHash,
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: { name: user.displayName } });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Esse nome já está em uso' });
    }
    console.error('Erro no register:', err);
    return res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { name, pin } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || (typeof pin !== 'string' && typeof pin !== 'number')) {
      return res.status(400).json({ error: 'Informe nome e PIN' });
    }

    const user = await User.findOne({ name: name.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Nome ou PIN inválidos' });
    }

    const ok = await bcrypt.compare(String(pin), user.pinHash);
    if (!ok) {
      return res.status(401).json({ error: 'Nome ou PIN inválidos' });
    }

    const token = signToken(user);
    return res.json({ token, user: { name: user.displayName } });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// PUT /api/auth/pin — troca o PIN (já logado, não precisa do antigo)
router.put('/pin', auth, async (req, res) => {
  try {
    const { newPin } = req.body || {};

    if (!newPin) {
      return res.status(400).json({ error: 'Informe o novo PIN' });
    }
    const newStr = String(newPin);
    if (!/^\d{4,6}$/.test(newStr)) {
      return res.status(400).json({ error: 'Novo PIN deve ter de 4 a 6 dígitos' });
    }

    req.user.pinHash = await bcrypt.hash(newStr, 10);
    await req.user.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao trocar PIN:', err);
    return res.status(500).json({ error: 'Erro ao trocar PIN' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  return res.json({
    user: {
      name: req.user.displayName,
      favorites: req.user.favorites,
      partyHistory: req.user.partyHistory || [],
    },
  });
});

module.exports = router;
