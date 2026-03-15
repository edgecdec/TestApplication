// Seed script: creates edgecdec as admin + 2025 tournament data
// Run: cd ~/TestProjects/TestApplication && node seed.js

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "data", "app.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables if not exist (same as db.ts)
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
    scoring_settings TEXT NOT NULL DEFAULT '{}',
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
`);

// Create edgecdec as admin
const hash = bcrypt.hashSync("admin123", 10);
const existing = db.prepare("SELECT id FROM users WHERE username = 'edgecdec'").get();
let userId;
if (existing) {
  db.prepare("UPDATE users SET is_admin = 1 WHERE username = 'edgecdec'").run();
  userId = existing.id;
  console.log("edgecdec already exists — set as admin");
} else {
  const result = db.prepare("INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)").run("edgecdec", hash);
  userId = result.lastInsertRowid;
  console.log("Created edgecdec as admin (password: admin123)");
}

// 2025 bracket data
const bracketData = {
  regions: [
    { name: "East", teams: [
      {seed:1,name:"Duke"},{seed:2,name:"Alabama"},{seed:3,name:"Wisconsin"},{seed:4,name:"Arizona"},
      {seed:5,name:"Oregon"},{seed:6,name:"BYU"},{seed:7,name:"St. Marys"},{seed:8,name:"Mississippi St."},
      {seed:9,name:"Baylor"},{seed:10,name:"Vanderbilt"},{seed:11,name:"VCU"},{seed:12,name:"Liberty"},
      {seed:13,name:"Akron"},{seed:14,name:"Montana"},{seed:15,name:"Robert Morris"},{seed:16,name:"American"}
    ]},
    { name: "West", teams: [
      {seed:1,name:"Florida"},{seed:2,name:"St. Johns"},{seed:3,name:"Texas Tech"},{seed:4,name:"Maryland"},
      {seed:5,name:"Memphis"},{seed:6,name:"Missouri"},{seed:7,name:"Kansas"},{seed:8,name:"UConn"},
      {seed:9,name:"Boise St."},{seed:10,name:"Arkansas"},{seed:11,name:"Drake"},{seed:12,name:"Colorado St."},
      {seed:13,name:"Yale"},{seed:14,name:"Lipscomb"},{seed:15,name:"Omaha"},{seed:16,name:"Norfolk St."}
    ]},
    { name: "South", teams: [
      {seed:1,name:"Auburn"},{seed:2,name:"Michigan St."},{seed:3,name:"Iowa St."},{seed:4,name:"Texas A&M"},
      {seed:5,name:"Michigan"},{seed:6,name:"Ole Miss"},{seed:7,name:"Marquette"},{seed:8,name:"Louisville"},
      {seed:9,name:"Creighton"},{seed:10,name:"New Mexico"},{seed:11,name:"San Diego St."},{seed:12,name:"UC San Diego"},
      {seed:13,name:"Charleston"},{seed:14,name:"Troy"},{seed:15,name:"Bryant"},{seed:16,name:"Alabama St."}
    ]},
    { name: "Midwest", teams: [
      {seed:1,name:"Houston"},{seed:2,name:"Tennessee"},{seed:3,name:"Kentucky"},{seed:4,name:"Purdue"},
      {seed:5,name:"Clemson"},{seed:6,name:"Illinois"},{seed:7,name:"UCLA"},{seed:8,name:"Gonzaga"},
      {seed:9,name:"Georgia"},{seed:10,name:"Texas"},{seed:11,name:"NC State"},{seed:12,name:"McNeese"},
      {seed:13,name:"High Point"},{seed:14,name:"Wofford"},{seed:15,name:"SIU Edwardsville"},{seed:16,name:"SIUE"}
    ]}
  ]
};

// 2025 results
const results = {
  "East-0-0":"Duke","East-0-1":"Mississippi St.","East-0-2":"Oregon","East-0-3":"Arizona",
  "East-0-4":"BYU","East-0-5":"Wisconsin","East-0-6":"Vanderbilt","East-0-7":"Alabama",
  "East-1-0":"Duke","East-1-1":"Arizona","East-1-2":"Wisconsin","East-1-3":"Alabama",
  "East-2-0":"Duke","East-2-1":"Alabama","East-3-0":"Duke",
  "West-0-0":"Florida","West-0-1":"UConn","West-0-2":"Memphis","West-0-3":"Maryland",
  "West-0-4":"Missouri","West-0-5":"Texas Tech","West-0-6":"Kansas","West-0-7":"St. Johns",
  "West-1-0":"Florida","West-1-1":"Maryland","West-1-2":"Texas Tech","West-1-3":"St. Johns",
  "West-2-0":"Florida","West-2-1":"Texas Tech","West-3-0":"Florida",
  "South-0-0":"Auburn","South-0-1":"Louisville","South-0-2":"Michigan","South-0-3":"Texas A&M",
  "South-0-4":"Ole Miss","South-0-5":"Iowa St.","South-0-6":"Marquette","South-0-7":"Michigan St.",
  "South-1-0":"Auburn","South-1-1":"Michigan","South-1-2":"Iowa St.","South-1-3":"Michigan St.",
  "South-2-0":"Auburn","South-2-1":"Michigan St.","South-3-0":"Auburn",
  "Midwest-0-0":"Houston","Midwest-0-1":"Gonzaga","Midwest-0-2":"Clemson","Midwest-0-3":"Purdue",
  "Midwest-0-4":"Illinois","Midwest-0-5":"Kentucky","Midwest-0-6":"UCLA","Midwest-0-7":"Tennessee",
  "Midwest-1-0":"Houston","Midwest-1-1":"Purdue","Midwest-1-2":"Illinois","Midwest-1-3":"Tennessee",
  "Midwest-2-0":"Houston","Midwest-2-1":"Tennessee","Midwest-3-0":"Houston",
  "ff-4-0":"Florida","ff-4-1":"Houston","ff-5-0":"Florida"
};

// Insert tournament
const existingTourney = db.prepare("SELECT id FROM tournaments WHERE year = 2025").get();
if (existingTourney) {
  db.prepare("UPDATE tournaments SET bracket_data = ?, results_data = ? WHERE id = ?").run(
    JSON.stringify(bracketData), JSON.stringify(results), existingTourney.id
  );
  console.log("Updated existing 2025 tournament");
} else {
  db.prepare("INSERT INTO tournaments (name, year, bracket_data, results_data, lock_time) VALUES (?, ?, ?, ?, ?)").run(
    "NCAA Tournament 2025", 2025, JSON.stringify(bracketData), JSON.stringify(results), "2025-03-20T12:00:00Z"
  );
  console.log("Created 2025 tournament with bracket + results");
}

// Create "Everyone" group
const existingGroup = db.prepare("SELECT id FROM groups WHERE invite_code = 'everyone'").get();
if (!existingGroup) {
  const g = db.prepare("INSERT INTO groups (name, invite_code, created_by, max_brackets, scoring_settings) VALUES (?, ?, ?, ?, ?)").run(
    "Everyone", "everyone", userId, 5, JSON.stringify({ pointsPerRound: [1,2,4,8,16,32], upsetBonusPerRound: [0,0,0,0,0,0] })
  );
  db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(g.lastInsertRowid, userId);
  console.log("Created Everyone group");
}

console.log("Done! Login with username: edgecdec, password: admin123");
db.close();
