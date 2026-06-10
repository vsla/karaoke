const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Party = require('../models/Party');
const { authOptional, adminPin } = require('../middleware/auth');
const { generateUniqueCode } = require('../utils/partyCode');
const { emitQueueUpdated, emitPartyDeleted } = require('../socket');

const router = express.Router();

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

async function findPartyByCode(code) {
  return Party.findOne({ code: normalizeCode(code) });
}

// Valida e normaliza settings vindas do cliente. Retorna { value } ou { error }.
function parseSettings(input) {
  if (input === undefined) return { value: undefined };
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { error: 'settings inválidas' };
  }
  const out = {};
  if (input.maxPerSinger !== undefined) {
    const n = Number(input.maxPerSinger);
    if (!Number.isInteger(n) || n < 0 || n > 10) {
      return { error: 'Limite de músicas por pessoa deve ser entre 0 (ilimitado) e 10' };
    }
    out.maxPerSinger = n;
  }
  if (input.blockDuplicates !== undefined) {
    if (typeof input.blockDuplicates !== 'boolean') return { error: 'blockDuplicates inválido' };
    out.blockDuplicates = input.blockDuplicates;
  }
  if (input.catalogOnly !== undefined) {
    if (typeof input.catalogOnly !== 'boolean') return { error: 'catalogOnly inválido' };
    out.catalogOnly = input.catalogOnly;
  }
  return { value: out };
}

// GET /api/party — lista festas (admin)
router.get('/', adminPin, async (req, res) => {
  try {
    const parties = await Party.find().sort({ createdAt: -1 });
    return res.json({ parties });
  } catch (err) {
    console.error('Erro ao listar festas:', err);
    return res.status(500).json({ error: 'Erro ao listar festas' });
  }
});

// POST /api/party — cria festa
router.post('/', authOptional, async (req, res) => {
  try {
    const { name, hostName, settings } = req.body || {};

    const parsed = parseSettings(settings);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const host = req.user ? req.user.displayName : hostName;
    if (typeof host !== 'string' || !host.trim() || host.trim().length > 30) {
      return res.status(400).json({ error: 'Informe o nome do anfitrião (até 30 caracteres)' });
    }
    if (name !== undefined && (typeof name !== 'string' || name.length > 60)) {
      return res.status(400).json({ error: 'Nome da festa inválido (até 60 caracteres)' });
    }

    const code = await generateUniqueCode();
    const party = await Party.create({
      code,
      name: name ? name.trim() : undefined,
      hostName: host.trim(),
      settings: parsed.value,
    });

    return res.status(201).json(party);
  } catch (err) {
    console.error('Erro ao criar festa:', err);
    return res.status(500).json({ error: 'Erro ao criar festa' });
  }
});

// GET /api/party/:code
router.get('/:code', async (req, res) => {
  try {
    const party = await findPartyByCode(req.params.code);
    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }
    return res.json(party);
  } catch (err) {
    console.error('Erro ao buscar festa:', err);
    return res.status(500).json({ error: 'Erro ao buscar festa' });
  }
});

// POST /api/party/:code/queue — adiciona música à fila
router.post('/:code/queue', async (req, res) => {
  try {
    const { videoId, title, thumbnail, singer } = req.body || {};

    if (typeof videoId !== 'string' || !videoId.trim()) {
      return res.status(400).json({ error: 'videoId é obrigatório' });
    }
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title é obrigatório' });
    }
    if (typeof singer !== 'string' || !singer.trim() || singer.trim().length > 30) {
      return res.status(400).json({ error: 'Informe quem vai cantar (até 30 caracteres)' });
    }
    if (thumbnail !== undefined && typeof thumbnail !== 'string') {
      return res.status(400).json({ error: 'thumbnail inválida' });
    }

    const party = await findPartyByCode(req.params.code);
    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const settings = party.settings || {};
    const allItems = [...party.queue, ...(party.nowPlaying ? [party.nowPlaying] : [])];

    // Limite de músicas por pessoa (conta fila + tocando agora)
    if (settings.maxPerSinger > 0) {
      const singerKey = singer.trim().toLowerCase();
      const count = allItems.filter((i) => i.singer.trim().toLowerCase() === singerKey).length;
      if (count >= settings.maxPerSinger) {
        return res.status(400).json({
          error: `Limite atingido: máximo de ${settings.maxPerSinger} música(s) por pessoa na fila`,
        });
      }
    }

    // Bloqueia música repetida
    if (settings.blockDuplicates && allItems.some((i) => i.videoId === videoId.trim())) {
      return res.status(400).json({ error: 'Essa música já está na fila!' });
    }

    const item = {
      queueId: uuidv4(),
      videoId: videoId.trim(),
      title: title.trim(),
      thumbnail: thumbnail ? String(thumbnail) : '',
      singer: singer.trim(),
      addedAt: new Date(),
    };

    // Se não tem nada tocando e fila vazia, vai direto pra nowPlaying
    if (!party.nowPlaying && party.queue.length === 0) {
      party.nowPlaying = item;
    } else {
      party.queue.push(item);
    }

    await party.save();
    emitQueueUpdated(party.code, party);
    return res.status(201).json(party);
  } catch (err) {
    console.error('Erro ao adicionar à fila:', err);
    return res.status(500).json({ error: 'Erro ao adicionar música à fila' });
  }
});

// PATCH /api/party/:code/settings — atualiza configurações da festa (host)
router.patch('/:code/settings', async (req, res) => {
  try {
    const parsed = parseSettings(req.body?.settings ?? req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const party = await findPartyByCode(req.params.code);
    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    party.settings = { ...party.settings?.toObject?.(), ...parsed.value };
    await party.save();
    emitQueueUpdated(party.code, party);
    return res.json(party);
  } catch (err) {
    console.error('Erro ao atualizar configurações:', err);
    return res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// PUT /api/party/:code/queue — reordena fila
router.put('/:code/queue', async (req, res) => {
  try {
    const { queue } = req.body || {};
    if (!Array.isArray(queue)) {
      return res.status(400).json({ error: 'queue deve ser uma lista' });
    }

    const party = await findPartyByCode(req.params.code);
    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    // Valida que são exatamente os mesmos queueIds (mesma quantidade, sem itens novos)
    const currentIds = party.queue.map((i) => i.queueId).sort();
    const newIds = queue.map((i) => i && i.queueId).sort();
    const sameIds =
      currentIds.length === newIds.length &&
      currentIds.every((id, idx) => id === newIds[idx]);

    if (!sameIds) {
      return res.status(400).json({ error: 'A nova ordem não corresponde aos itens da fila' });
    }

    // Reordena usando os itens originais (não confia nos dados enviados)
    const byId = new Map(party.queue.map((i) => [i.queueId, i]));
    party.queue = queue.map((i) => byId.get(i.queueId));

    await party.save();
    emitQueueUpdated(party.code, party);
    return res.json(party);
  } catch (err) {
    console.error('Erro ao reordenar fila:', err);
    return res.status(500).json({ error: 'Erro ao reordenar fila' });
  }
});

// DELETE /api/party/:code/queue/:queueId — remove item da fila
router.delete('/:code/queue/:queueId', async (req, res) => {
  try {
    const party = await findPartyByCode(req.params.code);
    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const before = party.queue.length;
    party.queue = party.queue.filter((i) => i.queueId !== req.params.queueId);
    if (party.queue.length === before) {
      return res.status(404).json({ error: 'Item não encontrado na fila' });
    }

    await party.save();
    emitQueueUpdated(party.code, party);
    return res.json(party);
  } catch (err) {
    console.error('Erro ao remover da fila:', err);
    return res.status(500).json({ error: 'Erro ao remover música da fila' });
  }
});

// POST /api/party/:code/next — avança para próxima música
router.post('/:code/next', async (req, res) => {
  try {
    const party = await findPartyByCode(req.params.code);
    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    // Salva música atual no histórico de tocadas
    if (party.nowPlaying) {
      party.played.push(party.nowPlaying);
    }

    party.nowPlaying = party.queue.shift() ?? null;
    party.markModified('queue');

    await party.save();
    emitQueueUpdated(party.code, party);
    return res.json(party);
  } catch (err) {
    console.error('Erro ao avançar fila:', err);
    return res.status(500).json({ error: 'Erro ao avançar para a próxima música' });
  }
});

// DELETE /api/party/:code — encerra festa (admin)
router.delete('/:code', adminPin, async (req, res) => {
  try {
    const party = await Party.findOneAndDelete({ code: normalizeCode(req.params.code) });
    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }
    emitPartyDeleted(party.code);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao deletar festa:', err);
    return res.status(500).json({ error: 'Erro ao encerrar festa' });
  }
});

module.exports = router;
