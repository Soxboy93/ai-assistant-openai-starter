const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'accounting.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    currency    TEXT    NOT NULL DEFAULT 'USD',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    type        TEXT    NOT NULL CHECK(type IN ('checking','savings','credit','cash','investment')),
    balance     REAL    NOT NULL DEFAULT 0,
    color       TEXT    NOT NULL DEFAULT '#4F46E5',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    icon        TEXT    NOT NULL DEFAULT '📦',
    color       TEXT    NOT NULL DEFAULT '#6B7280',
    type        TEXT    NOT NULL CHECK(type IN ('income','expense','both')) DEFAULT 'both',
    is_default  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    type          TEXT    NOT NULL CHECK(type IN ('income','expense','transfer')),
    amount        REAL    NOT NULL CHECK(amount > 0),
    description   TEXT    NOT NULL DEFAULT '',
    note          TEXT    NOT NULL DEFAULT '',
    date          TEXT    NOT NULL DEFAULT (date('now')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount        REAL    NOT NULL CHECK(amount > 0),
    period        TEXT    NOT NULL CHECK(period IN ('weekly','monthly','yearly')) DEFAULT 'monthly',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, category_id, period)
  );
`);

// ── Seed default categories ──────────────────────────────────────────────────

const seedCategories = db.prepare(
  `INSERT OR IGNORE INTO categories (user_id, name, icon, color, type, is_default)
   VALUES (NULL, ?, ?, ?, ?, 1)`
);

const defaultCategories = [
  { name: 'Salary',        icon: '💼', color: '#10B981', type: 'income'  },
  { name: 'Freelance',     icon: '💻', color: '#3B82F6', type: 'income'  },
  { name: 'Investments',   icon: '📈', color: '#8B5CF6', type: 'income'  },
  { name: 'Groceries',     icon: '🛒', color: '#F59E0B', type: 'expense' },
  { name: 'Dining Out',    icon: '🍽️', color: '#EF4444', type: 'expense' },
  { name: 'Transport',     icon: '🚗', color: '#6366F1', type: 'expense' },
  { name: 'Utilities',     icon: '💡', color: '#F97316', type: 'expense' },
  { name: 'Rent',          icon: '🏠', color: '#EC4899', type: 'expense' },
  { name: 'Healthcare',    icon: '🏥', color: '#14B8A6', type: 'expense' },
  { name: 'Entertainment', icon: '🎬', color: '#A855F7', type: 'expense' },
  { name: 'Shopping',      icon: '🛍️', color: '#F43F5E', type: 'expense' },
  { name: 'Education',     icon: '📚', color: '#0EA5E9', type: 'expense' },
  { name: 'Travel',        icon: '✈️', color: '#22C55E', type: 'expense' },
  { name: 'Subscriptions', icon: '📱', color: '#D946EF', type: 'expense' },
  { name: 'Other',         icon: '📦', color: '#6B7280', type: 'both'    },
];

const seedMany = db.transaction(() => {
  for (const cat of defaultCategories) {
    seedCategories.run(cat.name, cat.icon, cat.color, cat.type);
  }
});
seedMany();

module.exports = db;
