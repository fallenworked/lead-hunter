// ═══ PAYMENT MODULE (готов к ЮKassa, сейчас работает в режиме симуляции) ═══

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const PRICES = {
  month: { amount: 19900, label: '199 ₽', days: 30, human: '1 месяц' },
  year:  { amount: 119900, label: '1199 ₽', days: 365, human: '12 месяцев' }
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

function htmlPage(body) {
  return '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Оплата · Lead Hunter</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><style>' + PAY_CSS + '</style></head><body>' + body + '</body></html>';
}

const PAY_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:#0a0a0a;color:#f5f5f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#121212;border:1px solid #2e2e2e;border-radius:18px;padding:40px 36px;max-width:480px;width:100%;animation:in .4s cubic-bezier(.16,1,.3,1)}
@keyframes in{from{opacity:0;transform:translateY(20px)}}
h1{font-size:24px;font-weight:900;letter-spacing:-.03em;margin-bottom:8px;color:#fff}
.sub{color:#8a8a8a;font-size:14px;margin-bottom:32px;line-height:1.6}
.amount{font-size:48px;font-weight:900;letter-spacing:-.045em;color:#fff;margin-bottom:6px}
.amount .r{font-size:24px;color:#8a8a8a;margin-left:2px}
.period{color:#8a8a8a;font-size:14px;margin-bottom:32px}
.features{list-style:none;margin-bottom:32px;display:flex;flex-direction:column;gap:10px}
.features li{display:flex;align-items:center;gap:10px;font-size:13.5px;color:#8a8a8a}
.features li::before{content:"✓";color:#4ade80;font-weight:900;flex-shrink:0}
.btn{width:100%;padding:16px;border-radius:11px;background:#fff;color:#0a0a0a;border:0;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;transition:all .2s;letter-spacing:.01em}
.btn:hover{transform:translateY(-1px);box-shadow:0 8px 32px rgba(201,205,214,.35)}
.btn:active{transform:scale(.98)}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.btn.ghost{background:transparent;color:#8a8a8a;border:1px solid #2e2e2e;margin-top:10px}
.btn.ghost:hover{color:#fff;border-color:#808080;box-shadow:none}
.status{padding:16px;border-radius:10px;background:#171717;border:1px solid #2e2e2e;font-size:13.5px;color:#8a8a8a;margin-bottom:24px;text-align:center}
.status.ok{color:#4ade80;border-color:rgba(74,222,128,.3)}
.status.err{color:#f87171;border-color:rgba(248,113,113,.3)}
.notice{font-size:11.5px;color:#5c5c5c;text-align:center;margin-top:20px;line-height:1.6}
.notice a{color:#c4c4c4;text-decoration:underline}
.badge{display:inline-block;font-size:10px;font-weight:900;letter-spacing:.12em;padding:4px 10px;border-radius:6px;background:#fff;color:#0a0a0a;margin-bottom:16px}
.loading{width:36px;height:36px;border:3px solid #2e2e2e;border-top-color:#fff;border-radius:50%;animation:sp .8s linear infinite;margin:20px auto}
@keyframes sp{to{transform:rotate(360deg)}}
`;

function randomHex(n) {
  var buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  var out = '';
  for (var i = 0; i < buf.length; i++) out += buf[i].toString(16).padStart(2, '0');
  return out;
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

async function getSession(request, env) {
  var cookies = parseCookies(request.headers.get('Cookie'));
  var token = cookies.session;
  if (!token) return null;
  var row = await env.DB.prepare(
    'SELECT s.token, s.user_id, u.email, u.plan FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
  ).bind(token, Date.now()).first();
  if (!row) return null;
  return { token: token, user: row };
}

// ═══ СОЗДАНИЕ ПЛАТЕЖА ═══
export async function handleCreatePayment(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  var session = await getSession(request, env);
  if (!session) return json({ error: 'нужен вход', code: 'AUTH_REQUIRED' }, 401);

  var body;
  try { body = await request.json(); }
  catch (e) { return json({ error: 'некорректный JSON' }, 400); }

  var period = String(body.period || 'month');
  if (!PRICES[period]) return json({ error: 'неверный период' }, 400);

  var price = PRICES[period];
  var paymentId = 'pay_' + randomHex(16);
  var now = Date.now();

  // Определяем провайдера. Если реальная ЮKassa настроена — используем её.
  // Иначе — тестовый режим (redirect на /pay-test).
  var yookassaShopId = env.YOOKASSA_SHOP_ID;
  var yookassaSecret = env.YOOKASSA_SECRET_KEY;

  var provider = 'test';
  var confirmationUrl = '/pay-test?id=' + paymentId;

  if (yookassaShopId && yookassaSecret) {
    provider = 'yookassa';
    try {
      var idempotenceKey = randomHex(16);
      var ykRes = await fetch('https://api.yookassa.ru/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotence-Key': idempotenceKey,
          'Authorization': 'Basic ' + btoa(yookassaShopId + ':' + yookassaSecret)
        },
        body: JSON.stringify({
          amount: { value: (price.amount / 100).toFixed(2), currency: 'RUB' },
          capture: true,
          confirmation: {
            type: 'redirect',
            return_url: 'https://lead-hunt.su/?payment=success'
          },
          description: 'Lead Hunter PRO · ' + price.human,
          metadata: {
            user_id: session.user.user_id,
            period: period,
            payment_id: paymentId
          }
        })
      });

      if (!ykRes.ok) {
        var errTxt = await ykRes.text();
        console.error('YooKassa error:', errTxt.slice(0, 200));
        return json({ error: 'платёжный сервис недоступен' }, 500);
      }

      var ykData = await ykRes.json();
      if (ykData.confirmation && ykData.confirmation.confirmation_url) {
        confirmationUrl = ykData.confirmation.confirmation_url;
      }
      // Используем ID от ЮKassa для связи
      if (ykData.id) paymentId = ykData.id;
    } catch (e) {
      console.error('YooKassa fetch failed:', e.message);
      return json({ error: 'платёжный сервис недоступен' }, 500);
    }
  }

  await env.DB.prepare(
    'INSERT INTO payment_intents (payment_id, user_id, amount, period, status, provider, confirmation_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(paymentId, session.user.user_id, price.amount, period, 'pending', provider, confirmationUrl, now).run();

  return json({
    ok: true,
    payment_id: paymentId,
    confirmation_url: confirmationUrl,
    amount: price.amount,
    label: price.label,
    period: period,
    provider: provider
  });
}

// ═══ СТРАНИЦА СИМУЛЯЦИИ ОПЛАТЫ (для теста до подключения ЮKassa) ═══
export async function handlePayTestPage(request, env) {
  var url = new URL(request.url);
  var id = url.searchParams.get('id');
  if (!id) return new Response('Не указан платёж', { status: 400 });

  var intent = await env.DB.prepare(
    'SELECT payment_id, user_id, amount, period, status FROM payment_intents WHERE payment_id = ?'
  ).bind(id).first();

  if (!intent) return new Response('Платёж не найден', { status: 404 });

  if (intent.status === 'succeeded') {
    return new Response(htmlPage(
      '<div class="card"><div class="badge">PRO</div>' +
      '<h1>Оплата уже прошла</h1>' +
      '<p class="sub">Подписка активирована. Можешь вернуться на сайт.</p>' +
      '<a class="btn" href="/">На главную</a></div>'
    ), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  var price = PRICES[intent.period] || PRICES.month;

  var body =
    '<div class="card">' +
    '<div class="badge">ТЕСТОВЫЙ РЕЖИМ</div>' +
    '<h1>Оплата подписки</h1>' +
    '<p class="sub">Это симуляция оплаты. Реальная платёжная система будет подключена позже.</p>' +
    '<div class="amount">' + (intent.amount / 100) + '<span class="r">₽</span></div>' +
    '<div class="period">Lead Hunter PRO · ' + price.human + '</div>' +
    '<ul class="features">' +
    '<li>Безлимитные поиски</li>' +
    '<li>Все результаты</li>' +
    '<li>AI Агент и AI-скрипты под лида</li>' +
    '<li>История, избранное, CSV</li>' +
    '</ul>' +
    '<button class="btn" id="payNow">Симулировать успешную оплату</button>' +
    '<a class="btn ghost" href="/">Отмена</a>' +
    '<p class="notice">Нажимая кнопку, ты подтверждаешь оплату 199 ₽.<br>Возврат — в течение 14 дней, см. <a href="/refund" target="_blank">политику</a>.</p>' +
    '</div>' +
    '<script>' +
    'document.getElementById("payNow").addEventListener("click",function(){' +
    'this.disabled=true;this.textContent="Обработка...";' +
    'fetch("/api/payment/test-confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payment_id:"' + id + '"})})' +
    '.then(function(r){return r.json()})' +
    '.then(function(d){' +
    'if(d.ok){document.querySelector(".card").innerHTML="<div class=\\"badge\\">PRO</div><h1>Оплачено ✓</h1><p class=\\"sub\\">Подписка активирована. Возвращайся на сайт — там уже PRO.</p><a class=\\"btn\\" href=\\"/\\">Перейти на сайт</a>";}' +
    'else{document.querySelector(".card").innerHTML="<div class=\\"badge\\">ОШИБКА</div><h1>Не удалось</h1><p class=\\"sub\\">'+'Ошибка. Попробуй ещё раз или напиши в поддержку.'+'</p><a class=\\"btn\\" href=\\"/\\">На главную</a>";}' +
    '})' +
    '.catch(function(){document.querySelector(".card").innerHTML="<div class=\\"badge\\">ОШИБКА</div><h1>Сеть</h1><p class=\\"sub\\">Не удалось связаться. Попробуй позже.</p>";});' +
    '});' +
    '</script>';

  return new Response(htmlPage(body), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// ═══ АКТИВАЦИЯ PRO (общая функция для симуляции и реального webhook) ═══
async function activateSubscription(env, paymentId, rawPayload) {
  var intent = await env.DB.prepare(
    'SELECT payment_id, user_id, amount, period, status FROM payment_intents WHERE payment_id = ?'
  ).bind(paymentId).first();

  if (!intent) return { ok: false, error: 'intent not found' };
  if (intent.status === 'succeeded') return { ok: true, already: true };

  var price = PRICES[intent.period] || PRICES.month;
  var now = Date.now();
  var expiresAt = now + price.days * 24 * 60 * 60 * 1000;

  // Помечаем intent как succeeded
  await env.DB.prepare(
    'UPDATE payment_intents SET status = ?, paid_at = ? WHERE payment_id = ?'
  ).bind('succeeded', now, paymentId).run();

  // Создаём подписку
  await env.DB.prepare(
    'INSERT INTO subscriptions (user_id, payment_id, provider, amount, period, status, started_at, expires_at, created_at, raw_payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(intent.user_id, paymentId, 'test', intent.amount, intent.period, 'active', now, expiresAt, now, rawPayload ? JSON.stringify(rawPayload).slice(0, 2000) : null).run();

  // Обновляем пользователя
  await env.DB.prepare(
    'UPDATE users SET plan = ? WHERE id = ?'
  ).bind('pro', intent.user_id).run();

  return { ok: true, user_id: intent.user_id, expires_at: expiresAt };
}

// ═══ ТЕСТОВАЯ ПОДТВЕРЖДЕНИЕ (вызывается из /pay-test) ═══
export async function handleTestConfirm(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  var body;
  try { body = await request.json(); }
  catch (e) { return json({ error: 'некорректный JSON' }, 400); }

  var paymentId = String(body.payment_id || '');
  if (!paymentId) return json({ error: 'нет payment_id' }, 400);

  var result = await activateSubscription(env, paymentId, { source: 'test' });
  if (!result.ok) return json({ error: result.error || 'не удалось активировать' }, 400);

  return json({ ok: true, already: !!result.already });
}

// ═══ WEBHOOK ЮKassa (или другого провайдера) ═══
export async function handlePaymentWebhook(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });

  var body;
  try { body = await request.text(); }
  catch (e) { return new Response('bad body', { status: 400 }); }

  var data;
  try { data = JSON.parse(body); }
  catch (e) { return new Response('bad json', { status: 400 }); }

  // ЮKassa webhook: { event: 'payment.succeeded', object: { id, status, paid, metadata: {...} } }
  var event = data.event || '';
  var obj = data.object || {};

  if (event === 'payment.succeeded') {
    var paymentId = obj.id || (obj.metadata && obj.metadata.payment_id);
    if (!paymentId) {
      console.error('webhook: no payment id');
      return new Response('ok', { status: 200 });
    }

    // Проверяем, что payment_id есть в наших intent'ах
    var intent = await env.DB.prepare(
      'SELECT payment_id FROM payment_intents WHERE payment_id = ?'
    ).bind(paymentId).first();

    if (!intent) {
      console.error('webhook: intent not found for', paymentId);
      return new Response('ok', { status: 200 });
    }

    var result = await activateSubscription(env, paymentId, obj);
    console.log('webhook activation:', paymentId, result);
    return new Response('ok', { status: 200 });
  }

  if (event === 'payment.canceled') {
    var pid = obj.id;
    if (pid) {
      await env.DB.prepare(
        'UPDATE payment_intents SET status = ? WHERE payment_id = ?'
      ).bind('canceled', pid).run();
    }
    return new Response('ok', { status: 200 });
  }

  return new Response('ok', { status: 200 });
}
