// Автопоиск новых лидов + отправка в Telegram

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

const CITIES = {
  'москва': [55.7558, 37.6173, 5000, 'Москва'],
  'мск': [55.7558, 37.6173, 5000, 'Москва'],
  'санкт-петербург': [59.9343, 30.3351, 5000, 'Санкт-Петербург'],
  'спб': [59.9343, 30.3351, 5000, 'Санкт-Петербург'],
  'питер': [59.9343, 30.3351, 5000, 'Санкт-Петербург'],
  'новосибирск': [55.0084, 82.9357, 5000, 'Новосибирск'],
  'екатеринбург': [56.8389, 60.6057, 5000, 'Екатеринбург'],
  'казань': [55.8304, 49.0661, 5000, 'Казань'],
  'нижний новгород': [56.3269, 44.0059, 5000, 'Нижний Новгород'],
  'челябинск': [55.1644, 61.4368, 5000, 'Челябинск'],
  'самара': [53.2001, 50.1500, 5000, 'Самара'],
  'омск': [54.9885, 73.3242, 5000, 'Омск'],
  'ростов-на-дону': [47.2225, 39.7187, 5000, 'Ростов-на-Дону'],
  'ростов': [47.2225, 39.7187, 5000, 'Ростов-на-Дону'],
  'уфа': [54.7388, 55.9721, 5000, 'Уфа'],
  'красноярск': [56.0153, 92.8932, 5000, 'Красноярск'],
  'воронеж': [51.6608, 39.2003, 5000, 'Воронеж'],
  'пермь': [58.0105, 56.2502, 5000, 'Пермь'],
  'волгоград': [48.7080, 44.5133, 5000, 'Волгоград'],
  'краснодар': [45.0355, 38.9753, 5000, 'Краснодар'],
  'саратов': [51.5336, 46.0343, 5000, 'Саратов'],
  'тюмень': [57.1522, 65.5272, 5000, 'Тюмень'],
  'тольятти': [53.5303, 49.3461, 5000, 'Тольятти'],
  'ижевск': [56.8527, 53.2115, 5000, 'Ижевск'],
  'барнаул': [53.3548, 83.7698, 5000, 'Барнаул'],
  'ульяновск': [54.3142, 48.4031, 5000, 'Ульяновск'],
  'иркутск': [52.2870, 104.3050, 5000, 'Иркутск'],
  'хабаровск': [48.4827, 135.0838, 5000, 'Хабаровск'],
  'ярославль': [57.6261, 39.8845, 5000, 'Ярославль'],
  'владивосток': [43.1155, 131.8855, 5000, 'Владивосток'],
  'томск': [56.4846, 84.9476, 5000, 'Томск'],
  'оренбург': [51.7682, 55.0969, 5000, 'Оренбург'],
  'кемерово': [55.3547, 86.0873, 5000, 'Кемерово'],
  'рязань': [54.6269, 39.6916, 5000, 'Рязань'],
  'астрахань': [46.3497, 48.0408, 5000, 'Астрахань'],
  'пенза': [53.2007, 45.0046, 5000, 'Пенза'],
  'липецк': [52.6089, 39.5991, 5000, 'Липецк'],
  'киров': [58.6036, 49.6680, 5000, 'Киров'],
  'тула': [54.1961, 37.6182, 5000, 'Тула'],
  'калининград': [54.7104, 20.4522, 5000, 'Калининград'],
  'курск': [51.7303, 36.1926, 5000, 'Курск'],
  'сочи': [43.5855, 39.7231, 5000, 'Сочи'],
  'ставрополь': [45.0428, 41.9734, 5000, 'Ставрополь'],
  'архангельск': [64.5393, 40.5183, 5000, 'Архангельск'],
  'мурманск': [68.9585, 33.0827, 5000, 'Мурманск'],
  'тверь': [56.8587, 35.9176, 5000, 'Тверь'],
  'иваново': [57.0004, 40.9739, 5000, 'Иваново'],
  'белгород': [50.5977, 36.5858, 5000, 'Белгород'],
  'сургут': [61.2540, 73.3962, 5000, 'Сургут'],
  'алматы': [43.2220, 76.8512, 5000, 'Алматы'],
  'астана': [51.1694, 71.4491, 5000, 'Астана'],
  'минск': [53.9006, 27.5590, 5000, 'Минск'],
  'киев': [50.4501, 30.5234, 5000, 'Киев'],
  'ташкент': [41.2995, 69.2401, 5000, 'Ташкент'],
  'тбилиси': [41.7151, 44.8271, 5000, 'Тбилиси'],
  'ереван': [40.1872, 44.5152, 5000, 'Ереван'],
  'баку': [40.4093, 49.8671, 5000, 'Баку'],
  'стамбул': [41.0082, 28.9784, 7000, 'Стамбул'],
  'дубай': [25.2048, 55.2708, 7000, 'Дубай'],
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

function normalizeCity(s) {
  return s.toLowerCase().trim().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('timeout')); }, ms); })
  ]);
}

async function overpass(query) {
  var body = 'data=' + encodeURIComponent(query);
  var headers = {
    'User-Agent': 'LeadHunter/1.0',
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  var results = await Promise.allSettled(OVERPASS.map(function(endpoint){
    return withTimeout(fetch(endpoint, { method: 'POST', headers: headers, body: body }), 20000)
      .then(function(r){
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function(d){ return d.elements || []; });
  }));
  for (var i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') return results[i].value;
  }
  return [];
}

function buildQuery(city, niche) {
  var r = 5000;
  var dLat = r / 111000;
  var dLon = r / (111000 * Math.cos(city.lat * Math.PI / 180));
  var bbox = [
    (city.lat - dLat).toFixed(5),
    (city.lon - dLon).toFixed(5),
    (city.lat + dLat).toFixed(5),
    (city.lon + dLon).toFixed(5)
  ].join(',');
  var tags = NICHES[niche.toLowerCase().trim()];
  if (!tags) {
    return '[out:json][timeout:20];node["name"~"' + niche + '","i"](' + bbox + ');out center 100;';
  }
  var parts = '';
  for (var i = 0; i < tags.length; i++) {
    parts += 'node["' + tags[i][0] + '"="' + tags[i][1] + '"](' + bbox + ');';
  }
  return '[out:json][timeout:20];(' + parts + ');out center 100;';
}

function extract(elem) {
  var t = elem.tags || {};
  var name = t.name || t['name:ru'] || '';
  if (!name) return null;
  if (t.website || t['contact:website']) return null;
  return {
    name: name,
    phone: t.phone || t['contact:phone'] || '',
    addr: [(t['addr:street'] || ''), (t['addr:housenumber'] || '')].filter(Boolean).join(' '),
    lat: elem.lat || (elem.center && elem.center.lat) || null,
    lon: elem.lon || (elem.center && elem.center.lon) || null,
  };
}

async function sendTelegram(botToken, chatId, text) {
  if (!botToken || !chatId) return;
  try {
    await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
  } catch (e) {
    console.error('TG send failed:', e.message);
  }
}

export async function runAutosearch(env) {
  var botToken = env.TELEGRAM_NOTIFY_BOT_TOKEN;
  if (!botToken) {
    console.log('TELEGRAM_NOTIFY_BOT_TOKEN не задан, автопоиск пропущен');
    return;
  }

  // Берём всех PRO-юзеров с включённым автопоиском и chat_id
  var users = await env.DB.prepare(
    "SELECT id, email, default_city, default_niche, telegram_chat_id FROM users WHERE plan = 'pro' AND autosearch_enabled = 1 AND telegram_chat_id != '' AND default_city != '' AND default_niche != ''"
  ).all();

  if (!users.results || !users.results.length) {
    console.log('Нет юзеров с автопоиском');
    return;
  }

  for (var u = 0; u < users.results.length; u++) {
    var user = users.results[u];
    try {
      var key = normalizeCity(user.default_city);
      var cityInfo = CITIES[key];
      if (!cityInfo) {
        console.log('Город не в словаре: ' + user.default_city + ' (user ' + user.email + ')');
        continue;
      }
      var city = { lat: cityInfo[0], lon: cityInfo[1], n: cityInfo[3] };
      var niche = user.default_niche.trim().toLowerCase();

      var query = buildQuery(city, niche);
      var elements = await overpass(query);
      var leads = elements.map(extract).filter(Boolean);

      if (!leads.length) continue;

      // Проверяем, какие уже есть в БД
      var existingRows = await env.DB.prepare(
        'SELECT name FROM autosearch_results WHERE user_id = ? AND city = ? AND niche = ?'
      ).bind(user.id, city.n, niche).all();
      var existing = {};
      (existingRows.results || []).forEach(function(r){ existing[r.name.toLowerCase()] = true; });

      var newLeads = leads.filter(function(l){ return !existing[l.name.toLowerCase()]; });

      if (!newLeads.length) continue;

      // Сохраняем новые
      for (var i = 0; i < newLeads.length; i++) {
        var l = newLeads[i];
        try {
          await env.DB.prepare(
            'INSERT OR IGNORE INTO autosearch_results (user_id, city, niche, name, link, addr, phone, lat, lon, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            user.id, city.n, niche, l.name,
            'https://yandex.ru/maps/?text=' + encodeURIComponent(l.name + ' ' + city.n),
            l.addr, l.phone, l.lat, l.lon, Date.now()
          ).run();
        } catch (e) {}
      }

      // Формируем сообщение
      var text = '🎯 <b>Найдено ' + newLeads.length + ' новых клиентов</b>\n';
      text += 'Город: <b>' + city.n + '</b>\n';
      text += 'Ниша: <b>' + niche + '</b>\n\n';

      var shown = newLeads.slice(0, 10);
      for (var j = 0; j < shown.length; j++) {
        var s = shown[j];
        text += (j + 1) + '. <b>' + s.name + '</b>';
        if (s.phone) text += ' · 📞 ' + s.phone;
        if (s.addr) text += ' · 📍 ' + s.addr;
        text += '\n';
      }
      if (newLeads.length > 10) {
        text += '\n… и ещё ' + (newLeads.length - 10) + ' в личном кабинете';
      }

      await sendTelegram(botToken, user.telegram_chat_id, text);
      console.log('Отправлено ' + newLeads.length + ' новых лидов юзеру ' + user.email);
    } catch (e) {
      console.error('Ошибка для юзера ' + user.email + ': ' + e.message);
    }
  }
}
export async function searchForUser(user, env) {
  var key = normalizeCity(user.default_city);
  var cityInfo = CITIES[key];
  if (!cityInfo) throw new Error('город не найден');
  var city = { lat: cityInfo[0], lon: cityInfo[1], n: cityInfo[3] };
  var niche = user.default_niche.trim().toLowerCase();
  var query = buildQuery(city, niche);
  var elements = await overpass(query);
  var leads = elements.map(extract).filter(Boolean);
  return { total: leads.length, leads: leads };
}
export async function runDailySummary(env) {
  var botToken = env.TELEGRAM_NOTIFY_BOT_TOKEN;
  if (!botToken) return;

  var now = new Date();
  // Переводим в московское время (UTC+3)
  var mskHour = (now.getUTCHours() + 3) % 24;

  var users = await env.DB.prepare(
    "SELECT id, email, default_city, default_niche, telegram_chat_id, daily_summary_hour FROM users WHERE plan = 'pro' AND daily_summary = 1 AND telegram_chat_id != ''"
  ).all();

  if (!users.results) return;

  for (var i = 0; i < users.results.length; i++) {
    var u = users.results[i];
    var targetHour = u.daily_summary_hour || 20;
    if (mskHour !== targetHour) continue;

    try {
      // Считаем статистику за сегодня
      var dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      var searches = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM search_history WHERE user_id = ? AND created_at > ?"
      ).bind(u.id, dayStart.getTime()).first();

      var newLeads = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM autosearch_results WHERE user_id = ? AND created_at > ?"
      ).bind(u.id, dayStart.getTime()).first();

      var text =
        '📊 <b>Сводка за день</b>\n\n' +
        '🔍 Поисков: <b>' + (searches.cnt || 0) + '</b>\n' +
        '🎯 Новых лидов: <b>' + (newLeads.cnt || 0) + '</b>\n';

      if (u.default_city && u.default_niche) {
        text += '\nОтслеживается: <b>' + u.default_niche + '</b> в <b>' + u.default_city + '</b>';
      }

      await send(env, u.telegram_chat_id, text);
    } catch (e) {
      console.error('summary error', u.email, e.message);
    }
  }
}
