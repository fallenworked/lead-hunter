const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const SESSION_DAYS = 30;

function json(data, status, extra) {
  status = status || 200;
  extra = extra || {};
  var h = {};
  for (var k in CORS) h[k] = CORS[k];
  h['Content-Type'] = 'application/json; charset=utf-8';
  for (var k2 in extra) h[k2] = extra[k2];
  return new Response(JSON.stringify(data), { status: status, headers: h });
}

function randomHex(n) {
  var buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  var out = '';
  for (var i = 0; i < buf.length; i++) out += buf[i].toString(16).padStart(2, '0');
  return out;
}

function sessionCookie(token, maxAgeSec) {
  return 'session=' + token + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=' + maxAgeSec;
}

async function verifyTelegramAuth(data, botToken) {
  var authData = {};
  for (var k in data) { if (k !== 'hash') authData[k] = data[k]; }
  var keys = Object.keys(authData).sort();
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    parts.push(keys[i] + '=' + authData[keys[i]]);
  }
  var dataCheckString = parts.join('\n');

  var encoder = new TextEncoder();
  var tokenHash = await crypto.subtle.digest('SHA-256', encoder.encode(botToken));
  var key = await crypto.subtle.importKey('raw', tokenHash, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  var signature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataCheckString));

  var hashHex = '';
  var sigBytes = new Uint8Array(signature);
  for (var j = 0; j < sigBytes.length; j++) hashHex += sigBytes[j].toString(16).padStart(2, '0');

  return hashHex === data.hash;
}

export async function handleTelegramAuth(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  var botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return json({ error: 'Telegram не настроен' }, 500);

  var data;
  try { data = await request.json(); }
  catch (e) { return json({ error: 'некорректный JSON' }, 400); }

  var isValid = await verifyTelegramAuth(data, botToken);
  if (!isValid) return json({ error: 'неверная подпись' }, 401);

  var authDate = parseInt(data.auth_date, 10);
  if (Date.now() / 1000 - authDate > 300) {
    return json({ error: 'данные устарели, попробуй снова' }, 401);
  }

  var telegramId = data.id;
  var username = data.username || '';
  var photoUrl = data.photo_url || '';
  var firstName = data.first_name || '';

  var user = await env.DB.prepare(
    'SELECT id, email, plan FROM users WHERE telegram_id = ?'
  ).bind(telegramId).first();

  var now = Date.now();

  if (!user) {
    var placeholderEmail = 'tg_' + telegramId + '@lead-hunter.local';
    var salt = randomHex(16);
    var fakeHash = randomHex(64);

    var res = await env.DB.prepare(
      'INSERT INTO users (email, password_hash, salt, created_at, plan, telegram_id, telegram_username, telegram_photo_url, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(placeholderEmail, fakeHash, salt, now, 'free', telegramId, username, photoUrl, 'telegram').run();

    user = { id: res.meta.last_row_id, email: placeholderEmail, plan: 'free' };
  } else {
    await env.DB.prepare(
      'UPDATE users SET telegram_username = ?, telegram_photo_url = ? WHERE id = ?'
    ).bind(username, photoUrl, user.id).run();
  }

  var token = randomHex(32);
  var expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;

  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, user.id, now, expires).run();

  return json({
    ok: true,
    user: { id: user.id, email: user.email, plan: user.plan, first_name: firstName }
  }, 200, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 24 * 60 * 60) });
}
