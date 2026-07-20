const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH =
  process.env.DB_PATH ?? path.join(__dirname, '..', 'data', 'scout-off.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS referral_codes (
    code TEXT PRIMARY KEY,
    scout_wallet TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    used_by TEXT,
    used_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_referral_codes_scout_wallet
    ON referral_codes (scout_wallet);
`);

module.exports = db;
