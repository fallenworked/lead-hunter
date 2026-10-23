-- 0001_initial.sql
-- Schema definition for Lead Hunter D1 Database

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  salt TEXT,
  auth_provider TEXT DEFAULT 'email',
  plan TEXT DEFAULT 'free',
  searches_today INTEGER DEFAULT 0,
  last_search_date TEXT,
  ai_messages_today INTEGER DEFAULT 0,
  ai_last_date TEXT,
  default_city TEXT,
  default_niche TEXT,
  telegram_chat_id TEXT,
  notify_tg INTEGER DEFAULT 0,
  notify_email INTEGER DEFAULT 0,
  autosearch_enabled INTEGER DEFAULT 0,
  daily_summary INTEGER DEFAULT 0,
  daily_summary_hour INTEGER DEFAULT 20,
  daily_summary_sent_at TEXT,
  ai_style TEXT DEFAULT 'business',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  addr TEXT,
  type TEXT,
  opening TEXT,
  lat REAL,
  lon REAL,
  source_city TEXT,
  source_niche TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, name, addr),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  city TEXT NOT NULL,
  niche TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  with_phone INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bot_state (
  chat_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_intents (
  payment_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  period TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  confirmation_url TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS autosearch_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lead_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
