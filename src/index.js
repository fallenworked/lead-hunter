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
  'гостиница':         [['tourism','hotel']],
  'пиццерия':          [['amenity','fast_food']],
  'кофейня':           [['amenity','cafe']],
  'ветклиника':        [['amenity','veterinary']],
  'детский сад':       [['amenity','kindergarten']],
  'ремонт техники':    [['shop','electronics'],['shop','mobile_phone']],
  'автосалон':         [['shop','car']],
  'автошкола':         [['amenity','driving_school']],
  'бассейн':           [['leisure','sports_centre']],
  'массаж':            [['shop','massage']],
  'тату-салон':        [['shop','tattoo']],
  'хостел':            [['tourism','hostel']],
  'кинотеатр':         [['amenity','cinema']],
  'ночной клуб':       [['amenity','nightclub']],
  'баня':              [['amenity','sauna']],
  'детский магазин':   [['shop','baby_goods'],['shop','toys']],
  'строительный магазин': [['shop','doityourself'],['shop','hardware']],
};

const CITIES = {
  'москва':             { lat: 55.7558, lon: 37.6173, r: 8000, c: 'RU', n: 'Москва' },
  'санкт-петербург':    { lat: 59.9343, lon: 30.3351, r: 8000, c: 'RU', n: 'Санкт-Петербург' },
  'спб':                { lat: 59.9343, lon: 30.3351, r: 8000, c: 'RU', n: 'Санкт-Петербург' },
  'питер':              { lat: 59.9343, lon: 30.3351, r: 8000, c: 'RU', n: 'Санкт-Петербург' },
  'новосибирск':        { lat: 55.0084, lon: 82.9357, r: 8000, c: 'RU', n: 'Новосибирск' },
  'екатеринбург':       { lat: 56.8389, lon: 60.6057, r: 8000, c: 'RU', n: 'Екатеринбург' },
  'казань':             { lat: 55.8304, lon: 49.0661, r: 8000, c: 'RU', n: 'Казань' },
  'нижний новгород':    { lat: 56.3269, lon: 44.0059, r: 8000, c: 'RU', n: 'Нижний Новгород' },
  'челябинск':          { lat: 55.1644, lon: 61.4368, r: 8000, c: 'RU', n: 'Челябинск' },
  'самара':             { lat: 53.2001, lon: 50.1500, r: 8000, c: 'RU', n: 'Самара' },
  'омск':               { lat: 54.9885, lon: 73.3242, r: 8000, c: 'RU', n: 'Омск' },
  'ростов-на-дону':     { lat: 47.2225, lon: 39.7187, r: 8000, c: 'RU', n: 'Ростов-на-Дону' },
  'ростов':             { lat: 47.2225, lon: 39.7187, r: 8000, c: 'RU', n: 'Ростов-на-Дону' },
  'уфа':                { lat: 54.7388, lon: 55.9721, r: 8000, c: 'RU', n: 'Уфа' },
  'красноярск':         { lat: 56.0153, lon: 92.8932, r: 8000, c: 'RU', n: 'Красноярск' },
  'воронеж':            { lat: 51.6608, lon: 39.2003, r: 8000, c: 'RU', n: 'Воронеж' },
  'пермь':              { lat: 58.0105, lon: 56.2502, r: 8000, c: 'RU', n: 'Пермь' },
  'волгоград':          { lat: 48.7080, lon: 44.5133, r: 8000, c: 'RU', n: 'Волгоград' },
  'краснодар':          { lat: 45.0355, lon: 38.9753, r: 8000, c: 'RU', n: 'Краснодар' },
  'саратов':            { lat: 51.5336, lon: 46.0343, r: 8000, c: 'RU', n: 'Саратов' },
  'тюмень':             { lat: 57.1522, lon: 65.5272, r: 8000, c: 'RU', n: 'Тюмень' },
  'тольятти':           { lat: 53.5303, lon: 49.3461, r: 8000, c: 'RU', n: 'Тольятти' },
  'ижевск':             { lat: 56.8527, lon: 53.2115, r: 8000, c: 'RU', n: 'Ижевск' },
  'барнаул':            { lat: 53.3548, lon: 83.7698, r: 8000, c: 'RU', n: 'Барнаул' },
  'ульяновск':          { lat: 54.3142, lon: 48.4031, r: 8000, c: 'RU', n: 'Ульяновск' },
  'иркутск':            { lat: 52.2870, lon: 104.3050, r: 8000, c: 'RU', n: 'Иркутск' },
  'хабаровск':          { lat: 48.4827, lon: 135.0838, r: 8000, c: 'RU', n: 'Хабаровск' },
  'ярославль':          { lat: 57.6261, lon: 39.8845, r: 8000, c: 'RU', n: 'Ярославль' },
  'владивосток':        { lat: 43.1155, lon: 131.8855, r: 8000, c: 'RU', n: 'Владивосток' },
  'махачкала':          { lat: 42.9764, lon: 47.5022, r: 8000, c: 'RU', n: 'Махачкала' },
  'томск':              { lat: 56.4846, lon: 84.9476, r: 8000, c: 'RU', n: 'Томск' },
  'оренбург':           { lat: 51.7682, lon: 55.0969, r: 8000, c: 'RU', n: 'Оренбург' },
  'кемерово':           { lat: 55.3547, lon: 86.0873, r: 8000, c: 'RU', n: 'Кемерово' },
  'новокузнецк':        { lat: 53.7557, lon: 87.1099, r: 8000, c: 'RU', n: 'Новокузнецк' },
  'рязань':             { lat: 54.6269, lon: 39.6916, r: 8000, c: 'RU', n: 'Рязань' },
  'астрахань':          { lat: 46.3497, lon: 48.0408, r: 8000, c: 'RU', n: 'Астрахань' },
  'набережные челны':   { lat: 55.7436, lon: 52.3958, r: 8000, c: 'RU', n: 'Набережные Челны' },
  'пенза':              { lat: 53.2007, lon: 45.0046, r: 8000, c: 'RU', n: 'Пенза' },
  'липецк':             { lat: 52.6089, lon: 39.5991, r: 8000, c: 'RU', n: 'Липецк' },
  'киров':              { lat: 58.6036, lon: 49.6680, r: 8000, c: 'RU', n: 'Киров' },
  'чебоксары':          { lat: 56.1462, lon: 47.2513, r: 8000, c: 'RU', n: 'Чебоксары' },
  'тула':               { lat: 54.1961, lon: 37.6182, r: 8000, c: 'RU', n: 'Тула' },
  'калининград':        { lat: 54.7104, lon: 20.4522, r: 8000, c: 'RU', n: 'Калининград' },
  'курск':              { lat: 51.7303, lon: 36.1926, r: 8000, c: 'RU', n: 'Курск' },
  'севастополь':        { lat: 44.6166, lon: 33.5254, r: 8000, c: 'RU', n: 'Севастополь' },
  'сочи':               { lat: 43.5855, lon: 39.7231, r: 8000, c: 'RU', n: 'Сочи' },
  'ставрополь':         { lat: 45.0428, lon: 41.9734, r: 8000, c: 'RU', n: 'Ставрополь' },
  'владимир':           { lat: 56.1290, lon: 40.4070, r: 8000, c: 'RU', n: 'Владимир' },
  'архангельск':        { lat: 64.5393, lon: 40.5183, r: 8000, c: 'RU', n: 'Архангельск' },
  'мурманск':           { lat: 68.9585, lon: 33.0827, r: 8000, c: 'RU', n: 'Мурманск' },
  'тверь':              { lat: 56.8587, lon: 35.9176, r: 8000, c: 'RU', n: 'Тверь' },
  'брянск':             { lat: 53.2434, lon: 34.3639, r: 8000, c: 'RU', n: 'Брянск' },
  'иваново':            { lat: 57.0004, lon: 40.9739, r: 8000, c: 'RU', n: 'Иваново' },
  'белгород':           { lat: 50.5977, lon: 36.5858, r: 8000, c: 'RU', n: 'Белгород' },
  'сургут':             { lat: 61.2540, lon: 73.3962, r: 8000, c: 'RU', n: 'Сургут' },
  'чита':               { lat: 52.0340, lon: 113.4994, r: 8000, c: 'RU', n: 'Чита' },
  'якутск':             { lat: 62.0355, lon: 129.6755, r: 8000, c: 'RU', n: 'Якутск' },
  'калуга':             { lat: 54.5138, lon: 36.2612, r: 8000, c: 'RU', n: 'Калуга' },
  'смоленск':           { lat: 54.7818, lon: 32.0401, r: 8000, c: 'RU', n: 'Смоленск' },
  'вологда':            { lat: 59.2205, lon: 39.8915, r: 8000, c: 'RU', n: 'Вологда' },
  'курган':             { lat: 55.4408, lon: 65.3411, r: 8000, c: 'RU', n: 'Курган' },
  'орёл':               { lat: 52.9651, lon: 36.0785, r: 8000, c: 'RU', n: 'Орёл' },
  'орел':               { lat: 52.9651, lon: 36.0785, r: 8000, c: 'RU', n: 'Орёл' },
  'тамбов':             { lat: 52.7212, lon: 41.4523, r: 8000, c: 'RU', n: 'Тамбов' },
  'петрозаводск':       { lat: 61.7849, lon: 34.3469, r: 8000, c: 'RU', n: 'Петрозаводск' },
  'алматы':             { lat: 43.2220, lon: 76.8512, r: 8000, c: 'KZ', n: 'Алматы' },
  'астана':             { lat: 51.1694, lon: 71.4491, r: 8000, c: 'KZ', n: 'Астана' },
  'нур-султан':         { lat: 51.1694, lon: 71.4491, r: 8000, c: 'KZ', n: 'Астана' },
  'шымкент':            { lat: 42.3417, lon: 69.5901, r: 8000, c: 'KZ', n: 'Шымкент' },
  'караганда':          { lat: 49.8047, lon: 73.1094, r: 8000, c: 'KZ', n: 'Караганда' },
  'актобе':             { lat: 50.2839, lon: 57.1670, r: 8000, c: 'KZ', n: 'Актобе' },
  'минск':              { lat: 53.9006, lon: 27.5590, r: 8000, c: 'BY', n: 'Минск' },
  'гомель':             { lat: 52.4412, lon: 30.9878, r: 8000, c: 'BY', n: 'Гомель' },
  'брест':              { lat: 52.0976, lon: 23.7341, r: 8000, c: 'BY', n: 'Брест' },
  'киев':               { lat: 50.4501, lon: 30.5234, r: 8000, c: 'UA', n: 'Киев' },
  'харьков':            { lat: 49.9935, lon: 36.2304, r: 8000, c: 'UA', n: 'Харьков' },
  'одесса':             { lat: 46.4825, lon: 30.7233, r: 8000, c: 'UA', n: 'Одесса' },
  'днепр':              { lat: 48.4647, lon: 35.0462, r: 8000, c: 'UA', n: 'Днепр' },
  'львов':              { lat: 49.8397, lon: 24.0297, r: 8000, c: 'UA', n: 'Львов' },
  'ташкент':            { lat: 41.2995, lon: 69.2401, r: 8000, c: 'UZ', n: 'Ташкент' },
  'самарканд':          { lat: 39.6542, lon: 66.9597, r: 8000, c: 'UZ', n: 'Самарканд' },
  'бишкек':             { lat: 42.8746, lon: 74.5698, r: 8000, c: 'KG', n: 'Бишкек' },
  'тбилиси':            { lat: 41.7151, lon: 44.8271, r: 8000, c: 'GE', n: 'Тбилиси' },
  'батуми':             { lat: 41.6168, lon: 41.6367, r: 8000, c: 'GE', n: 'Батуми' },
  'ереван':             { lat: 40.1872, lon: 44.5152, r: 8000, c: 'AM', n: 'Ереван' },
  'баку':               { lat: 40.4093, lon: 49.8671, r: 8000, c: 'AZ', n: 'Баку' },
  'стамбул':            { lat: 41.0082, lon: 28.9784, r: 10000, c: 'TR', n: 'Стамбул' },
  'анталия':            { lat: 36.8969, lon: 30.7133, r: 8000, c: 'TR', n: 'Анталия' },
  'дубай':              { lat: 25.2048, lon: 55.2708, r: 10000, c: 'AE', n: 'Дубай' },
};

const COUNTRIES = {
  RU: 'Россия', KZ: 'Казахстан', BY: 'Беларусь', UA: 'Украина',
  UZ: 'Узбекистан', KG: 'Киргизия', GE: 'Грузия', AM: 'Армения',
  AZ: 'Азербайджан', TR: 'Турция', AE: 'ОАЭ',
};

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
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
    const info = CITIES[key];
    return { ...info, display: info.n };
  }
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(city)}&limit=1&lang=ru`;
  const r = await withTimeout(fetch(url, { headers: { 'User-Agent': UA } }), 6000);
  if (!r.ok) throw new Error('город не найден');
  const data = await r.json();
  if (!data.features || !data.features.length) throw new Error('город не найден');
  const f = data.features[0];
  const [lon, lat] = f.geometry.coordinates;
  const p = f.properties || {};
  return {
    lat, lon, r: 8000,
    c: (p.countrycode || '').toUpperCase() || 'XX',
    n: [p.name, p.state].filter(Boolean).join(', '),
    display: [p.name, p.state, p.country].filter(Boolean).join(', '),
  };
}

function buildOverpassQuery(city, niche) {
  const around = `around:${Math.min(city.r, 8000)},${city.lat},${city.lon}`;
  const tags = NICHES[niche.toLowerCase().trim()];
  const limit = 40;

  if (!tags) {
    return `[out:json][timeout:15];
node["name"~"${niche}","i"]["website"!~".*"](${around});
out center ${limit};`;
  }

  let parts = '';
  for (const [k, v] of tags) {
    parts += `node["${k}"="${v}"]["website"!~".*"](${around});`;
  }
  return `[out:json][timeout:15];
(${parts});
out center ${limit};`;
}

async function overpass(query) {
  const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const body = 'data=' + encodeURIComponent(query);
  const headers = {
    'User-Agent': ua,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const attempt = async (endpoint) => {
    const r = await withTimeout(fetch(endpoint, { method: 'POST', headers, body }), 16000);
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    return d.elements || [];
  };

  // Раунд 1: параллельно все зеркала
  let results = await Promise.allSettled(OVERPASS.map(attempt));
  for (const r of results) {
    if (r.status === 'fulfilled') return r.value;
  }

  // Раунд 2: короткая пауза, retry
  await new Promise(res => setTimeout(res, 1800));
  results = await Promise.allSettled(OVERPASS.map(attempt));
  const errors = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') return results[i].value;
    const host = OVERPASS[i].replace('https://','').split('/')[0];
    errors.push(host + ': ' + (results[i].reason?.message || 'err'));
  }
  throw new Error(errors.join(' | '));
}

function extract(elem) {
  const t = elem.tags || {};
  const name = t.name || t['name:ru'] || '';
  if (!name) return null;
  const lat = elem.lat ?? elem.center?.lat;
  const lon = elem.lon ?? elem.center?.lon;
  const addr = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
  return {
    id: elem.id,
    name,
    phone: t.phone || t['contact:phone'] || '',
    email: t.email || t['contact:email'] || '',
    addr,
    lat, lon,
    opening: t.opening_hours || '',
    type: t.amenity || t.shop || t.office || t.healthcare || t.leisure || t.tourism || '',
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
    return new Response(JSON.stringify({ error: 'нужны city и niche', leads: [] }),
      { status: 400, headers: CORS });
  }
  const debug = {};
  const t0 = Date.now();
  try {
    const cityInfo = await geocode(city);
    debug.geocode_ms = Date.now() - t0;

    const q = buildOverpassQuery(cityInfo, niche);

    const t1 = Date.now();
    let elements = [];
    try {
      elements = await overpass(q);
    } catch (err) {
      debug.overpass_error = err.message;
      throw err;
    }
    debug.overpass_ms = Date.now() - t1;
    debug.raw = elements.length;

    const leads = elements.map(extract).filter(Boolean);
    const seen = new Set();
    const unique = leads.filter(l => {
      const k = l.name.toLowerCase() + '|' + (l.lat?.toFixed(3) || '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const withPhone = unique.filter(l => l.phone).length;
    const withAddr = unique.filter(l => l.addr).length;

    return new Response(JSON.stringify({
      count: unique.length,
      withPhone, withAddr,
      city: cityInfo.n,
      country: COUNTRIES[cityInfo.c] || cityInfo.c,
      countryCode: cityInfo.c,
      niche,
      updated: new Date().toISOString(),
      leads: unique,
      debug,
    }), { headers: { ...CORS, 'Cache-Control': 'public, max-age=1800' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, leads: [], debug }), {
      status: 500, headers: CORS,
    });
  }
}
