export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/leads') return handleLeads(request);
    return env.ASSETS.fetch(request);
  }
};

const RSS_SOURCES = [
  { url: 'https://freelance.habr.com/tasks.rss', name: 'Habr Freelance' },
  { url: 'https://www.fl.ru/rss/all.xml', name: 'FL.ru' },
];

const KWORK_URLS = [
  { url: 'https://kwork.ru/projects', name: 'Kwork' },
];

const WEIGHTS = [
  [/парс|scrap|crawl|спарс|сбор\s*данн/i, 3],
  [/selenium|playwright|puppeteer|headless|антибот/i, 3],
  [/автоматиз|бот|автосбор|монитор|отслеж|интеграц/i, 2],
  [/api|выгруз|excel|csv|google\s*sheet|гугл\s*табл/i, 2],
  [/нужен|ищу|требуется|заказ|бюджет|оплата|рубл|₽|\$/i, 1],
];

function scoreLead(lead) {
  const text = lead.title + ' ' + lead.desc;
  let score = 0;
  for (const [re, w] of WEIGHTS) if (re.test(text)) score += w;
  return score;
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

function stripHTML(s) {
  return decodeEntities(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim();
}

async function fetchXML(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadHunter/1.0)' },
    cf: { cacheTtl: 300 },
  });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

function parseRSS(xml, source) {
  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/g)];
  return items.map(m => {
    const b = m[0];
    const pick = (tag) => {
      const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
      const mm = b.match(re);
      return mm ? stripHTML(mm[1]) : '';
    };
    return {
      title: pick('title'),
      link: pick('link'),
      desc: pick('description').slice(0, 400),
      date: pick('pubDate'),
      source,
    };
  }).filter(l => l.title && l.link);
}

async function fetchKwork(url, sourceName) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      'Referer': 'https://kwork.ru/',
    },
    cf: { cacheTtl: 300 },
  });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  const html = await r.text();
  return parseKwork(html, sourceName);
}

function parseKwork(html, sourceName) {
  const leads = [];
  const cardRe = /<div[^>]*class="[^"]*wants-card[^"]*"[\s\S]*?(?=<div[^>]*class="[^"]*wants-card|<\/section>|<\/main>|$)/g;
  const cards = html.match(cardRe) || [];

  for (const body of cards) {
    const linkM = body.match(/href="(\/projects\/[^"?#]+)/);
    if (!linkM) continue;
    const link = 'https://kwork.ru' + linkM[1];

    const titleM =
      body.match(/class="[^"]*wants-card__header-title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/) ||
      body.match(/<a[^>]*href="\/projects\/[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    const title = titleM ? stripHTML(titleM[1]) : '';
    if (!title) continue;

    const descM = body.match(/class="[^"]*wants-card__description-text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const desc = descM ? stripHTML(descM[1]).slice(0, 400) : '';

    const priceM = body.match(/class="[^"]*wants-card__header-price[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const price = priceM ? stripHTML(priceM[1]) : '';

    leads.push({
      title: title.slice(0, 160),
      link,
      desc: (desc + (price ? ` · 💰 ${price}` : '')).trim(),
      date: '',
      source: sourceName,
    });
  }
  return leads;
}

async function getLeads() {
  const tasks = [
    ...RSS_SOURCES.map(s => fetchXML(s.url).then(x => parseRSS(x, s.name))),
    ...KWORK_URLS.map(s => fetchKwork(s.url, s.name)),
  ];

  const results = await Promise.allSettled(tasks);
  const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  const seen = new Set();
  const unique = all.filter(l => {
    const key = l.link.replace(/[?#].*$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique
    .map(l => ({ ...l, score: scoreLead(l) }))
    .filter(l => l.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.date || 0) - new Date(a.date || 0);
    })
    .slice(0, 150);
}

async function handleLeads(request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();
  const src = url.searchParams.get('src') || 'all';

  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const leads = await getLeads();
    let filtered = leads;
    if (src !== 'all') filtered = filtered.filter(l => l.source === src);
    if (q) filtered = filtered.filter(l => (l.title + ' ' + l.desc).toLowerCase().includes(q));

    return new Response(JSON.stringify({
      count: filtered.length,
      updated: new Date().toISOString(),
      sources: [...new Set(leads.map(l => l.source))],
      leads: filtered,
    }), {
      headers: { ...CORS, 'Cache-Control': 'public, max-age=300' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, leads: [] }), {
      status: 500, headers: CORS,
    });
  }
}
