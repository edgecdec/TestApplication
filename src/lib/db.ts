import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      bracket_data TEXT NOT NULL DEFAULT '[]',
      results_data TEXT NOT NULL DEFAULT '{}',
      lock_time TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS brackets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tournament_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      picks TEXT NOT NULL DEFAULT '{}',
      tiebreaker INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      scoring_settings TEXT NOT NULL DEFAULT '${JSON.stringify({ pointsPerRound: [1, 2, 4, 8, 16, 32], upsetBonusPerRound: [0, 0, 0, 0, 0, 0] })}',
      max_brackets INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS group_brackets (
      group_id INTEGER NOT NULL,
      bracket_id INTEGER NOT NULL,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (group_id, bracket_id),
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (bracket_id) REFERENCES brackets(id)
    );

    CREATE TABLE IF NOT EXISTS group_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS group_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bracket_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      bracket_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (bracket_id) REFERENCES brackets(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(group_id, bracket_id, user_id, emoji)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT NOT NULL DEFAULT '',
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
  `);

  // Add results_updated_at column if missing (migration)
  const cols = db.prepare("PRAGMA table_info(tournaments)").all() as { name: string }[];
  if (!cols.some(c => c.name === "results_updated_at")) {
    db.exec("ALTER TABLE tournaments ADD COLUMN results_updated_at TEXT");
  }

  // Add description column to groups if missing (migration)
  const groupCols = db.prepare("PRAGMA table_info(groups)").all() as { name: string }[];
  if (!groupCols.some(c => c.name === "description")) {
    db.exec("ALTER TABLE groups ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  }
  if (!groupCols.some(c => c.name === "buy_in")) {
    db.exec("ALTER TABLE groups ADD COLUMN buy_in REAL NOT NULL DEFAULT 0");
  }
  if (!groupCols.some(c => c.name === "payout_structure")) {
    db.exec(`ALTER TABLE groups ADD COLUMN payout_structure TEXT NOT NULL DEFAULT '${JSON.stringify({ places: [100] })}'`);
  }

  // Add paid column to group_brackets if missing (migration)
  const gbCols = db.prepare("PRAGMA table_info(group_brackets)").all() as { name: string }[];
  if (!gbCols.some(c => c.name === "paid")) {
    db.exec("ALTER TABLE group_brackets ADD COLUMN paid INTEGER NOT NULL DEFAULT 0");
  }

  // Add second chance columns to brackets if missing (migration)
  const bracketCols = db.prepare("PRAGMA table_info(brackets)").all() as { name: string }[];
  if (!bracketCols.some(c => c.name === "is_second_chance")) {
    db.exec("ALTER TABLE brackets ADD COLUMN is_second_chance INTEGER NOT NULL DEFAULT 0");
  }
  if (!bracketCols.some(c => c.name === "second_chance_round")) {
    db.exec("ALTER TABLE brackets ADD COLUMN second_chance_round INTEGER NOT NULL DEFAULT 0");
  }
}
