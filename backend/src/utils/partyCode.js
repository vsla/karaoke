const Party = require('../models/Party');

// Letras A-Z sem ambíguas I e O
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomCode() {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  return code;
}

// Gera código único de 4 letras, com retry em caso de colisão
async function generateUniqueCode(maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = randomCode();
    const exists = await Party.exists({ code });
    if (!exists) return code;
  }
  throw new Error('Não foi possível gerar um código único de festa');
}

module.exports = { generateUniqueCode, randomCode, LETTERS };
