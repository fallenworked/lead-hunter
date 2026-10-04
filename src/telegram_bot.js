// Telegram-бот для управления автоматизацией Lead Hunter
import { searchForUser } from './auto.js';

async function getState(chatId, env) {
  var row = await env.DB.prepare('SELECT state FROM bot_state WHERE chat_id = ?').bind(String(chatId)).first();
  return row ? row.state : null;
}

async function setState(chatId, state, env) {
  if (!state) {
    await env.DB.prepare('DELETE FROM bot_state WHERE chat_id = ?').bind(String(chatId)).run();
  } else {
    await env.DB.prepare(
      'INSERT INTO bot_state (chat_id, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(chat_id) DO UPDATE SET state = ?, updated_at = ?'
    ).bind(String(chatId), state, Date.now(), state, Date.now()).run();
  }
}

const HELP_TEXT =
  '👋 <b>Lead Hunter</b>\n\n' +
  'Управление поиском прямо в Telegram.\n\n' +
  '<b>Команды:</b>\n' +
  '/start - начать / показать меню\n' +
  '/settings - текущие настройки\n' +
  '/city <i>название</i> - задать город\n' +
  '/niche <i>название</i> - задать нишу\n' +
  '/autosearch on|off - автопоиск\n' +
  '/summary on|off - ежедневная сводка\n' +
  '/summaryhour <i>0-23</i> - час сводки (МСК)\n' +
  '/search - разовый поиск\n' +
  '/help - эта справка';

function send(env, chatId, text, replyMarkup) {
  var body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return fetch('https://api.telegram.org/bot' + env.TELEGRAM_NOTIFY_BOT_TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function(r){ return r.json(); });
}

function answerCallback(env, callbackId) {
  return fetch('https://api.telegram.org/bot' + env.TELEGRAM_NOTIFY_BOT_TOKEN + '/answerCallbackQuery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId })
  });
}

async function getChatId(chatId, env) {
  return await env.DB.prepare('SELECT * FROM users WHERE telegram_chat_id = ?').bind(String(chatId)).first();
}

function mainMenu() {
  return {
    keyboard: [
      [{ text: '⚙️ Настройки' }, { text: '🔍 Поиск' }],
      [{ text: '📊 Сводка' }, { text: '❓ Помощь' }]
    ],
    resize_keyboard: true
  };
}

async function cmdStart(chatId, user, env) {
  if (!user) {
    return send(env, chatId,
      '👋 <b>Добро пожаловать в Lead Hunter!</b>\n\n' +
      'Чтобы связать этот Telegram с аккаунтом на сайте, зайди на <b>lead-hunt.su</b> и войди через кнопку «Войти через Telegram».\n\n' +
      'После этого тут будут работать команды управления автопоиском.',
      mainMenu()
    );
  }
  return send(env, chatId,
    '👋 С возвращением!\n\n' +
    'Аккаунт: <b>' + user.email + '</b>\n' +
    'План: <b>' + (user.plan === 'pro' ? 'PRO' : 'FREE') + '</b>\n\n' +
    'Используй кнопки ниже или команды:\n' +
    '/settings - настройки\n' +
    '/search - разовый поиск\n' +
    '/help - все команды',
    mainMenu()
  );
}

async function cmdSettings(chatId, user, env) {
  if (!user) return send(env, chatId, 'Сначала привяжи аккаунт на сайте: lead-hunt.su');
  var summaryText = user.daily_summary
    ? 'в ' + (user.daily_summary_hour || 20) + ':00 МСК'
    : 'выключена';

  var text =
    '⚙️ <b>Текущие настройки</b>\n\n' +
    '🏙 Город: <b>' + (user.default_city || '— не задан —') + '</b>\n' +
    '🏷 Ниша: <b>' + (user.default_niche || '— не задана —') + '</b>\n' +
    '🤖 Автопоиск: <b>' + (user.autosearch_enabled ? 'включён' : 'выключен') + '</b>\n' +
    '📊 Ежедневная сводка: <b>' + summaryText + '</b>';

  var markup = {
    inline_keyboard: [
      [
        { text: '🏙 Изменить город', callback_data: 'ask_city' },
        { text: '🏷 Изменить нишу', callback_data: 'ask_niche' }
      ],
      [
        {
          text: user.autosearch_enabled ? '⏸ Выключить автопоиск' : '▶️ Включить автопоиск',
          callback_data: user.autosearch_enabled ? 'auto_off' : 'auto_on'
        }
      ],
      [
        {
          text: user.daily_summary ? '📊 Выключить сводку' : '📊 Включить сводку',
          callback_data: user.daily_summary ? 'sum_off' : 'sum_on'
        }
      ]
    ]
  };
  return send(env, chatId, text, markup);
}

async function cmdCity(chatId, user, args, env) {
  if (!user) return send(env, chatId, 'Сначала привяжи аккаунт: lead-hunt.su');
  if (!args.length) return send(env, chatId, 'Использование: <code>/city Казань</code>');
  var city = args.join(' ').trim();
  await env.DB.prepare('UPDATE users SET default_city = ? WHERE id = ?').bind(city, user.id).run();
  return send(env, chatId, '✅ Город сохранён: <b>' + city + '</b>', mainMenu());
}

async function cmdNiche(chatId, user, args, env) {
  if (!user) return send(env, chatId, 'Сначала привяжи аккаунт: lead-hunt.su');
  if (!args.length) return send(env, chatId, 'Использование: <code>/niche кафе</code>');
  var niche = args.join(' ').trim().toLowerCase();
  await env.DB.prepare('UPDATE users SET default_niche = ? WHERE id = ?').bind(niche, user.id).run();
  return send(env, chatId, '✅ Ниша сохранена: <b>' + niche + '</b>', mainMenu());
}

async function cmdAutosearch(chatId, user, args, env) {
  if (!user) return send(env, chatId, 'Сначала привяжи аккаунт: lead-hunt.su');
  if (user.plan !== 'pro') return send(env, chatId, '🚫 Автопоиск доступен только в PRO.');
  var val = (args[0] || '').toLowerCase();
  if (val !== 'on' && val !== 'off') return send(env, chatId, 'Использование: <code>/autosearch on</code> или <code>/autosearch off</code>');
  var enabled = val === 'on' ? 1 : 0;
  await env.DB.prepare('UPDATE users SET autosearch_enabled = ? WHERE id = ?').bind(enabled, user.id).run();
  if (enabled && (!user.default_city || !user.default_niche)) {
    return send(env, chatId, '⚠️ Автопоиск включён, но нужны город и ниша.\n\n/city Казань\n/niche кафе', mainMenu());
  }
  return send(env, chatId, enabled ? '✅ Автопоиск включён' : '⏸ Автопоиск выключен', mainMenu());
}

async function cmdSummary(chatId, user, args, env) {
  if (!user) return send(env, chatId, 'Сначала привяжи аккаунт: lead-hunt.su');
  var val = (args[0] || '').toLowerCase();
  if (val !== 'on' && val !== 'off') return send(env, chatId, 'Использование: <code>/summary on</code> или <code>/summary off</code>');
  var enabled = val === 'on' ? 1 : 0;
  await env.DB.prepare('UPDATE users SET daily_summary = ? WHERE id = ?').bind(enabled, user.id).run();
  return send(env, chatId,
    enabled
      ? '✅ Ежедневная сводка включена (в ' + (user.daily_summary_hour || 20) + ':00 МСК)\n\nИзменить час: <code>/summaryhour 9</code>'
      : '⏸ Ежедневная сводка выключена',
    mainMenu()
  );
}

async function cmdSummaryHour(chatId, user, args, env) {
  if (!user) return send(env, chatId, 'Сначала привяжи аккаунт: lead-hunt.su');
  var h = parseInt(args[0] || '', 10);
  if (isNaN(h) || h < 0 || h > 23) return send(env, chatId, 'Использование: <code>/summaryhour 20</code> (0-23)');
  await env.DB.prepare('UPDATE users SET daily_summary_hour = ? WHERE id = ?').bind(h, user.id).run();
  return send(env, chatId, '✅ Час сводки: <b>' + h + ':00 МСК</b>', mainMenu());
}

async function cmdSearch(chatId, user, env) {
  if (!user) return send(env, chatId, 'Сначала привяжи аккаунт: lead-hunt.su');
  if (!user.default_city || !user.default_niche) {
    return send(env, chatId, '⚠️ Задай город и нишу:\n/city Казань\n/niche кафе');
  }
  await send(env, chatId, '🔍 Ищу <b>' + user.default_niche + '</b> в <b>' + user.default_city + '</b>…\nЭто займёт 5-15 секунд.');
  try {
    var result = await searchForUser(user, env);
    if (!result.leads.length) {
      return send(env, chatId, '😕 Ничего не найдено. Попробуй другую нишу или город.', mainMenu());
    }
    var text = '🎯 <b>Найдено ' + result.total + ' лидов</b>\n';
    text += 'Город: <b>' + user.default_city + '</b> · Ниша: <b>' + user.default_niche + '</b>\n\n';
    var shown = result.leads.slice(0, 10);
    for (var i = 0; i < shown.length; i++) {
      var l = shown[i];
      text += (i + 1) + '. <b>' + l.name + '</b>';
      if (l.phone) text += ' · 📞 ' + l.phone;
      if (l.addr) text += ' · 📍 ' + l.addr;
      text += '\n';
    }
    if (result.total > 10) text += '\n… и ещё ' + (result.total - 10) + '. Смотри на сайте lead-hunt.su';

    var markup = {
      inline_keyboard: [[
        { text: '🌐 Все на сайте', url: 'https://lead-hunt.su/' }
      ]]
    };
    return send(env, chatId, text, markup);
  } catch (e) {
    return send(env, chatId, '❌ Ошибка поиска: ' + e.message);
  }
}

// ═══ HANDLERS ═══

export async function handleTelegramWebhook(request, env) {
  if (request.method !== 'POST') return new Response('ok');
  var body;
  try { body = await request.json(); }
  catch (e) { return new Response('bad json', { status: 400 }); }

  async function generateScript(user, leadName, city, niche, env) {
  var apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY не задан');

  // Проверяем кеш
  var cached = await env.DB.prepare(
    'SELECT script FROM ai_scripts WHERE user_id = ? AND lead_name = ? AND city = ? AND niche = ?'
  ).bind(user.id, leadName, city, niche).first();

  if (cached && cached.script) return cached.script;

  var prompt =
    'Составь скрипт холодного звонка для B2B-продажи услуги «разработка сайта».\n\n' +
    'Бизнес: ' + leadName + '\n' +
    'Ниша: ' + niche + '\n' +
    'Город: ' + city + '\n' +
    'У бизнеса НЕТ своего сайта.\n\n' +
    'Требования:\n' +
    '- Кратко, по делу, без воды.\n' +
    '- Структура: открытие, квалификация, презентация, закрытие на встречу.\n' +
    '- Живые фразы, которые можно сразу говорить.\n' +
    '- Ответы на 3 типовых возражения («нет денег», «уже есть соцсети», «мне не надо»).\n' +
    '- До 600 слов.\n' +
    '- Русский язык.';

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + apiKey;
  var r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
    })
  });

  if (!r.ok) {
    var txt = await r.text();
    throw new Error('Gemini ' + r.status + ': ' + txt.slice(0, 100));
  }

  var data = await r.json();
  var text = '';
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
    for (var i = 0; i < data.candidates[0].content.parts.length; i++) {
      text += data.candidates[0].content.parts[i].text || '';
    }
  }
  text = text.trim();
  if (!text) throw new Error('пустой ответ Gemini');

  // Кешируем
  try {
    await env.DB.prepare(
      'INSERT OR REPLACE INTO ai_scripts (user_id, lead_name, city, niche, script, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(user.id, leadName, city, niche, text, Date.now()).run();
  } catch (e) {}

  return text;
}

  // ═══ CALLBACK QUERY (inline-кнопки) ═══
  if (body.callback_query) {
    var cb = body.callback_query;
    var cbChatId = cb.message.chat.id;
    var cbData = cb.data || '';
    var cbUser = await getChatId(cbChatId, env);

    await answerCallback(env, cb.id);

    if (cbData === 'save_all' || cbData.indexOf('save_all:') === 0) {
      if (!cbUser) {
        await send(env, cbChatId, 'Аккаунт не привязан. Зайди на lead-hunt.su через Telegram.');
      } else {
        await send(env, cbChatId, '⭐ Лиды уже сохранены. Открой сайт чтобы посмотреть: lead-hunt.su');
      }
          if (cbData.indexOf('ai_script:') === 0) {
      if (!cbUser) return new Response('ok');
      if (cbUser.plan !== 'pro') {
        await send(env, cbChatId, '🚫 AI-скрипты доступны только в PRO.');
        return new Response('ok');
      }
      var parts = cbData.substring(10).split(':');
      var leadName = decodeURIComponent(parts[0] || '');
      var leadCity = decodeURIComponent(parts[1] || '');
      var leadNiche = decodeURIComponent(parts[2] || '');

      await send(env, cbChatId, '🎯 Генерирую скрипт для «' + leadName + '»…\n5-10 секунд.');

      try {
        var script = await generateScript(cbUser, leadName, leadCity, leadNiche, env);

        // TG ограничение 4096 символов, режем если что
        var msg = '🎯 <b>Скрипт звонка</b>\n';
        msg += 'Для: <b>' + leadName + '</b>\n';
        msg += 'Ниша: <b>' + leadNiche + '</b> · ' + leadCity + '\n\n';
        msg += script;
        if (msg.length > 4000) msg = msg.slice(0, 3990) + '…';

        var copyMarkup = {
          inline_keyboard: [[
            { text: '📋 Скопировать', switch_inline_query_current_chat: '' }
          ]]
        };

        await send(env, cbChatId, msg, copyMarkup);
      } catch (e) {
        await send(env, cbChatId, '❌ Ошибка: ' + e.message);
      }
      return new Response('ok');
    }
      return new Response('ok');
    }

    if (cbData === 'auto_on') {
      if (!cbUser) return new Response('ok');
      if (cbUser.plan !== 'pro') {
        await send(env, cbChatId, '🚫 Автопоиск только в PRO.');
        return new Response('ok');
      }
      await env.DB.prepare('UPDATE users SET autosearch_enabled = 1 WHERE id = ?').bind(cbUser.id).run();
      await send(env, cbChatId, '✅ Автопоиск включён');
      return new Response('ok');
    }

    if (cbData === 'auto_off') {
      if (!cbUser) return new Response('ok');
      await env.DB.prepare('UPDATE users SET autosearch_enabled = 0 WHERE id = ?').bind(cbUser.id).run();
      await send(env, cbChatId, '⏸ Автопоиск выключен');
      return new Response('ok');
    }

    if (cbData === 'sum_on') {
      if (!cbUser) return new Response('ok');
      await env.DB.prepare('UPDATE users SET daily_summary = 1 WHERE id = ?').bind(cbUser.id).run();
      await send(env, cbChatId, '📊 Ежедневная сводка включена в ' + (cbUser.daily_summary_hour || 20) + ':00 МСК');
      return new Response('ok');
    }

    if (cbData === 'sum_off') {
      if (!cbUser) return new Response('ok');
      await env.DB.prepare('UPDATE users SET daily_summary = 0 WHERE id = ?').bind(cbUser.id).run();
      await send(env, cbChatId, '⏸ Сводка выключена');
      return new Response('ok');
    }

        if (cbData === 'ask_city') {
      await setState(cbChatId, 'await_city', env);
      await send(env, cbChatId, '🏙 Напиши название города одним сообщением.\n\nПример: <b>Казань</b>\n\nОтмена: /cancel');
      return new Response('ok');
    }

    if (cbData === 'ask_niche') {
      await setState(cbChatId, 'await_niche', env);
      await send(env, cbChatId, '🏷 Напиши название ниши одним сообщением.\n\nПримеры: <b>кафе</b>, <b>стоматология</b>, <b>автосервис</b>\n\nОтмена: /cancel');
      return new Response('ok');
    }

    return new Response('ok');
  }

  // ═══ ОБЫЧНЫЕ СООБЩЕНИЯ ═══
  var msg = body.message || body.edited_message;
  if (!msg) return new Response('ok');

  var chatId = msg.chat.id;
  var text = (msg.text || '').trim();
  if (!text) return new Response('ok');

  // Кнопки reply-меню
  if (text === '⚙️ Настройки') text = '/settings';
  if (text === '🔍 Поиск') text = '/search';
  if (text === '📊 Сводка') text = '/summary on';
  if (text === '❓ Помощь') text = '/help';

    var user = await getChatId(chatId, env);
  var currentState = await getState(chatId, env);

  // Обработка команд отмены
  if (text === '/cancel') {
    if (currentState) {
      await setState(chatId, null, env);
      await send(env, chatId, '↩️ Отменено', mainMenu());
    } else {
      await send(env, chatId, 'Нечего отменять', mainMenu());
    }
    return new Response('ok');
  }

  // Обработка пошагового ввода
  if (currentState && !text.startsWith('/')) {
    if (currentState === 'await_city') {
      if (!user) { await setState(chatId, null, env); return new Response('ok'); }
      var cityName = text.trim();
      if (cityName.length < 2 || cityName.length > 50) {
        await send(env, chatId, '⚠️ Название слишком короткое или длинное. Попробуй ещё раз или /cancel');
        return new Response('ok');
      }
      await env.DB.prepare('UPDATE users SET default_city = ? WHERE id = ?').bind(cityName, user.id).run();
      await setState(chatId, null, env);
      await send(env, chatId, '✅ Город сохранён: <b>' + cityName + '</b>', mainMenu());
      return new Response('ok');
    }

    if (currentState === 'await_niche') {
      if (!user) { await setState(chatId, null, env); return new Response('ok'); }
      var nicheName = text.trim().toLowerCase();
      if (nicheName.length < 2 || nicheName.length > 50) {
        await send(env, chatId, '⚠️ Название слишком короткое или длинное. Попробуй ещё раз или /cancel');
        return new Response('ok');
      }
      await env.DB.prepare('UPDATE users SET default_niche = ? WHERE id = ?').bind(nicheName, user.id).run();
      await setState(chatId, null, env);
      await send(env, chatId, '✅ Ниша сохранена: <b>' + nicheName + '</b>', mainMenu());
      return new Response('ok');
    }
  }

  if (text === '/start') { await cmdStart(chatId, user, env); return new Response('ok'); }
  if (text === '/help') { await send(env, chatId, HELP_TEXT); return new Response('ok'); }
  if (text === '/settings') { await cmdSettings(chatId, user, env); return new Response('ok'); }
  if (text === '/search') { await cmdSearch(chatId, user, env); return new Response('ok'); }

  var m;
  if ((m = text.match(/^\/city\s+(.+)/i))) { await cmdCity(chatId, user, m[1].split(' '), env); return new Response('ok'); }
  if ((m = text.match(/^\/niche\s+(.+)/i))) { await cmdNiche(chatId, user, m[1].split(' '), env); return new Response('ok'); }
  if ((m = text.match(/^\/autosearch\s+(\S+)/i))) { await cmdAutosearch(chatId, user, [m[1]], env); return new Response('ok'); }
  if ((m = text.match(/^\/summary\s+(\S+)/i))) { await cmdSummary(chatId, user, [m[1]], env); return new Response('ok'); }
  if ((m = text.match(/^\/summaryhour\s+(\S+)/i))) { await cmdSummaryHour(chatId, user, [m[1]], env); return new Response('ok'); }

  if (text === '/summary') { await send(env, chatId, 'Использование: <code>/summary on</code> или <code>/summary off</code>'); return new Response('ok'); }

  if (!text.startsWith('/')) {
    await send(env, chatId, 'Не понимаю. Используй /help чтобы увидеть команды.', mainMenu());
  }

  return new Response('ok');
}
