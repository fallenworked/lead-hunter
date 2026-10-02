import html from './index.html';
import logo from './logo.png';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/search') return handleSearch(request);
    if (url.pathname === '/logo.png') {
      return new Response(logo, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
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

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const UA = 'LeadHunter/1.0 (contact@example.com)';

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

async function geocode(city) {
  // Photon - открытый геокодер Komoot, не блокирует CF Workers
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(city)}&limit=1&lang=ru`;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('geocode ' + r.status);
  const data = await r.json();
  if (!data.features || !data.features.length) throw new Error('город не найден');
  const f = data.features[0];
  const p = f.properties || {};
  const bbox = f.bbox;
  const display = [p.name, p.state, p.country].filter(Boolean).join(', ');
  if (!bbox || bbox.length !== 4) {
    const [lon, lat] = f.geometry.coordinates;
    const d = 0.15;
    return { bbox: [lat - d, lon - d, lat + d, lon + d], display };
  }
  // GeoJSON bbox = [minLon, minLat, maxLon, maxLat] → Overpass ждёт [south, west, north, east]
  return {
    bbox: [bbox[1], bbox[0], bbox[3], bbox[2]],
    display,
  };
}

function buildOverpassQuery(bbox, niche) {
  const [s, w, n, e] = bbox;
  const bboxStr = `${s},${w},${n},${e}`;
  const tags = NICHES[niche.toLowerCase().trim()];
  if (!tags) {
    return `[out:json][timeout:25];
(
  node["name"~"${niche}","i"][!website][!contact:website](${bboxStr});
  way["name"~"${niche}","i"][!website][!contact:website](${bboxStr});
);
out center 80;`;
  }
  let parts = '';
  for (const [k, v] of tags) {
    parts += `node["${k}"="${v}"][!website][!contact:website](${bboxStr});`;
    parts += `way["${k}"="${v}"][!website][!contact:website](${bboxStr});`;
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
  const addr = [
    t['addr:street'],
    t['addr:housenumber'],
  ].filter(Boolean).join(' ');
  const phone = t.phone || t['contact:phone'] || '';
  const email = t.email || t['contact:email'] || '';
  const site = t.website || t['contact:website'] || '';
  return {
    id: elem.id,
    name,
    phone,
    email,
    addr,
    lat,
    lon,
    site,
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
    const { bbox, display } = await withTimeout(geocode(city), 10000);
    debug.geocode_ms = Date.now() - t0;
    debug.bbox = bbox;
    debug.area_display = display;

    const q = buildOverpassQuery(bbox, niche);
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
      city: display,
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
