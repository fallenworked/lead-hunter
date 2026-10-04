const PRO_AI_LIMIT = 100;

const BASE_SYSTEM_PROMPT = 'Ты — AI-ассистент сервиса Lead Hunter. Сервис помогает находить бизнесы без сайта по городу и нише, чтобы продавать им услуги (создание сайтов, реклама, SEO). Твоя задача — помогать пользователю: 1) составлять скрипты холодных звонков и сообщений; 2) придумывать аргументы, почему бизнесу нужен сайт; 3) писать коммерческие предложения; 4) отвечать на возражения. Отвечай кратко, по делу, на русском. Без воды и длинных вступлений. Давай конкретные фразы, которые можно использовать сразу. Используй короткие абзацы, списки, выделяй ключевые фразы жирным.';

const STYLE_PROMPTS = {
  business: 'Стиль общения: деловой, чёткий, нейтральный. Без эмодзи.',
  friendly: 'Стиль общения: дружеский, тёплый, но без панибратства. Можно лёгкие эмодзи.',
  direct: 'Стиль общения: максимально прямо, без воды, только факты. Короткие абзацы.',
  selling: 'Стиль общения: активный продающий, с акцентом на выгоду клиента и призывами к действию.'
};

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

function parseCookies(header) {
  var out = {};
  if (!header) return out;
  var parts = header.split(';');
  for (var i = 0; i < parts.length; i++) {
    var pair = parts[i];
    var idx = pair.indexOf('=');
    if (idx < 0) continue;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  }
  return out;
}

async function getSession(request, env) {
  var cookies = parseCookies(request.headers.get('Cookie'));
  var token = cookies.session;
  if (!token) return null;
  var now = Date.now();
  var row = await env.DB.prepare(
    'SELECT s.token, s.user_id, s.expires_at, u.email, u.plan, u.ai_messages_today, u.ai_last_date, u.default_city, u.default_niche, u.ai_style FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
  ).bind(token, now).first();
  if (!row) return null;
  return { token: token, user: row };
}

function buildSystemPrompt(userContext) {
  var parts = [BASE_SYSTEM_PROMPT];

  if (userContext) {
    var ctxLines = [];
    if (userContext.city) ctxLines.push('Город: ' + userContext.city);
    if (userContext.niche) ctxLines.push('Ниша: ' + userContext.niche);
    if (userContext.favoritesCount) ctxLines.push('В избранном лидов: ' + userContext.favoritesCount);
    if (ctxLines.length) {
      parts.push('\nКОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:\n' + ctxLines.join('\n') + '\nУчитывай этот контекст — не предлагай действия для других городов и ниш.');
    }
    var styleKey = userContext.style || 'business';
    parts.push('\n' + (STYLE_PROMPTS[styleKey] || STYLE_PROMPTS.business));
  } else {
    parts.push('\n' + STYLE_PROMPTS.business);
  }

  return parts.join('\n');
}

async function callGemini(messages, env, systemPrompt) {
  var key = env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY не задан');

  var contents = [];
  for (var i = 0; i < messages.length; i++) {
    var m = messages[i];
    if (m.role === 'system') continue;
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }]
    });
  }

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + key;
  var r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.8, maxOutputTokens: 1200 }
    })
  });

  if (!r.ok) {
    var txt = await r.text();
    throw new Error('gemini ' + r.status + ': ' + txt.slice(0, 100));
  }

  var data = await r.json();
  var text = '';
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
    for (var j = 0; j < data.candidates[0].content.parts.length; j++) {
      text += data.candidates[0].content.parts[j].text || '';
    }
  }
  if (!text) throw new Error('gemini пустой ответ');
  return { text: text.trim(), provider: 'gemini' };
}

async function callDeepSeek(messages, env, systemPrompt) {
  var key = env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY не задан');

  var msgs = [{ role: 'system', content: systemPrompt }];
  for (var i = 0; i < messages.length; i++) {
    if (messages[i].role === 'system') continue;
    msgs.push({ role: messages[i].role, content: String(messages[i].content) });
  }

  var r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: msgs,
      temperature: 0.8,
      max_tokens: 1200,
      stream: false
    })
  });

  if (!r.ok) {
    var txt = await r.text();
    throw new Error('deepseek ' + r.status + ': ' + txt.slice(0, 100));
  }

  var data = await r.json();
  var text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
  if (!text) throw new Error('deepseek пустой ответ');
  return { text: text.trim(), provider: 'deepseek' };
}

async function callAI(messages, env, systemPrompt) {
  try {
    return await callGemini(messages, env, systemPrompt);
  } catch (e) {
    console.error('Gemini failed:', e.message);
    try {
      return await callDeepSeek(messages, env, systemPrompt);
    } catch (e2) {
      console.error('DeepSeek failed:', e2.message);
      throw new Error('AI недоступен. Попробуй позже.');
    }
  }
}

export async function handleAILimit(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  var session = await getSession(request, env);
  if (!session) return json({ user: null, limit: PRO_AI_LIMIT, used: 0, pro: false });
  var u = session.user;
  var todayStr = today();
  var used = u.ai_last_date === todayStr ? (u.ai_messages_today || 0) : 0;
  return json({
    user: { plan: u.plan },
    pro: u.plan === 'pro',
    used: used,
    limit: PRO_AI_LIMIT,
    remaining: Math.max(0, PRO_AI_LIMIT - used)
  });
}

export async function handleChat(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  var session = await getSession(request, env);
  if (!session) return json({ error: 'нужен вход', code: 'AUTH_REQUIRED' }, 401);

  var u = session.user;

  if (u.plan !== 'pro') {
    return json({
      error: 'AI Агент доступен только в PRO',
      code: 'PRO_REQUIRED'
    }, 403);
  }

  var body;
  try { body = await request.json(); }
  catch (e) { return json({ error: 'некорректный JSON' }, 400); }

  var messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) return json({ error: 'нет сообщений' }, 400);
  if (messages.length > 20) messages = messages.slice(-20);

  // Валидация длины и типов
  var totalLen = 0;
  for (var mi = 0; mi < messages.length; mi++) {
    if (typeof messages[mi].content !== 'string') continue;
    totalLen += messages[mi].content.length;
  }
  if (totalLen > 8000) return json({ error: 'слишком длинный запрос (макс. 8000 символов)' }, 400);

  var todayStr = today();
  var used = u.ai_last_date === todayStr ? (u.ai_messages_today || 0) : 0;

  if (used >= PRO_AI_LIMIT) {
    return json({
      error: 'Дневной лимит AI-сообщений исчерпан',
      code: 'AI_LIMIT_REACHED',
      used: used,
      limit: PRO_AI_LIMIT
    }, 429);
  }

  // Atomic-инкремент лимита ДО вызова AI.
  // Если лимит исчерпан между проверкой и апдейтом — changes = 0.
  var reserve = await env.DB.prepare(
    'UPDATE users SET ' +
    'ai_messages_today = CASE WHEN ai_last_date = ?1 THEN ai_messages_today + 1 ELSE 1 END, ' +
    'ai_last_date = ?1 ' +
    'WHERE id = ?2 AND (ai_last_date != ?1 OR ai_messages_today < ?3)'
  ).bind(todayStr, u.user_id, PRO_AI_LIMIT).run();

  if (!reserve.meta || reserve.meta.changes === 0) {
    return json({
      error: 'Дневной лимит AI-сообщений исчерпан',
      code: 'AI_LIMIT_REACHED',
      used: PRO_AI_LIMIT,
      limit: PRO_AI_LIMIT
    }, 429);
  }

  // Контекст пользователя
  var favsCount = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ?'
  ).bind(u.user_id).first();

  var userContext = {
    city: u.default_city || '',
    niche: u.default_niche || '',
    style: u.ai_style || 'business',
    favoritesCount: (favsCount && favsCount.cnt) || 0
  };

  var systemPrompt = buildSystemPrompt(userContext);

  try {
    var result = await callAI(messages, env, systemPrompt);
    var newUsed = used + 1;

    return json({
      ok: true,
      reply: result.text,
      provider: result.provider,
      used: newUsed,
      limit: PRO_AI_LIMIT,
      remaining: Math.max(0, PRO_AI_LIMIT - newUsed)
    });
  } catch (e) {
    // При ошибке AI возвращаем счётчик назад
    try {
      await env.DB.prepare(
        'UPDATE users SET ai_messages_today = CASE WHEN ai_messages_today > 0 THEN ai_messages_today - 1 ELSE 0 END WHERE id = ? AND ai_last_date = ?'
      ).bind(u.user_id, todayStr).run();
    } catch (rollbackErr) {}
    return json({ error: e.message || 'AI недоступен' }, 500);
  }
}
// ═══ AI LEAD SCRIPT (персональный скрипт под конкретного лида) ═══
export async function handleLeadScript(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  var session = await getSession(request, env);
  if (!session) return json({ error: 'нужен вход', code: 'AUTH_REQUIRED' }, 401);

  var u = session.user;
  if (u.plan !== 'pro') {
    return json({ error: 'AI-скрипты доступны только в PRO', code: 'PRO_REQUIRED' }, 403);
  }

  var body;
  try { body = await request.json(); }
  catch (e) { return json({ error: 'некорректный JSON' }, 400); }

  var leadName = String(body.name || '').trim().slice(0, 200);
  var leadAddr = String(body.addr || '').trim().slice(0, 200);
  var leadPhone = String(body.phone || '').trim().slice(0, 50);
  var leadType = String(body.type || '').trim().slice(0, 50);
  var leadOpening = String(body.opening || '').trim().slice(0, 100);
  var city = String(body.city || '').trim().slice(0, 100);
  var niche = String(body.niche || '').trim().slice(0, 100);

  if (!leadName || !city || !niche) {
    return json({ error: 'нужны name, city, niche' }, 400);
  }

  // Проверяем кэш
  var cached = await env.DB.prepare(
    'SELECT script FROM ai_scripts WHERE user_id = ? AND lead_name = ? AND city = ? AND niche = ?'
  ).bind(u.user_id, leadName, city, niche).first();

  if (cached && cached.script) {
    return json({ ok: true, script: cached.script, cached: true });
  }

  // Лимит AI (тот же счётчик, что и чат)
  var todayStr = today();
  var used = u.ai_last_date === todayStr ? (u.ai_messages_today || 0) : 0;
  if (used >= PRO_AI_LIMIT) {
    return json({ error: 'Дневной лимит AI исчерпан', code: 'AI_LIMIT_REACHED' }, 429);
  }

  // Атомарный инкремент лимита
  var reserve = await env.DB.prepare(
    'UPDATE users SET ' +
    'ai_messages_today = CASE WHEN ai_last_date = ?1 THEN ai_messages_today + 1 ELSE 1 END, ' +
    'ai_last_date = ?1 ' +
    'WHERE id = ?2 AND (ai_last_date != ?1 OR ai_messages_today < ?3)'
  ).bind(todayStr, u.user_id, PRO_AI_LIMIT).run();

  if (!reserve.meta || reserve.meta.changes === 0) {
    return json({ error: 'Дневной лимит AI исчерпан', code: 'AI_LIMIT_REACHED' }, 429);
  }

  // Собираем промпт
  var styleKey = u.ai_style || 'business';
  var styleHint = STYLE_PROMPTS[styleKey] || STYLE_PROMPTS.business;

  var prompt =
    'Составь персональный скрипт холодного звонка для продажи услуги «разработка сайта».\n\n' +
    'ИНФОРМАЦИЯ О ЛИДЕ:\n' +
    '- Название: ' + leadName + '\n' +
    (leadType ? '- Тип бизнеса: ' + leadType + '\n' : '') +
    (leadAddr ? '- Адрес: ' + leadAddr + '\n' : '') +
    (leadPhone ? '- Телефон: ' + leadPhone + '\n' : '') +
    (leadOpening ? '- Часы работы: ' + leadOpening + '\n' : '') +
    '- Город: ' + city + '\n' +
    '- Ниша: ' + niche + '\n' +
    '- У бизнеса НЕТ своего сайта.\n\n' +
    'КОНТЕКСТ ПРОДАВЦА:\n' +
    '- Город продавца: ' + (u.default_city || city) + '\n' +
    '- Основная ниша: ' + (u.default_niche || niche) + '\n' +
    '- ' + styleHint + '\n\n' +
    'ТРЕБОВАНИЯ К СКРИПТУ:\n' +
    '- НЕ используй общие фразы типа «добрый день, меня зовут».\n' +
    '- Начни с конкретной детали о бизнесе (адрес, ниша, отсутствие сайта, годы работы).\n' +
    '- Структура: цепляющее открытие → квалификация → презентация → закрытие на встречу.\n' +
    '- Живые фразы, которые можно сразу говорить.\n' +
    '- Ответы на 3 типовых возражения («нет денег», «уже есть соцсети», «мне не надо»).\n' +
    '- До 500 слов.\n' +
    '- Русский язык.';

  // Отправляем в Gemini (fallback DeepSeek)
  var systemPrompt = 'Ты — эксперт по B2B-продажам в веб-разработке. Твои скрипты конкретные, работают в реальности, без воды.';

  try {
    var result = await callAI([{ role: 'user', content: prompt }], env, systemPrompt);
    var scriptText = result.text;

    // Кэшируем
    try {
      await env.DB.prepare(
        'INSERT OR REPLACE INTO ai_scripts (user_id, lead_name, city, niche, script, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(u.user_id, leadName, city, niche, scriptText, Date.now()).run();
    } catch (e) {
      console.error('cache save failed', e.message);
    }

    var newUsed = used + 1;
    return json({
      ok: true,
      script: scriptText,
      cached: false,
      provider: result.provider,
      used: newUsed,
      limit: PRO_AI_LIMIT,
      remaining: Math.max(0, PRO_AI_LIMIT - newUsed)
    });
  } catch (e) {
    // Откатываем лимит при ошибке
    try {
      await env.DB.prepare(
        'UPDATE users SET ai_messages_today = CASE WHEN ai_messages_today > 0 THEN ai_messages_today - 1 ELSE 0 END WHERE id = ? AND ai_last_date = ?'
      ).bind(u.user_id, todayStr).run();
    } catch (rollbackErr) {}
    return json({ error: e.message || 'AI недоступен' }, 500);
  }
}
