const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const SESSION_DAYS = 30;
const REDIRECT_PATH = '/api/auth/google/callback';

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

function parseCookies(header) {
  var out = {};
  if (!header) return out;
  var parts = header.split(';');
  for (var i = 0; i < parts.length; i++) {
    var idx = parts[i].indexOf('=');
    if (idx < 0) continue;
    out[parts[i].slice(0, idx).trim()] = decodeURIComponent(parts[i].slice(idx + 1).trim());
  }
  return out;
}

export async function handleGoogleStart(request, env) {
  var clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) return json({ error: 'Google не настроен' }, 500);

  var url = new URL(request.url);
  var redirectUri = url.origin + REDIRECT_PATH;

  var state = randomHex(16);
  var scope = 'openid email profile';

  var authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
    'client_id=' + encodeURIComponent(clientId) +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&response_type=code' +
    '&scope=' + encodeURIComponent(scope) +
    '&state=' + state +
    '&access_type=offline' +
    '&prompt=select_account';

  return new Response(null, {
    status: 302,
    headers: {
      'Location': authUrl,
      'Set-Cookie': 'oauth_state=' + state + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600'
    }
  });
}

export async function handleGoogleCallback(request, env) {
  var clientId = env.GOOGLE_CLIENT_ID;
  var clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return json({ error: 'Google не настроен' }, 500);

  var url = new URL(request.url);
  var code = url.searchParams.get('code');
  var state = url.searchParams.get('state');
  var err = url.searchParams.get('error');

  if (err) return new Response('Ошибка авторизации: ' + err, { status: 400 });
  if (!code || !state) return new Response('Отсутствует code или state', { status: 400 });

  var cookies = parseCookies(request.headers.get('Cookie'));
  if (!cookies.oauth_state || cookies.oauth_state !== state) {
    return new Response('Неверный state (CSRF)', { status: 400 });
  }

  var redirectUri = url.origin + REDIRECT_PATH;

  var tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'code=' + encodeURIComponent(code) +
      '&client_id=' + encodeURIComponent(clientId) +
      '&client_secret=' + encodeURIComponent(clientSecret) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&grant_type=authorization_code'
  });

  if (!tokenRes.ok) {
    var t = await tokenRes.text();
    return new Response('Ошибка обмена токена: ' + t.slice(0, 200), { status: 500 });
  }

  var tokens = await tokenRes.json();
  var accessToken = tokens.access_token;
  if (!accessToken) return new Response('Нет access_token', { status: 500 });

  var userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });

  if (!userRes.ok) return new Response('Не удалось получить профиль', { status: 500 });

  var guser = await userRes.json();
  var googleId = guser.id;
  var email = (guser.email || '').toLowerCase();
  var name = guser.name || '';
  var picture = guser.picture || '';

  if (!googleId || !email) return new Response('Google не вернул данные', { status: 500 });

  var now = Date.now();
  var user = null;

  // Шаг 1: ищем по google_id
  var byGoogle = await env.DB.prepare(
    'SELECT id, email, plan, auth_provider FROM users WHERE google_id = ? LIMIT 1'
  ).bind(googleId).first();

  if (byGoogle) {
    user = byGoogle;
    // обновляем email если сменился (и он не занят другим)
    if (byGoogle.email !== email) {
      var emailTaken = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1'
      ).bind(email, byGoogle.id).first();
      if (!emailTaken) {
        await env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind(email, byGoogle.id).run();
        user.email = email;
      }
    }
  } else {
    // Шаг 2: ищем по email — но только если аккаунт не привязан к другому провайдеру
    var byEmail = await env.DB.prepare(
      'SELECT id, email, plan, auth_provider FROM users WHERE email = ? LIMIT 1'
    ).bind(email).first();

    if (byEmail && (byEmail.auth_provider === 'google' || !byEmail.auth_provider)) {
      // Безопасно: аккаунт либо уже Google, либо чистый (не от OAuth).
      // Привязываем google_id.
      await env.DB.prepare(
        'UPDATE users SET google_id = ?, auth_provider = ? WHERE id = ?'
      ).bind(googleId, 'google', byEmail.id).run();
      user = byEmail;
    } else {
      // Аккаунт занят другим провайдером (telegram или др.) — не смешиваем.
      // Создаём новый аккаунт с уникальным email.
      var placeholderEmail = email;
      var emailConflict = byEmail;
      if (emailConflict) {
        // email уже занят — используем плейсхолдер
        placeholderEmail = 'g_' + googleId + '@lead-hunter.local';
      }

      var salt = randomHex(16);
      var fakeHash = randomHex(64);
      var res = await env.DB.prepare(
        'INSERT INTO users (email, password_hash, salt, created_at, plan, google_id, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(placeholderEmail, fakeHash, salt, now, 'free', googleId, 'google').run();

      user = { id: res.meta.last_row_id, email: placeholderEmail, plan: 'free' };
    }
  }

  var token = randomHex(32);
  var expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;

  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, user.id, now, expires).run();

  // Сбрасываем oauth_state cookie после использования
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/?auth=ok',
      'Set-Cookie': sessionCookie(token, SESSION_DAYS * 24 * 60 * 60)
    }
  });
}
  var redirectUri = url.origin + REDIRECT_PATH;

  var tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'code=' + encodeURIComponent(code) +
      '&client_id=' + encodeURIComponent(clientId) +
      '&client_secret=' + encodeURIComponent(clientSecret) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&grant_type=authorization_code'
  });

  if (!tokenRes.ok) {
    var t = await tokenRes.text();
    return new Response('Ошибка обмена токена: ' + t.slice(0, 200), { status: 500 });
  }

  var tokens = await tokenRes.json();
  var accessToken = tokens.access_token;
  if (!accessToken) return new Response('Нет access_token', { status: 500 });

  var userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });

  if (!userRes.ok) return new Response('Не удалось получить профиль', { status: 500 });

  var guser = await userRes.json();
  var googleId = guser.id;
  var email = (guser.email || '').toLowerCase();
  var name = guser.name || '';
  var picture = guser.picture || '';

  if (!googleId || !email) return new Response('Google не вернул данные', { status: 500 });

  var now = Date.now();

  var user = await env.DB.prepare(
    'SELECT id, email, plan FROM users WHERE google_id = ? OR email = ? LIMIT 1'
  ).bind(googleId, email).first();

  if (!user) {
    var salt = randomHex(16);
    var fakeHash = randomHex(64);
    var res = await env.DB.prepare(
      'INSERT INTO users (email, password_hash, salt, created_at, plan, google_id, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(email, fakeHash, salt, now, 'free', googleId, 'google').run();
    user = { id: res.meta.last_row_id, email: email, plan: 'free' };
  } else {
    await env.DB.prepare(
      'UPDATE users SET google_id = ?, auth_provider = ? WHERE id = ?'
    ).bind(googleId, 'google', user.id).run();
  }

  var token = randomHex(32);
  var expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;

  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, user.id, now, expires).run();

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/?auth=ok',
      'Set-Cookie': sessionCookie(token, SESSION_DAYS * 24 * 60 * 60)
    }
  });
}
