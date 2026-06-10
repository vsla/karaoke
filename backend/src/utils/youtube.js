const axios = require('axios');
const SearchCache = require('../models/SearchCache');

const YT_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

function normalizeQuery(q) {
  return String(q).trim().toLowerCase();
}

// Acrescenta " karaokê" se o termo não contiver karaoke/karaokê
function buildSearchTerm(q) {
  const term = String(q).trim();
  if (/karaok[eê]/i.test(term)) return term;
  return `${term} karaokê`;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function normalizeItems(rawItems) {
  return (rawItems || [])
    .filter((item) => item && item.id && item.id.videoId)
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet ? decodeHtmlEntities(item.snippet.title) : '',
      thumbnail:
        item.snippet && item.snippet.thumbnails
          ? (item.snippet.thumbnails.medium || item.snippet.thumbnails.default || {}).url || ''
          : '',
      channel: item.snippet ? item.snippet.channelTitle : '',
    }));
}

// Busca no YouTube com cache no Mongo. Retorna [{videoId, title, thumbnail, channel}]
async function searchYouTube(query, maxResults = 12) {
  const term = buildSearchTerm(query);
  const cacheKey = normalizeQuery(term);

  const cached = await SearchCache.findOne({ query: cacheKey });
  if (cached && Array.isArray(cached.results)) {
    return cached.results;
  }

  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY não configurada');
  }

  const { data } = await axios.get(YT_SEARCH_URL, {
    params: {
      part: 'snippet',
      type: 'video',
      maxResults,
      q: term,
      key: process.env.YOUTUBE_API_KEY,
      videoEmbeddable: 'true',
      safeSearch: 'none',
    },
    timeout: 10000,
  });

  const items = normalizeItems(data.items);

  await SearchCache.findOneAndUpdate(
    { query: cacheKey },
    { $set: { results: items, createdAt: new Date() } },
    { upsert: true }
  );

  return items;
}

module.exports = { searchYouTube, buildSearchTerm, normalizeQuery };
