import html from './index.html';
import logo from './logo.png';
import styleCss from './style.css';
import scriptJs from './script.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/style.css') {
      return new Response(styleCss, { headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
    }
    if (url.pathname === '/script.js') {
      return new Response(scriptJs, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
    }
    if (url.pathname === '/api/auth/register') return handleRegister(request, env);
    if (url.pathname === '/api/auth/login') return handleLogin(request, env);
    if (url.pathname === '/api/auth/logout') return handleLogout(request, env);
    if (url.pathname === '/api/auth/me') return handleMe(request, env);
    if (url.pathname === '/api/locate') return handleLocate(request, env);
    if (url.pathname === '/logo.png') {
      return new Response(logo, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
    }
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};

const NICHES = {
  'стоматология': [['amenity','dentist'],['healthcare','dentist']],
  'кафе': [['amenity','cafe']],
  'ресторан': [['amenity','restaurant']],
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
  'мебель': [['shop','furniture']],
  'зоомагазин': [['shop','pet']],
  'оптика': [['shop','optician']],
  'гостиница': [['tourism','hotel']],
  'ветклиника': [['amenity','veterinary']],
  'бар': [['amenity','bar']],
  'книжный': [['shop','books']],
  'ювелирный': [['shop','jewelry']],
  'пиццерия': [['amenity','fast_food']],
  'кинотеатр': [['amenity','cinema']],
  'бассейн': [['leisure','sports_centre']],
  'тату-салон': [['shop','tattoo']]
};

const CITIES = {
  'москва': [55.7558, 37.6173, 5000, 'RU', 'Москва'],
  'мск': [55.7558, 37.6173, 5000, 'RU', 'Москва'],
  'санкт-петербург': [59.9343, 30.3351, 5000, 'RU', 'Санкт-Петербург'],
  'спб': [59.9343, 30.3351, 5000, 'RU', 'Санкт-Петербург'],
  'питер': [59.9343, 30.3351, 5000, 'RU', 'Санкт-Петербург'],
  'новосибирск': [55.0084, 82.9357, 5000, 'RU', 'Новосибирск'],
  'нск': [55.0084, 82.9357, 5000, 'RU', 'Новосибирск'],
  'екатеринбург': [56.8389, 60.6057, 5000, 'RU', 'Екатеринбург'],
  'екб': [56.8389, 60.6057, 5000, 'RU', 'Екатеринбург'],
  'казань': [55.8304, 49.0661, 5000, 'RU', 'Казань'],
  'нижний новгород': [56.3269, 44.0059, 5000, 'RU', 'Нижний Новгород'],
  'челябинск': [55.1644, 61.4368, 5000, 'RU', 'Челябинск'],
  'самара': [53.2001, 50.1500, 5000, 'RU', 'Самара'],
  'омск': [54.9885, 73.3242, 5000, 'RU', 'Омск'],
  'ростов-на-дону': [47.2225, 39.7187, 5000, 'RU', 'Ростов-на-Дону'],
  'ростов': [47.2225, 39.7187, 5000, 'RU', 'Ростов-на-Дону'],
  'уфа': [54.7388, 55.9721, 5000, 'RU', 'Уфа'],
  'красноярск': [56.0153, 92.8932, 5000, 'RU', 'Красноярск'],
  'воронеж': [51.6608, 39.2003, 5000, 'RU', 'Воронеж'],
  'пермь': [58.0105, 56.2502, 5000, 'RU', 'Пермь'],
  'волгоград': [48.7080, 44.5133, 5000, 'RU', 'Волгоград'],
  'краснодар': [45.0355, 38.9753, 5000, 'RU', 'Краснодар'],
  'саратов': [51.5336, 46.0343, 5000, 'RU', 'Саратов'],
  'тюмень': [57.1522, 65.5272, 5000, 'RU', 'Тюмень'],
  'тольятти': [53.5303, 49.3461, 5000, 'RU', 'Тольятти'],
  'ижевск': [56.8527, 53.2115, 5000, 'RU', 'Ижевск'],
  'барнаул': [53.3548, 83.7698, 5000, 'RU', 'Барнаул'],
  'ульяновск': [54.3142, 48.4031, 5000, 'RU', 'Ульяновск'],
  'иркутск': [52.2870, 104.3050, 5000, 'RU', 'Иркутск'],
  'хабаровск': [48.4827, 135.0838, 5000, 'RU', 'Хабаровск'],
  'ярославль': [57.6261, 39.8845, 5000, 'RU', 'Ярославль'],
  'владивосток': [43.1155, 131.8855, 5000, 'RU', 'Владивосток'],
  'томск': [56.4846, 84.9476, 5000, 'RU', 'Томск'],
  'оренбург': [51.7682, 55.0969, 5000, 'RU', 'Оренбург'],
  'кемерово': [55.3547, 86.0873, 5000, 'RU', 'Кемерово'],
  'рязань': [54.6269, 39.6916, 5000, 'RU', 'Рязань'],
  'астрахань': [46.3497, 48.0408, 5000, 'RU', 'Астрахань'],
  'пенза': [53.2007, 45.0046, 5000, 'RU', 'Пенза'],
  'липецк': [52.6089, 39.5991, 5000, 'RU', 'Липецк'],
  'киров': [58.6036, 49.6680, 5000, 'RU', 'Киров'],
  'тула': [54.1961, 37.6182, 5000, 'RU', 'Тула'],
  'калининград': [54.7104, 20.4522, 5000, 'RU', 'Калининград'],
  'курск': [51.7303, 36.1926, 5000, 'RU', 'Курск'],
  'сочи': [43.5855, 39.7231, 5000, 'RU', 'Сочи'],
  'ставрополь': [45.0428, 41.9734, 5000, 'RU', 'Ставрополь'],
  'архангельск': [64.5393, 40.5183, 5000, 'RU', 'Архангельск'],
  'мурманск': [68.9585, 33.0827, 5000, 'RU', 'Мурманск'],
  'тверь': [56.8587, 35.9176, 5000, 'RU', 'Тверь'],
  'иваново': [57.0004, 40.9739, 5000, 'RU', 'Иваново'],
  'белгород': [50.5977, 36.5858, 5000, 'RU', 'Белгород'],
  'сургут': [61.2540, 73.3962, 5000, 'RU', 'Сургут'],
  'алматы': [43.2220, 76.8512, 5000, 'KZ', 'Алматы'],
  'астана': [51.1694, 71.4491, 5000, 'KZ', 'Астана'],
  'минск': [53.9006, 27.5590, 5000, 'BY', 'Минск'],
  'киев': [50.4501, 30.5234, 5000, 'UA', 'Киев'],
  'ташкент': [41.2995, 69.2401, 5000, 'UZ', 'Ташкент'],
  'тбилиси': [41.7151, 44.8271, 5000, 'GE', 'Тбилиси'],
  'ереван': [40.1872, 44.5152, 5000, 'AM', 'Ереван'],
  'баку': [40.4093, 49.8671, 5000, 'AZ', 'Баку'],
  'стамбул': [41.0082, 28.9784, 7000, 'TR', 'Стамбул'],
  'дубай': [25.2048, 55.2708, 7000, 'AE', 'Дубай']
};

const COUNTRIES = {
  RU: 'Россия', KZ: 'Казахстан', BY: 'Беларусь', UA: 'Украина',
  UZ: 'Узбекистан', GE: 'Грузия', AM: 'Армения', AZ: 'Азербайджан',
  TR: 'Турция', AE: 'ОАЭ', XX: 'Мир'
};

const FREE_LIMIT = 3;
const FREE_RESULT_LIMIT = 10;
const PRO_RESULT_LIMIT = 999;
const SESSION_DAYS = 30;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(data, status, extra) {
  status = status || 200;
  extra = extra || {};
  var h = {};
  for (var k in CORS) h[k] = CORS[k];
  h['Content-Type'] = 'application/json; charset=utf-8';
  for (var k2 in extra) h[k2] = extra[k2];
  return new Response(JSON.stringify(data), { status: status, headers: h });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function hashPassword(password, salt) {
  var enc = new TextEncoder();
  var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  var bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 10000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  var arr = new Uint8Array(bits);
  var out = '';
  for (var i = 0; i < arr.length; i++) {
    out += arr[i].toString(16).padStart(2, '0');
  }
  return out;
}

function randomHex(n) {
  var buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  var out = '';
  for (var i = 0; i < buf.length; i++) {
    out += buf[i].toString(16).padStart(2, '0');
  }
  return out;
}

function parseCookies(header) {
  var out = {};
  if (!header) return out;
  var parts = header.split(';');
  for (var i = 0; i < parts.length; i++) {
    var pair = parts[i];
    var idx = pair.indexOf('=');
    if (idx < 0) continue;
    var k = pair.slice(0, idx).trim();
    var v = pair.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function sessionCookie(token, maxAgeSec) {
  return 'session=' + token + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=' + maxAgeSec;
}

async function getSession(request, env) {
  var cookies = parseCookies(request.headers.get('Cookie'));
  var token = cookies.session;
  if (!token) return null;
  var now = Date.now();
  var row = await env.DB.prepare(
    'SELECT s.token, s.user_id, s.expires_at, u.email, u.plan, u.searches_today, u.last_search_date FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
  ).bind(token, now).first();
  if (!row) return null;
  return { token: token, user: row };
}

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function resultLimitFor(plan) {
  return plan === 'pro' ? PRO_RESULT_LIMIT : FREE_RESULT_LIMIT;
}

async function handleRegister(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  var body;
  try { body = await request.json(); }
  catch (e) { return json({ error: 'некорректный JSON' }, 400); }

  var email = String(body.email || '').trim().toLowerCase();
  var password = String(body.password || '');

  if (!validEmail(email)) return json({ error: 'некорректный email' }, 400);
  if (password.length < 6) return json({ error: 'пароль минимум 6 символов' }, 400);

  var exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) return json({ error: 'email уже занят' }, 409);

  var salt = randomHex(16);
  var hash = await hashPassword(password, salt);
  var now = Date.now();

  var res = await env.DB.prepare(
    'INSERT INTO users (email, password_hash, salt, created_at, plan) VALUES (?, ?, ?, ?, ?)'
  ).bind(email, hash, salt, now, 'free').run();

  var userId = res.meta.last_row_id;
  var token = randomHex(32);
  var expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;

  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, userId, now, expires).run();

  return json({
    ok: true,
    user: { id: userId, email: email, plan: 'free', searches_today: 0 },
    limit: FREE_LIMIT,
    result_limit: FREE_RESULT_LIMIT
  }, 200, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 24 * 60 * 60) });
}

async function handleLogin(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  var body;
  try { body = await request.json(); }
  catch (e) { return json({ error: 'некорректный JSON' }, 400); }

  var email = String(body.email || '').trim().toLowerCase();
  var password = String(body.password || '');

  var user = await env.DB.prepare(
    'SELECT id, email, password_hash, salt, plan, searches_today, last_search_date FROM users WHERE email = ?'
  ).bind(email).first();
  if (!user) return json({ error: 'неверный email или пароль' }, 401);

  var hash = await hashPassword(password, user.salt);
  if (hash !== user.password_hash) return json({ error: 'неверный email или пароль' }, 401);

  var now = Date.now();
  var token = randomHex(32);
  var expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;

  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, user.id, now, expires).run();

  var todayStr = today();
  var usedToday = user.last_search_date === todayStr ? (user.searches_today || 0) : 0;

  return json({
    ok: true,
    user: { id: user.id, email: user.email, plan: user.plan, searches_today: usedToday },
    limit: FREE_LIMIT,
    result_limit: resultLimitFor(user.plan)
  }, 200, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 24 * 60 * 60) });
}

async function handleLogout(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  var session = await getSession(request, env);
  if (session) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(session.token).run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' });
}

async function handleMe(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  var session = await getSession(request, env);
  if (!session) return json({ user: null, limit: FREE_LIMIT, result_limit: FREE_RESULT_LIMIT });
  var u = session.user;
  var todayStr = today();
  var usedToday = u.last_search_date === todayStr ? (u.searches_today || 0) : 0;
  return json({
    user: { id: u.user_id, email: u.email, plan: u.plan, searches_today: usedToday },
    limit: FREE_LIMIT,
    result_limit: resultLimitFor(u.plan)
  });
}

function normalizeCity(s) {
  return s.toLowerCase().trim().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

async function handleLocate(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  var url = new URL(request.url);
  var city = (url.searchParams.get('city') || '').trim();
  var niche = (url.searchParams.get('niche') || '').trim();

  if (!city || !niche) return json({ error: 'нужны city и niche' }, 400);

  var session = await getSession(request, env);
  if (!session) return json({ error: 'нужен вход', code: 'AUTH_REQUIRED' }, 401);

  var u = session.user;
  var todayStr = today();
  var usedToday = u.last_search_date === todayStr ? (u.searches_today || 0) : 0;

  if (u.plan === 'free' && usedToday >= FREE_LIMIT) {
    return json({
      error: 'лимит бесплатных поисков исчерпан',
      code: 'LIMIT_REACHED',
      limit: FREE_LIMIT,
      used: usedToday
    }, 429);
  }

  var key = normalizeCity(city);
  var cityInfo = null;

  if (CITIES[key]) {
    var c = CITIES[key];
    cityInfo = { lat: c[0], lon: c[1], r: c[2], c: c[3], n: c[4] };
  } else {
    try {
      var pr = await fetch('https://photon.komoot.io/api/?q=' + encodeURIComponent(city) + '&limit=1&lang=ru', {
        headers: { 'User-Agent': 'LeadHunter/1.0' }
      });
      if (pr.ok) {
        var data = await pr.json();
        if (data.features && data.features.length) {
          var f = data.features[0];
          var lon = f.geometry.coordinates[0];
          var lat = f.geometry.coordinates[1];
          var p = f.properties || {};
          var nameParts = [];
          if (p.name) nameParts.push(p.name);
          if (p.state) nameParts.push(p.state);
          cityInfo = {
            lat: lat, lon: lon, r: 5000,
            c: (p.countrycode || 'XX').toUpperCase(),
            n: nameParts.join(', ')
          };
        }
      }
    } catch (e) {}
  }

  if (!cityInfo) return json({ error: 'город не найден' }, 404);

  var tags = NICHES[niche.toLowerCase().trim()];
  if (!tags) return json({ error: 'ниша не поддерживается' }, 404);

  var r = Math.min(cityInfo.r, 5000);
  var dLat = r / 111000;
  var dLon = r / (111000 * Math.cos(cityInfo.lat * Math.PI / 180));
  var bbox = [
    (cityInfo.lat - dLat).toFixed(5),
    (cityInfo.lon - dLon).toFixed(5),
    (cityInfo.lat + dLat).toFixed(5),
    (cityInfo.lon + dLon).toFixed(5)
  ];
  var bboxStr = bbox.join(',');

  var parts = '';
  for (var i = 0; i < tags.length; i++) {
    parts += 'node["' + tags[i][0] + '"="' + tags[i][1] + '"](' + bboxStr + ');';
    parts += 'way["' + tags[i][0] + '"="' + tags[i][1] + '"](' + bboxStr + ');';
  }
  var query = '[out:json][timeout:25];(' + parts + ');out center 150;';

  var newCount = usedToday + 1;
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
    result_limit: resultLimitFor(u.plan),
    plan: u.plan,
    updated: new Date().toISOString()
  });
}
