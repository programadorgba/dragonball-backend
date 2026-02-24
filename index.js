require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const DB_API = 'https://dragonball-api.com/api';

const cache = {
  characters: [],
  planets:    [],
  loaded:     {},
  loading:    {},
  listeners:  {},
};

async function fetchAllPages(endpoint, limit = 50) {
  let page = 1, all = [], hasMore = true;
  while (hasMore) {
    const { data } = await axios.get(`${DB_API}${endpoint}`, {
      params: { limit, page }, timeout: 20000,
    });
    all = [...all, ...(data.items || [])];
    hasMore = page < (data.meta?.totalPages ?? 1);
    page++;
  }
  return all;
}

const loaders = {
  characters: async () => {
    const items = await fetchAllPages('/characters', 50);
    return items.map(c => ({
      id:              String(c.id),
      name:            c.name            || 'Unknown',
      ki:              c.ki              || '—',
      maxKi:           c.maxKi           || '—',
      race:            c.race            || '—',
      gender:          c.gender          || '—',
      description:     c.description     || '',
      image:           c.image           || null,
      affiliation:     c.affiliation     || '—',
      originPlanet:    c.originPlanet    || null,
      transformations: c.transformations || [],
    }));
  },

  planets: async () => {
    const items = await fetchAllPages('/planets', 20);
    return items.map(p => ({
      id:          String(p.id),
      name:        p.name        || 'Unknown',
      isDestroyed: p.isDestroyed ?? false,
      description: p.description || '',
      image:       p.image       || null,
    }));
  },
};

async function loadResource(resource) {
  if (cache.loaded[resource]) return;
  if (cache.loading[resource]) {
    await new Promise(r => {
      cache.listeners[resource] = cache.listeners[resource] || [];
      cache.listeners[resource].push(r);
    });
    return;
  }
  cache.loading[resource] = true;
  try {
    console.log(`  ⏳ Cargando ${resource}...`);
    cache[resource]        = await loaders[resource]();
    cache.loaded[resource] = true;
    console.log(`  ✅ ${resource}: ${cache[resource].length}`);
  } catch (err) {
    console.error(`  ❌ ${resource}:`, err.message);
    cache[resource] = [];
  } finally {
    cache.loading[resource] = false;
    (cache.listeners[resource] || []).forEach(r => r());
    cache.listeners[resource] = [];
  }
}

async function preloadAll() {
  console.log('🐉 Precargando Dragon Ball...');
  await Promise.all(Object.keys(loaders).map(loadResource));
  console.log('🐉 Listo:', { characters: cache.characters.length, planets: cache.planets.length });
}

function paginate(items, { page = 1, limit = 20, search, race, affiliation, gender } = {}) {
  let data = [...items];
  if (search) {
    const t = search.toLowerCase();
    data = data.filter(i => i.name?.toLowerCase().includes(t) || i.description?.toLowerCase().includes(t));
  }
  if (race)        data = data.filter(i => i.race?.toLowerCase()        === race.toLowerCase());
  if (affiliation) data = data.filter(i => i.affiliation?.toLowerCase() === affiliation.toLowerCase());
  if (gender)      data = data.filter(i => i.gender?.toLowerCase()      === gender.toLowerCase());

  const total = data.length;
  const start = (page - 1) * limit;
  return {
    results: data.slice(start, start + limit),
    count: total, page: Number(page), limit: Number(limit),
    hasMore: start + limit < total,
    totalPages: Math.ceil(total / limit),
  };
}

async function ensureLoaded(resource, res, next) {
  if (!cache.loaded[resource]) {
    let waited = 0;
    while (!cache.loaded[resource] && waited < 12000) {
      await new Promise(r => setTimeout(r, 300));
      waited += 300;
    }
    if (!cache.loaded[resource]) await loadResource(resource);
  }
  next();
}

// ── RUTAS ─────────────────────────────────────────────────────────────────────

app.get('/api/universe', async (req, res) => {
  await Promise.all(Object.keys(loaders).filter(r => !cache.loaded[r]).map(loadResource));
  res.json({
    characters: paginate(cache.characters, { limit: 9999 }),
    planets:    paginate(cache.planets,    { limit: 9999 }),
  });
});

app.get('/api/characters', (req, res, next) => ensureLoaded('characters', res, next), (req, res) => {
  const { page = 1, limit = 20, search, race, affiliation, gender } = req.query;
  res.json(paginate(cache.characters, { page: +page, limit: +limit, search, race, affiliation, gender }));
});

app.get('/api/characters/:id', (req, res, next) => ensureLoaded('characters', res, next), (req, res) => {
  const item = cache.characters.find(c => c.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.get('/api/planets', (req, res, next) => ensureLoaded('planets', res, next), (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  res.json(paginate(cache.planets, { page: +page, limit: +limit, search }));
});

app.get('/api/planets/:id', (req, res, next) => ensureLoaded('planets', res, next), (req, res) => {
  const item = cache.planets.find(p => p.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.get('/api/races', (req, res, next) => ensureLoaded('characters', res, next), (req, res) => {
  res.json([...new Set(cache.characters.map(c => c.race).filter(Boolean))].sort());
});

app.get('/api/affiliations', (req, res, next) => ensureLoaded('characters', res, next), (req, res) => {
  res.json([...new Set(cache.characters.map(c => c.affiliation).filter(Boolean))].sort());
});

app.get('/api/cache/status', (req, res) => {
  res.json({
    characters: { loaded: !!cache.loaded.characters, count: cache.characters.length },
    planets:    { loaded: !!cache.loaded.planets,    count: cache.planets.length },
  });
});

app.get('/health', (req, res) => res.json({ status: 'OK', message: '🐉 Dragon Ball API running' }));

app.listen(PORT, () => {
  console.log(`🐉 Dragon Ball server en http://localhost:${PORT}`);
  console.log(`   GET /api/universe      → personajes + planetas de una vez`);
  console.log(`   GET /api/characters    → paginado + filtros (race, affiliation, gender, search)`);
  console.log(`   GET /api/characters/:id`);
  console.log(`   GET /api/planets`);
  console.log(`   GET /api/planets/:id`);
  console.log(`   GET /api/races`);
  console.log(`   GET /api/affiliations`);
  console.log(`   GET /api/cache/status`);
  preloadAll();
});
