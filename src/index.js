import html from './index.html';
import logo from './logo.png';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/search') return handleSearch(request);
    if (url.pathname === '/logo.png') {
      return new Response(logo, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
      });
    }
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};

const NICHES = {
  'стоматология':      [['amenity','dentist'],['healthcare','dentist']],
  'кафе':              [['amenity','cafe']],
  'ресторан':          [['amenity','restaurant']],
  'бар':               [['amenity','bar']],
  'парикмахерская':    [['shop','hairdresser']],
  'салон красоты':     [['shop','beauty']],
  'автосервис':        [['shop','car_repair']],
  'аптека':            [['amenity','pharmacy']],
  'фитнес':            [['leisure','fitness_centre']],
  'юрист':             [['office','lawyer']],
  'автомойка':         [['amenity','car_wash']],
  'магазин одежды':    [['shop','clothes']],
  'пекарня':           [['shop','bakery']],
  'цветы':             [['shop','florist']],
  'книжный':           [['shop','books']],
  'мебель':            [['shop','furniture']],
  'зоомагазин':        [['shop','pet']],
  'ювелирный':         [['shop','jewelry']],
  'оптика':            [['shop','optician']],
  'агентство недвижимости': [['office','estate_agent']],
};

// Словарь городов: lat, lon, radius (метры). Без внешних геокодеров.
const CITIES = {
  'москва':             { lat: 55.7558, lon: 37.6173, r: 28000 },
  'санкт-петербург':    { lat: 59.9343, lon: 30.3351, r: 22000 },
  'спб':                { lat: 59.9343, lon: 30.3351, r: 22000 },
  'питер':              { lat: 59.9343, lon: 30.3351, r: 22000 },
  'новосибирск':        { lat: 55.0084, lon: 82.9357, r: 16000 },
  'екатеринбург':       { lat: 56.8389, lon: 60.6057, r: 15000 },
  'казань':             { lat: 55.8304, lon: 49.0661, r: 14000 },
  'нижний новгород':    { lat: 56.3269, lon: 44.0059, r: 14000 },
  'челябинск':          { lat: 55.1644, lon: 61.4368, r: 13000 },
  'самара':             { lat: 53.2001, lon: 50.1500, r: 13000 },
  'омск':               { lat: 54.9885, lon: 73.3242, r: 13000 },
  'ростов-на-дону':     { lat: 47.2225, lon: 39.7187, r: 14000 },
  'ростов':             { lat: 47.2225, lon: 39.7187, r: 14000 },
  'уфа':                { lat: 54.7388, lon: 55.9721, r: 13000 },
  'красноярск':         { lat: 56.0153, lon: 92.8932, r: 13000 },
  'воронеж':            { lat: 51.6608, lon: 39.2003, r: 13000 },
  'пермь':              { lat: 58.0105, lon: 56.2502, r: 13000 },
  'волгоград':          { lat: 48.7080, lon: 44.5133, r: 15000 },
  'краснодар':          { lat: 45.0355, lon: 38.9753, r: 15000 },
  'саратов':            { lat: 51.5336, lon: 46.0343, r: 13000 },
  'тюмень':             { lat: 57.1522, lon: 65.5272, r: 13000 },
  'тольятти':           { lat: 53.5303, lon: 49.3461, r: 12000 },
  'ижевск':             { lat: 56.8527, lon: 53.2115, r: 12000 },
  'барнаул':            { lat: 53.3548, lon: 83.7698, r: 12000 },
  'ульяновск':          { lat: 54.3142, lon: 48.4031, r: 12000 },
  'иркутск':            { lat: 52.2870, lon: 104.3050, r: 13000 },
  'хабаровск':          { lat: 48.4827, lon: 135.0838, r: 13000 },
  'ярославль':          { lat: 57.6261, lon: 39.8845, r: 12000 },
  'владивосток':        { lat: 43.1155, lon: 131.8855, r: 13000 },
  'махачкала':          { lat: 42.9764, lon: 47.5022, r: 11000 },
  'томск':              { lat: 56.4846, lon: 84.9476, r: 11000 },
  'оренбург':           { lat: 51.7682, lon: 55.0969, r: 11000 },
  'кемерово':           { lat: 55.3547, lon: 86.0873, r: 11000 },
  'новокузнецк':        { lat: 53.7557, lon: 87.1099, r: 11000 },
  'рязань':             { lat: 54.6269, lon: 39.6916, r: 11000 },
  'астрахань':          { lat: 46.3497, lon: 48.0408, r: 11000 },
  'набережные челны':   { lat: 55.7436, lon: 52.3958, r: 11000 },
  'пенза':              { lat: 53.2007, lon: 45.0046, r: 11000 },
  'липецк':             { lat: 52.6089, lon: 39.5991, r: 11000 },
  'киров':              { lat: 58.6036, lon: 49.6680, r: 11000 },
  'чебоксары':          { lat: 56.1462, lon: 47.2513, r: 11000 },
  'тула':               { lat: 54.1961, lon: 37.6182, r: 11000 },
  'калининград':        { lat: 54.7104, lon: 20.4522, r: 11000 },
  'курск':              { lat: 51.7303, lon: 36.1926, r: 11000 },
  'севастополь':        { lat: 44.6166, lon: 33.5254, r: 11000 },
  'сочи':               { lat: 43.5855, lon: 39.7231, r: 16000 },
  'ставрополь':         { lat: 45.0428, lon: 41.9734, r: 12000 },
  'тюмень2':            { lat: 57.1522, lon: 65.5272, r: 13000 },
  'минск':              { lat: 53.9006, lon: 27.5590, r: 14000 },
  'алматы':             { lat: 43.2220, lon: 76.8512, r: 15000 },
  'астана':             { lat: 51.1694, lon: 71.4491, r: 13000 },
  'нур-султан':         { lat: 51.1694, lon: 71.4491, r: 13000 },
  'ташкент':            { lat: 41.2995, lon: 69.2401, r: 14000 },
  'бишкек':             { lat: 42.8746, lon: 74.5698, r: 12000 },
  'тбилиси':            { lat: 41.7151, lon: 44.8271, r: 12000 },
  'ереван':             { lat: 40.1872, lon: 44.5152, r: 12000 },
  'баку':               { lat: 40.4093, lon: 49.8671, r: 14000 },
};

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const UA = 'LeadHunter/1.0';

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

function normalizeCity(s) {
  return s.toLowerCase().trim().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

async function geocode(city) {
  const key = normalizeCity(city);
  if (CITIES[key]) {
    return { ...CITIES[key], display: city, source: 'dict' };
  }
  // Fallback: Photon
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(city)}&limit=1&lang=ru`;
    const r = await withTimeout(fetch(url, { headers: { 'User-Agent': UA } }), 6000);
    if (r.ok) {
      const data = await r.json();
      if (data.features && data.features.length) {
        const f = data.features[0];
        const [lon, lat] = f.geometry.coordinates;
        const p = f.properties || {};
        return {
          lat, lon,
          r: 15000,
          display: [p.name, p.state, p.country].filter(Boolean).join(', '),
          source: 'photon',
        };
      }
    }
  } catch {}
  throw new Error(`город «${city}» не найден. Попробуй: Москва, СПб, Казань, Екатеринбург…`);
}

function buildOverpassQuery(city, niche) {
  const around = `around:${city.r},${city.lat},${city.lon}`;
  const tags = NICHES[niche.toLowerCase().trim()];
  if (!tags) {
    return `[out:json][timeout:25];
(
  node["name"~"${niche}","i"][!website][!contact:website](${around});
  way["name"~"${niche}","i"][!website][!contact:website](${around});
);
out center 80;`;
  }
  let parts = '';
  for (const [k, v] of tags) {
    parts += `node["${k}"="${v}"][!website][!contact:website](${around});`;
    parts += `way["${k}"="${v}"][!website][!contact:website](${around});`;
  }
  return `[out:json][timeout:25];
(${parts});
out center 80;`;
}

async function overpass(query) {
  let lastErr;
  for (const endpoint of OVERPASS) {
    try {
      const r = await withTimeout(
        fetch(endpoint, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query),
        }),
        28000
      );
      if (!r.ok) throw new Error(endpoint + ' ' + r.status);
      const data = await r.json();
      return data.elements || [];
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('overpass failed');
}

function extract(elem) {
  const t = elem.tags || {};
  const name = t.name || t['name:ru'] || '';
  if (!name) return null;
  const lat = elem.lat ?? elem.center?.lat;
  const lon = elem.lon ?? elem.center?.lon;
  const addr = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
  const phone = t.phone || t['contact:phone'] || '';
  const email = t.email || t['contact:email'] || '';
  const site = t.website || t['contact:website'] || '';
  return {
    id: elem.id,
    name, phone, email, addr, lat, lon, site,
    type: t.amenity || t.shop || t.office || t.healthcare || t.leisure || '',
  };
}

async function handleSearch(request) {
  const url = new URL(request.url);
  const city = (url.searchParams.get('city') || '').trim();
  const niche = (url.searchParams.get('niche') || '').trim();
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (!city || !niche) {
    return new Response(JSON.stringify({ error: 'нужны параметры city и niche', leads: [] }),
      { status: 400, headers: CORS });
  }
  const debug = {};
  const t0 = Date.now();
  try {
    const cityInfo = await geocode(city);
    debug.geocode_ms = Date.now() - t0;
    debug.geocode_source = cityInfo.source;
    debug.city = { lat: cityInfo.lat, lon: cityInfo.lon, r: cityInfo.r };

    const q = buildOverpassQuery(cityInfo, niche);
    debug.query_len = q.length;

    const t1 = Date.now();
    const elements = await overpass(q);
    debug.overpass_ms = Date.now() - t1;
    debug.raw_count = elements.length;

    const leads = elements.map(extract).filter(Boolean);
    const seen = new Set();
    const unique = leads.filter(l => {
      const k = l.name.toLowerCase() + '|' + (l.lat?.toFixed(3) || '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    return new Response(JSON.stringify({
      count: unique.length,
      city: cityInfo.display,
      niche,
      updated: new Date().toISOString(),
      leads: unique,
      debug,
    }), { headers: { ...CORS, 'Cache-Control': 'public, max-age=3600' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, leads: [], debug }), {
      status: 500, headers: CORS,
    });
  }
}
