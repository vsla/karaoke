const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function loadUserFromHeader(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(payload.id);
  return user || null;
}

// Auth obrigatório
async function auth(req, res, next) {
  try {
    const user = await loadUserFromHeader(req);
    if (!user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Auth opcional: popula req.user se houver token válido, segue em frente caso contrário
async function authOptional(req, res, next) {
  try {
    const user = await loadUserFromHeader(req);
    if (user) req.user = user;
  } catch (err) {
    // token inválido = trata como anônimo
  }
  next();
}

// Exige header x-admin-pin correto
function adminPin(req, res, next) {
  const pin = req.headers['x-admin-pin'];
  if (!process.env.ADMIN_PIN) {
    return res.status(500).json({ error: 'ADMIN_PIN não configurado no servidor' });
  }
  if (!pin || pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'PIN de admin inválido' });
  }
  next();
}

module.exports = { auth, authOptional, adminPin };
