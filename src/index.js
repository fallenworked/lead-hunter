import html from './index.html';
import logo from './logo.png';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/auth/register') return handleRegister(request, env);
    if (url.pathname === '/api/auth/login') return handleLogin(request, env);
    if (url.pathname === '/api/auth/logout') return handleLogout(request, env);
    if (url.pathname === '/api/auth/me') return handleMe(request, env);
    if (url.pathname === '/api/locate') return handleLocate(request, env);

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
  'стоматология': [['amenity','dentist'],['healthcare','dentist']],
  'кафе': [['amenity','cafe']],
  'ресторан': [['amenity','restaurant']],
  'бар': [['amenity','bar']],
  'парикмахерская': [['shop','hairdresser']],
  'салон красоты': [['shop','beauty']],
  'автосервис': [['shop','car_repair']],
  'аптека': [['amenity','pharmacy']],
  'фитнес': [['leisure','fitness_centre']],
  'юрист': [['office','lawyer']],
  'автомойка': [['amenity','car_wash']],
  'магазин одежды': [['shop','clothes']],
  'пекарня': [['shop','bakery']],
  'цветы': [['shop','florist']],
  'книжный': [['shop','books']],
  'мебель': [['shop','furniture']],
  'зоомагазин': [['shop','pet']],
  'ювелирный': [['shop','jewelry']],
  'оптика': [['shop','optician']],
  'агентство недвижимости': [['office','estate_agent']],
  'гостиница': [['tourism','hotel']],
  'пиццерия': [['amenity','fast_food']],
  'кофейня': [['amenity','cafe']],
  'ветклиника': [['amenity','veterinary']],
  'детский сад': [['amenity','kindergarten']],
  'ремонт техники': [['shop','electronics'],['shop','mobile_phone']],
  'автосалон': [['shop','car']],
  'автошкола': [['amenity','driving_school']],
  'бассейн': [['leisure','sports_centre']],
  'массаж': [['shop','massage']],
  'тату-салон': [['shop','tattoo']],
  'хостел': [['tourism','hostel']],
  'кинотеатр': [['amenity','cinema']],
  'ночной клуб': [['amenity','nightclub']],
  'баня': [['amenity','sauna']],
  'детский магазин': [['shop','baby_goods'],['shop','toys']],
  'строительный магазин': [['shop','doityourself'],['shop','hardware']],
};

const CITIES = {
  'москва': { lat: 55.7558, lon: 37.6173, r: 5000, c: 'RU', n: 'Москва' },
  'санкт-петербург': { lat: 59.9343, lon: 30.3351, r: 5000, c: 'RU', n: 'Санкт-Петербург' },
  'спб': { lat: 59.9343, lon: 30.3351, r: 5000, c: 'RU', n: 'Санкт-Петербург' },
  'питер': { lat: 59.9343, lon: 30.3351, r: 5000, c: 'RU', n: 'Санкт-Петербург' },
  'новосибирск': { lat: 55.0084, lon: 82.9357, r: 5000, c: 'RU', n: 'Новосибирск' },
  'екатеринбург': { lat: 56.8389, lon: 60.6057, r: 5000, c: 'RU', n: 'Екатеринбург' },
  'казань': { lat: 55.8304, lon: 49.0661, r: 5000, c: 'RU', n: 'Казань' },
  'нижний новгород': { lat: 56.3269, lon: 44.0059, r: 5000, c: 'RU', n: 'Нижний Новгород' },
  'челябинск': { lat: 55.1644, lon: 61.4368, r: 5000, c: 'RU', n: 'Челябинск' },
  'самара': { lat: 53.2001, lon: 50.1500, r: 5000, c: 'RU', n: 'Самара' },
  'омск': { lat: 54.9885, lon: 73.3242, r: 5000, c: 'RU', n: 'Омск' },
  'ростов-на-дону': { lat: 47.2225, lon: 39.7187, r: 5000, c: 'RU', n: 'Ростов-на-Дону' },
  'ростов': { lat: 47.2225, lon: 39.7187, r: 5000, c: 'RU', n: 'Ростов-на-Дону' },
  'уфа': { lat: 54.7388, lon: 55.9721, r: 5000, c: 'RU', n: 'Уфа' },
  'красноярск': { lat: 56.0153, lon: 92.8932, r: 5000, c: 'RU', n: 'Красноярск' },
  'воронеж': { lat: 51.6608, lon: 39.2003, r: 5000, c: 'RU', n: 'Воронеж' },
  'пермь': { lat: 58.0105, lon: 56.2502, r: 5000, c: 'RU', n: 'Пермь' },
  'волгоград': { lat: 48.7080, lon: 44.5133, r: 5000, c: 'RU', n: 'Волгоград' },
  'краснодар': { lat: 45.0355, lon: 38.9753, r: 5000, c: 'RU', n: 'Краснодар' },
  'саратов': { lat: 51.5336, lon: 46.0343, r: 5000, c: 'RU', n: 'Саратов' },
  'тюмень': { lat: 57.1522, lon: 65.5272, r: 5000, c: 'RU', n: 'Тюмень' },
  'тольятти': { lat: 53.5303, lon: 49.3461, r: 5000, c: 'RU', n: 'Тольятти' },
  'ижевск': { lat: 56.8527, lon: 53.2115, r: 5000, c: 'RU', n: 'Ижевск' },
  'барнаул': { lat: 53.3548, lon: 83.7698, r: 5000, c: 'RU', n: 'Барнаул' },
  'ульяновск': { lat: 54.3142, lon: 48.4031, r: 5000, c: 'RU', n: 'Ульяновск' },
  'иркутск': { lat: 52.2870, lon: 104.3050, r: 5000, c: 'RU', n: 'Иркутск' },
  'хабаровск': { lat: 48.4827, lon: 135.0838, r: 5000, c: 'RU', n: 'Хабаровск' },
  'ярославль': { lat: 57.6261, lon: 39.8845, r: 5000, c: 'RU', n: 'Ярославль' },
  'владивосток': { lat: 43.1155, lon: 131.8855, r: 5000, c: 'RU', n: 'Владивосток' },
  'махачкала': { lat: 42.9764, lon: 47.5022, r: 5000, c: 'RU', n: 'Махачкала' },
  'томск': { lat: 56.4846, lon: 84.9476, r: 5000, c: 'RU', n: 'Томск' },
  'оренбург': { lat: 51.7682, lon: 55.0969, r: 5000, c: 'RU', n: 'Оренбург' },
  'кемерово': { lat: 55.3547, lon: 86.0873, r: 5000, c: 'RU', n: 'Кемерово' },
  'новокузнецк': { lat: 53.7557, lon: 87.1099, r: 5000, c: 'RU', n: 'Новокузнецк' },
  'рязань': { lat: 54.6269, lon: 39.6916, r: 5000, c: 'RU', n: 'Рязань' },
  'астрахань': { lat: 46.3497, lon: 48.0408, r: 5000, c: 'RU', n: 'Астрахань' },
  'набережные челны': { lat: 55.7436, lon: 52.3958, r: 5000, c: 'RU', n: 'Набережные Челны' },
  'пенза': { lat: 53.2007, lon: 45.0046, r: 5000, c: 'RU', n: 'Пенза' },
  'липецк': { lat: 52.6089, lon: 39.5991, r: 5000, c: 'RU', n: 'Липецк' },
  'киров': { lat: 58.6036, lon: 49.6680, r: 5000, c: 'RU', n: 'Киров' },
  'чебоксары': { lat: 56.1462, lon: 47.2513, r: 5000, c: 'RU', n: 'Чебоксары,' },
  'тула': { lat: 54.1961, lon: lon 37.618:2, r: 500 0, c: 'RU36', n: 'Т.ула' },
  'калининград': { lat: 54.7104, lon: 20.4522, r: 5000, c: 'RU', n: 'Калининград' },
  'курск': { lat: 51.73031926, r: 5000, c: 'RU', n: 'Курск' },
  'севастополь': { lat: 44.6166, lon: 33.5254, r: 5000, c: 'RU', n: 'Севастополь' },
  'сочи': { lat: 43.5855, lon: 39.7231, r: 5000, c: 'RU', n: 'Сочи' },
  'ставрополь': { lat: 45.0428, lon: 41.9734, r: 5000, c: 'RU', n: 'Ставрополь' },
  'владимир': { lat: 56.1290, lon: 40.4070, r: 5000, c: 'RU', n: 'Владимир' },
  'архангельск': { lat: 64.5393, lon: 40.5183, r: 5000, c: 'RU', n: 'Архангельск' },
  'мурманск': { lat: 68.9585, lon: 33.0827, r: 5000, c: 'RU', n: 'Мурманск' },
  'тверь': { lat: 56.8587, lon: 35.9176, r: 5000, c: 'RU', n: 'Тверь' },
  'брянск': { lat: 53.2434, lon: 34.3639, r: 5000, c: 'RU', n: 'Брянск' },
  'иваново': { lat: 57.0004, lon: 40.9739, r: 5000, c: 'RU', n: 'Иваново' },
  'белгород': { lat: 50.5977, lon: 36.5858, r: 5000, c: 'RU', n: 'Белгород' },
  'сургут': { lat: 61.2540, lon: 73.3962, r: 5000, c: 'RU', n: 'Сургут' },
  'чита': { lat: 52.0340, lon: 113.4994, r: 5000, c: 'RU', n: 'Чита' },
  'якутск': { lat: 62.0355, lon: 129.6755, r: 5000, c: 'RU', n: 'Якутск' },
  'калуга': { lat: 54.5138, lon: 36.2612, r: 5000, c: 'RU', n: 'Калуга' },
  'смоленск': { lat: 54.7818, lon: 32.0401, r: 5000, c: 'RU', n: 'Смоленск' },
  'вологда': { lat: 59.2205, lon: 39.8915, r: 5000, c: 'RU', n: 'Вологда' },
  'курган': { lat: 55.4408, lon: 65.3411, r: 5000, c: 'RU', n: 'Курган' },
  'орёл': { lat: 52.9651, lon: 36.0785, r: 5000, c: 'RU', n: 'Орёл' },
  'орел': { lat: 52.9651, lon: 36.0785, r: 5000, c: 'RU', n: 'Орёл' },
  'тамбов': { lat: 52.7212, lon: 41.4523, r: 5000, c: 'RU', n: 'Тамбов' },
  'петрозаводск': { lat: 61.7849, lon: 34.3469, r: 5000, c: 'RU', n: 'Петрозаводск' },
  'алматы': { lat: 43.2220, lon: 76.8512, r: 5000, c: 'KZ', n: 'Алматы' },
  'астана': { lat: 51.1694, lon: 71.4491, r: 5000, c: 'KZ', n: 'Астана' },
  'нур-султан': { lat: 51.1694, lon: 71.4491, r: 5000, c: 'KZ', n: 'Астана' },
  'шымкент': { lat: 42.3417, lon: 69.5901, r: 5000, c: 'KZ', n: 'Шымкент' },
  'караганда': { lat: 49.8047, lon: 73.1094, r: 5000, c: 'KZ', n: 'Караганда' },
  'актобе': { lat: 50.2839, lon: 57.1670, r: 5000, c: 'KZ', n: 'Актобе' },
  'минск': { lat: 53.9006, lon: 27.5590, r: 5000, c: 'BY', n: 'Минск' },
  'гомель': { lat: 52.4412, lon: 30.9878, r: 5000, c: 'BY', n: 'Гомель' },
  'брест': { lat: 52.0976, lon: 23.7341, r: 5000, c: 'BY', n: 'Брест' },
  'киев': { lat: 50.4501, lon: 30.5234, r: 5000, c: 'UA', n: 'Киев' },
  'харьков': { lat: 49.9935, lon: 36.2304, r: 5000, c: 'UA', n: 'Харьков' },
  'одесса': { lat: 46.4825, lon: 30.7233, r: 5000, c: 'UA', n: 'Одесса' },
  'днепр': { lat: 48.4647, lon: 35.0462, r: 5000, c: 'UA', n: 'Днепр' },
  'львов': { lat: 49.8397, lon: 24.0297, r: 5000, c: 'UA', n: 'Львов' },
  'ташкент': { lat: 41.2995, lon: 69.2401, r: 5000, c: 'UZ', n: 'Ташкент' },
  'самарканд': { lat: 39.6542, lon: 66.9597, r: 5000, c: 'UZ', n: 'Самарканд' },
  'бишкек': { lat: 42.8746, lon: 74.5698, r: 5000, c: 'KG', n: 'Бишкек' },
  'тбилиси': { lat: 41.7151, lon: 44.8271, r: 5000, c: 'GE', n: 'Тбилиси' },
  'батуми': { lat: 41.6168, lon: 41.6367, r: 5000, c: 'GE', n: 'Батуми' },
  'ереван': { lat: 40.1872, lon: 44.5152, r: 5000, c: 'AM', n: 'Ереван' },
  'баку': { lat: 40.4093, lon: 49.8671, r: 5000, c: 'AZ', n: 'Баку' },
  'стамбул': { lat: 41.0082, lon: 28.9784, r: 7000, c: 'TR', n: 'Стамбул' },
  'анталия': { lat: 36.8969, lon: 30.7133, r: 5000, c: 'TR', n: 'Анталия' },
  'дубай': { lat: 25.2048, lon: 55.2708, r: 7000, c: 'AE', n: 'Дубай' },
};

const COUNTRIES = {
  RU: 'Россия', KZ: 'Казахстан', BY: 'Беларусь', UA: 'Украина',
  UZ: 'Узбекистан', KG: 'Киргизия', GE: 'Грузия', AM: 'Армения',
  AZ: 'Азербайджан', TR: 'Турция', AE: 'ОАЭ',
};

const FREE_LIMIT = 3;
const SESSION_DAYS = 30;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 10000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(n) {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return [...buf].map(b => b.toString(16).padStart(2, '0')).join('');
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function sessionCookie(token, maxAgeSec) {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}`;
}

async function getSession(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const token = cookies.session;
  if (!token) return null;
  const now = Date.now();
  const row = await env.DB.prepare(
    'SELECT s.token, s.user_id, s.expires_at, u.email, u.plan, u.searches_today, u.last_search_date FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
  ).bind(token, now).first();
  if (!row) return null;
  return { token, user: row };
}

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

async function handleRegister(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'некорректный JSON' }, 400); }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!validEmail(email)) return json({ error: 'некорректный email' }, 400);
  if (password.length < 6) return json({ error: 'пароль минимум 6 символов' }, 400);

  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) return json({ error: 'email уже занят' }, 409);

  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  const now = Date.now();

  const res = await env.DB.prepare(
    'INSERT INTO users (email, password_hash, salt, created_at, plan) VALUES (?, ?, ?, ?, ?)'
  ).bind(email, hash, salt, now, 'free').run();

  const userId = res.meta.last_row_id;
  const token = randomHex(32);
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;

  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, userId, now, expires).run();

  return json({
    ok: true,
    user: { id: userId, email, plan: 'free', searches_today: 0 },
    limit: FREE_LIMIT,
  }, 200, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 24 * 60 * 60) });
}

async function handleLogin(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'некорректный JSON' }, 400); }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  const user = await env.DB.prepare(
    'SELECT id, email, password_hash, salt, plan, searches_today, last_search_date FROM users WHERE email = ?'
  ).bind(email).first();
  if (!user) return json({ error: 'неверный email или пароль' }, 401);

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.password_hash) return json({ error: 'неверный email или пароль' }, 401);

  const now = Date.now();
  const token = randomHex(32);
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;

  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, user.id, now, expires).run();

  return json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      searches_today: user.searches_today || 0,
    },
    limit: FREE_LIMIT,
  }, 200, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 24 * 60 * 60) });
}

async function handleLogout(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const session = await getSession(request, env);
  if (session) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(session.token).run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' });
}

async function handleMe(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const session = await getSession(request, env);
  if (!session) return json({ user: null }, 200);

  const u = session.user;
  const todayStr = today();
  const usedToday = u.last_search_date === todayStr ? (u.searches_today || 0) : 0;

  return json({
    user: {
      id: u.user_id,
      email: u.email,
      plan: u.plan,
      searches_today: usedToday,
    },
    limit: FREE_LIMIT,
  });
}

function normalizeCity(s) {
  return s.toLowerCase().trim().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

async function handleLocate(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(request.url);
  const city = (url.searchParams.get('city') || '').trim();
  const niche = (url.searchParams.get('niche') || '').trim();

  if (!city || !niche) return json({ error: 'нужны city и niche' }, 400);

  const session = await getSession(request, env);
  if (!session) return json({ error: 'нужен вход', code: 'AUTH_REQUIRED' }, 401);

  const u = session.user;
  const todayStr = today();
  const usedToday = u.last_search_date === todayStr ? (u.searches_today || 0) : 0;

  if (u.plan === 'free' && usedToday >= FREE_LIMIT) {
    return json({
      error: 'лимит бесплатных поисков исчерпан',
      code: 'LIMIT_REACHED',
      limit: FREE_LIMIT,
      used: usedToday,
    }, 429);
  }

  const key = normalizeCity(city);
  let cityInfo = CITIES[key];

  if (!cityInfo) {
    try {
      const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(city)}&limit=1&lang=ru`, {
        headers: { 'User-Agent': 'LeadHunter/1.0' },
      });
      if (r.ok) {
        const data = await r.json();
        if (data.features && data.features.length) {
          const f = data.features[0];
          const [lon, lat] = f.geometry.coordinates;
          const p = f.properties || {};
          cityInfo = {
            lat: lat, lon: lon, r: 5000,
            c: (p.countrycode || '').toUpperCase() || 'XX',
            n: [p.name, p.state].filter(Boolean).join(', '),
          };
        }
      }
    } catch (e) {}
  }

  if (!cityInfo) return json({ error: 'город не найден' }, 404);

  const tags = NICHES[niche.toLowerCase().trim()];
  if (!tags) return json({ error: 'ниша не поддерживается' }, 404);

  const r = Math.min(cityInfo.r, 5000);
  const dLat = r / 111000;
  const dLon = r / (111000 * Math.cos(cityInfo.lat * Math.PI / 180));
  const bbox = [
    (cityInfo.lat - dLat).toFixed(5),
    (cityInfo.lon - dLon).toFixed(5),
    (cityInfo.lat + dLat).toFixed(5),
    (cityInfo.lon + dLon).toFixed(5),
  ];

  let parts = '';
  for (const [k, v] of tags) {
    parts += `node["${k}"="${v}"](${bbox.join(',')});`;
    parts += `way["${k}"="${v}"](${bbox.join(',')});`;
  }
  const query = `[out:json][timeout:25];(${parts});out center 150;`;

  // Записываем факт поиска в историю юзера
  const newCount = usedToday + 1;
  await env.DB.prepare(
    'UPDATE users SET searches_today = ?, last_search_date = ? WHERE id = ?'
  ).bind(newCount, todayStr, u.user_id).run();

  return json({
    city: cityInfo.n,
    country: COUNTRIES[cityInfo.c] || cityInfo.c,
    countryCode: cityInfo.c,
    niche: niche,
    bbox: bbox,
    query: query,
    used: newCount,
    limit: FREE_LIMIT,
    plan: u.plan,
    updated: new Date().toISOString(),
  });
}
