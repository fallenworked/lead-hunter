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
  return '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Оплата · Lead Hunter</title><meta name="theme-color" content="#101012"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"><style>' + PAY_CSS + '</style></head><body>' + body + '</body></html>';
}

const PAY_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;background:#101012;color:#b4b4b6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background-image:radial-gradient(rgba(255,255,255,.035) 1px,transparent 1px);background-size:24px 24px}
.card{background:#18181a;border:1px solid #454548;border-radius:6px;padding:34px 30px;max-width:460px;width:100%;animation:in .3s cubic-bezier(.16,1,.3,1)}
@keyframes in{from{opacity:0;transform:translateY(8px)}}
h1{font-size:20px;font-weight:600;letter-spacing:-.02em;margin-bottom:8px;color:#f0f0f2}
.sub{color:#8e8e91;font-size:11.5px;margin-bottom:28px;line-height:1.7}
.amount{font-size:38px;font-weight:600;letter-spacing:-.045em;color:#f0f0f2;margin-bottom:4px}
.amount .r{font-size:18px;color:#8e8e91;margin-left:2px}
.period{color:#646467;font-size:11.5px;margin-bottom:26px}
.features{list-style:none;margin-bottom:26px;display:flex;flex-direction:column;gap:8px}
.features li{display:flex;align-items:center;gap:9px;font-size:11.5px;color:#8e8e91}
.features li::before{content:"+";color:#f4f4c8;font-weight:600;flex-shrink:0;width:12px}
.btn{display:block;width:100%;padding:13px;border-radius:4px;background:#f4f4c8;color:#101012;border:1px solid #f4f4c8;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s,border-color .15s;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;text-align:center;box-sizing:border-box}
.btn:hover{background:#ffffff;border-color:#ffffff}
.btn:active{transform:translateY(1px)}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.btn.ghost{display:block;width:100%;background:transparent;color:#8e8e91;border:1px solid #454548;margin-top:8px;text-align:center;text-decoration:none;box-sizing:border-box}
.btn.ghost:hover{color:#f0f0f2;border-color:#9a9a9d;background:transparent}
.status{padding:13px;border-radius:4px;background:#101012;border:1px solid #454548;font-size:11.5px;color:#8e8e91;margin-bottom:22px;text-align:center;line-height:1.6}
.status.ok{color:#7fe08a;border-color:rgba(127,224,138,.35)}
.status.err{color:#ff6b62;border-color:rgba(255,107,98,.35)}
.notice{font-size:10px;color:#646467;text-align:center;margin-top:18px;line-height:1.7}
.notice a{color:#d4d4d6;text-decoration:underline;text-underline-offset:2px}
.badge{display:inline-block;font-size:9px;font-weight:600;letter-spacing:.16em;padding:4px 9px;border-radius:2px;background:#f4f4c8;color:#101012;margin-bottom:14px;text-transform:uppercase}
.loading{width:28px;height:28px;border:2px solid #454548;border-top-color:#f4f4c8;border-radius:50%;animation:sp .7s linear infinite;margin:20px auto}
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

// ═══ СТРАНИЦА СИМУЛЯЦИИ ОПЛАТЫ ═══
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
    '.catch(function(){document.querySelector(".card").innerHTML="<div class=\\"badge\\">ОШИБКА</div><h1>Сеть</h1><p class=\\"sub\\">Не удалось связаться. Попробуй позже.</p><a class=\\"btn\\" href=\\"/\\">На главную</a>";});' +
    '});' +
    '</script>';

  return new Response(htmlPage(body), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// ═══ АКТИВАЦИЯ PRO ═══
async function activateSubscription(env, paymentId, rawPayload) {
  var intent = await env.DB.prepare(
    'SELECT payment_id, user_id, amount, period, status FROM payment_intents WHERE payment_id = ?'
  ).bind(paymentId).first();

  if (!intent) return { ok: false, error: 'intent not found' };
  if (intent.status === 'succeeded') return { ok: true, already: true };

  var price = PRICES[intent.period] || PRICES.month;
  var now = Date.now();
  var expiresAt = now + price.days * 24 * 60 * 60 * 1000;

  await env.DB.prepare(
    'UPDATE payment_intents SET status = ?, paid_at = ? WHERE payment_id = ?'
  ).bind('succeeded', now, paymentId).run();

  await env.DB.prepare(
    'INSERT INTO subscriptions (user_id, payment_id, provider, amount, period, status, started_at, expires_at, created_at, raw_payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(intent.user_id, paymentId, 'test', intent.amount, intent.period, 'active', now, expiresAt, now, rawPayload ? JSON.stringify(rawPayload).slice(0, 2000) : null).run();

  await env.DB.prepare(
    'UPDATE users SET plan = ? WHERE id = ?'
  ).bind('pro', intent.user_id).run();

  return { ok: true, user_id: intent.user_id, expires_at: expiresAt };
}

// ═══ ТЕСТОВАЯ ПОДТВЕРЖДЕНИЕ ═══
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

// ═══ WEBHOOK ═══
export async function handlePaymentWebhook(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });

  var body;
  try { body = await request.text(); }
  catch (e) { return new Response('bad body', { status: 400 }); }

  var data;
  try { data = JSON.parse(body); }
  catch (e) { return new Response('bad json', { status: 400 }); }

  var event = data.event || '';
  var obj = data.object || {};

  if (event === 'payment.succeeded') {
    var paymentId = obj.id || (obj.metadata && obj.metadata.payment_id);
    if (!paymentId) {
      console.error('webhook: no payment id');
      return new Response('ok', { status: 200 });
    }

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
