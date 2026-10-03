const PRO_AI_LIMIT = 100;

const SYSTEM_PROMPT = 'Ты — AI-ассистент сервиса Lead Hunter. Сервис помогает находить бизнесы без сайта по городу и нише, чтобы продавать им услуги (создание сайтов, реклама, SEO). Твоя задача — помогать пользователю: 1) составлять скрипты холодных звонков и сообщений; 2) придумывать аргументы, почему бизнесу нужен сайт; 3) писать коммерческие предложения; 4) отвечать на возражения. Отвечай кратко, по делу, на русском. Без воды и длинных вступлений. Давай конкретные фразы, которые можно использовать сразу. Используй короткие абзацы, списки, выделяй ключевые фразы жирным.';

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
    'SELECT s.token, s.user_id, s.expires_at, u.email, u.plan, u.ai_messages_today, u.ai_last_date FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
  ).bind(token, now).first();
  if (!row) return null;
  return { token: token, user: row };
}

async function callGemini(messages, env) {
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
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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

async function callDeepSeek(messages, env) {
  var key = env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY не задан');

  var msgs = [{ role: 'system', content: SYSTEM_PROMPT }];
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

async function callAI(messages, env) {
  try {
    return await callGemini(messages, env);
  } catch (e) {
    console.error('Gemini failed:', e.message);
    try {
      return await callDeepSeek(messages, env);
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

  try {
    var result = await callAI(messages, env);
    var newUsed = used + 1;
    await env.DB.prepare(
      'UPDATE users SET ai_messages_today = ?, ai_last_date = ? WHERE id = ?'
    ).bind(newUsed, todayStr, u.user_id).run();

    return json({
      ok: true,
      reply: result.text,
      provider: result.provider,
      used: newUsed,
      limit: PRO_AI_LIMIT,
      remaining: Math.max(0, PRO_AI_LIMIT - newUsed)
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
