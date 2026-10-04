// Telegram-бот для управления автоматизацией

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
      'Чтобы связать этот Telegram с аккаунтом на сайте, зайди на <b>lead-hunt.su</b> через кнопку «Войти через Telegram».\n\n' +
      'После этого тут будут работать команды управления автопоиском.',
      mainMenu()
    );
  }
  return send(env, chatId,
    '👋 С возвращением!\n\n' +
    'Твой аккаунт: <b>' + user.email + '</b>\n' +
    'План: <b>' + (user.plan === 'pro' ? 'PRO' : 'FREE') + '</b>\n\n' +
    'Команды:\n' +
    '/settings - текущие настройки\n' +
    '/city <i>название</i>\n' +
    '/niche <i>название</i>\n' +
    '/autosearch on|off\n' +
    '/summary on|off\n' +
    '/search - разовый поиск\n' +
    '/help - справка',
    mainMenu()
  );
}

async function cmdSettings(chatId, user, env) {
  if (!user) return send(env, chatId, 'Сначала привяжи аккаунт на сайте: lead-hunt.su');
  var text =
    '⚙️ <b>Текущие настройки</b>\n\n' +
    '🏙 Город: <b>' + (user.default_city || '— не задан —') + '</b>\n' +
    '🏷 Ниша: <b>' + (user.default_niche || '— не задана —') + '</b>\n' +
    '🤖 Автопоиск: <b>' + (user.autosearch_enabled ? 'включён' : 'выключен') + '</b>\n' +
    '📊 Ежедневная сводка: <b>' + (user.daily_summary ? 'в ' + user.daily_summary_hour + ':00 МСК' : 'выключена') + '</b>\n\n' +
    'Изменить:\n' +
    '/city <i>Казань</i>\n' +
    '/niche <i>кафе</i>\n' +
    '/autosearch on\n' +
    '/summary on\n' +
    '/summaryhour 20';
  return send(env, chatId, text);
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
  await send(env, chatId, '🔍 Ищу <b>' + user.default_niche + '</b> в <b>' + user.default_city + '</b>… Это займёт 5-15 секунд.');
  // Запускаем поиск через ту же логику что в auto.js
  try {
    var result = await runSearchForUser(user, env);
    if (!result.leads.length) {
      return send(env, chatId, '😕 Ничего не найдено. Попробуй другую нишу или город.');
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
    return send(env, chatId, text, mainMenu());
  } catch (e) {
    return send(env, chatId, '❌ Ошибка поиска: ' + e.message);
  }
}

// Импорт логики поиска из auto.js
import { searchForUser } from './auto.js';

async function runSearchForUser(user, env) {
  return await searchForUser(user, env);
}

export async function handleTelegramWebhook(request, env) {
  if (request.method !== 'POST') return new Response('ok');
  var body;
  try { body = await request.json(); }
  catch (e) { return new Response('bad json', { status: 400 }); }

  var msg = body.message || body.edited_message;
  if (!msg) return new Response('ok');

  var chatId = msg.chat.id;
  var text = (msg.text || '').trim();
  if (!text) return new Response('ok');

  // Кнопки меню
  if (text === '⚙️ Настройки') text = '/settings';
  if (text === '🔍 Поиск') text = '/search';
  if (text === '📊 Сводка') text = '/summary';
  if (text === '❓ Помощь') text = '/help';

  var user = await getChatId(chatId, env);

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

  // Если просто текст без команды
  if (!text.startsWith('/')) {
    await send(env, chatId, 'Не понимаю. Используй /help чтобы увидеть команды.', mainMenu());
  }

  return new Response('ok');
}
