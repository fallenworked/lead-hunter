import html from './index.html';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleLeads(request);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

const RSS_SOURCES = [
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
  const body = await r.text();
  return parseKwork(body, sourceName);
}

// Универсальный парсер: ловит любые ссылки вида /projects/NNNN и берёт текст ссылки как заголовок
function parseKwork(body, sourceName) {
  const leads = [];
  const seen = new Set();
  const re = /<a[^>]+href="(\/projects\/\d+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const link = 'https://kwork.ru' + m[1];
    if (seen.has(link)) continue;
    const title = stripHTML(m[2]);
    if (!title || title.length < 8) continue;
    seen.add(link);
    leads.push({
      title: title.slice(0, 160),
      link,
      desc: '',
      date: '',
      source: sourceName,
    });
  }
  return leads;
}

async function handleLeads(request) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const debug = {};
  const test = async (name, fn) => {
    const t0 = Date.now();
    try {
      const r = await withTimeout(fn(), 8000);
      debug[name] = { ok: true, ms: Date.now() - t0, count: Array.isArray(r) ? r.length : 0 };
      return r;
    } catch (e) {
      debug[name] = { ok: false, ms: Date.now() - t0, error: e.message };
      return [];
    }
  };

  const results = await Promise.all([
    ...RSS_SOURCES.map(s => test(s.name, () => fetchXML(s.url).then(x => parseRSS(x, s.name)))),
    ...KWORK_URLS.map(s => test(s.name, () => fetchKwork(s.url, s.name))),
  ]);

  const all = results.flat();
  const seen = new Set();
  const unique = all.filter(l => {
    const k = l.link.replace(/[?#].*$/, '');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return new Response(JSON.stringify({
    count: unique.length,
    updated: new Date().toISOString(),
    sources: [...new Set(unique.map(l => l.source))],
    leads: unique.map(l => ({ ...l, score: scoreLead(l) }))
      .filter(l => l.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 150),
    debug,
  }), { headers: CORS });
}
