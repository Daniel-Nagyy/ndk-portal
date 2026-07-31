// db.mjs — SQLite data layer for accounts, users, sessions, push subscriptions.
import Database from "better-sqlite3";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { encrypt, decrypt } from "./crypto.mjs";
dotenv.config();

const DB_PATH = process.env.DB_PATH || "ndk-portal.db";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
const dbDir = dirname(DB_PATH);
if (dbDir && dbDir !== ".") {
  mkdirSync(dbDir, { recursive: true });
}
export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export const ROLES = ["superadmin", "owner", "manager", "dispatcher"];

db.exec(`
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  geotab_server TEXT,
  geotab_database TEXT,
  geotab_username TEXT,
  geotab_password_enc TEXT,
  netradyne_email TEXT,
  netradyne_password_enc TEXT,
  netradyne_poll_ms INTEGER DEFAULT 300000,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT,
  endpoint TEXT UNIQUE NOT NULL,
  sub_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recaps (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  daily_date TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS down_trucks (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  truck_number TEXT,
  issue TEXT,
  wo_number TEXT,
  down_date TEXT,
  status TEXT DEFAULT 'Down',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

// --- lightweight migrations: add columns to existing DBs if missing ---
function addColumnIfMissing(table, column, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
}
addColumnIfMissing("accounts", "telegram_bot_token_enc", "TEXT");
addColumnIfMissing("accounts", "telegram_chat_id", "TEXT");
addColumnIfMissing("accounts", "api_key", "TEXT");
// Truck Tracker asset fields (fleet roster: type, ownership, make, body, fuel, etc.)
for (const col of ["vehicle_type", "ownership", "make", "body", "fuel", "owner", "license", "vin"]) {
  addColumnIfMissing("down_trucks", col, "TEXT");
}

const genId = (prefix) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
const genApiKey = () => `ndk_${crypto.randomBytes(24).toString("base64url")}`;
const slugify = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Backfill an API key for any account missing one (extension authentication).
for (const a of db.prepare("SELECT id FROM accounts WHERE api_key IS NULL OR api_key = ''").all()) {
  db.prepare("UPDATE accounts SET api_key = ? WHERE id = ?").run(genApiKey(), a.id);
}

export function getAccountByApiKey(key) {
  if (!key) return null;
  return db.prepare("SELECT * FROM accounts WHERE api_key = ?").get(key) || null;
}

export function regenerateApiKey(accountId) {
  const key = genApiKey();
  db.prepare("UPDATE accounts SET api_key = ? WHERE id = ?").run(key, accountId);
  return key;
}

// ---------- Accounts ----------
export function createAccount(input) {
  const id = input.id ? slugify(input.id) : slugify(input.name) || genId("acct");
  db.prepare(`INSERT INTO accounts
    (id, name, geotab_server, geotab_database, geotab_username, geotab_password_enc,
     netradyne_email, netradyne_password_enc, netradyne_poll_ms,
     telegram_bot_token_enc, telegram_chat_id, api_key)
    VALUES (@id,@name,@geotab_server,@geotab_database,@geotab_username,@geotab_password_enc,
     @netradyne_email,@netradyne_password_enc,@netradyne_poll_ms,
     @telegram_bot_token_enc,@telegram_chat_id,@api_key)`).run({
    id,
    api_key: genApiKey(),
    name: input.name,
    geotab_server: input.geotabServer || "my.geotab.com",
    geotab_database: input.geotabDatabase || null,
    geotab_username: input.geotabUsername || null,
    geotab_password_enc: encrypt(input.geotabPassword || ""),
    netradyne_email: input.netradyneEmail || null,
    netradyne_password_enc: encrypt(input.netradynePassword || ""),
    netradyne_poll_ms: Number(input.netradynePollMs) || 300000,
    telegram_bot_token_enc: input.telegramBotToken ? encrypt(input.telegramBotToken) : null,
    telegram_chat_id: input.telegramChatId || null,
  });
  return getAccount(id);
}

export function getAccount(id) {
  return db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) || null;
}

// Update selected fields; passwords are re-encrypted. Only provided keys change.
export function updateAccount(id, input) {
  const a = getAccount(id);
  if (!a) throw new Error(`Unknown account: ${id}`);
  const next = {
    name: input.name ?? a.name,
    geotab_server: input.geotabServer ?? a.geotab_server,
    geotab_database: input.geotabDatabase ?? a.geotab_database,
    geotab_username: input.geotabUsername ?? a.geotab_username,
    geotab_password_enc: input.geotabPassword != null ? encrypt(input.geotabPassword) : a.geotab_password_enc,
    netradyne_email: input.netradyneEmail ?? a.netradyne_email,
    netradyne_password_enc: input.netradynePassword != null ? encrypt(input.netradynePassword) : a.netradyne_password_enc,
    netradyne_poll_ms: input.netradynePollMs != null ? Number(input.netradynePollMs) : a.netradyne_poll_ms,
    telegram_bot_token_enc: input.telegramBotToken != null ? (input.telegramBotToken ? encrypt(input.telegramBotToken) : null) : a.telegram_bot_token_enc,
    telegram_chat_id: input.telegramChatId ?? a.telegram_chat_id,
    id,
  };
  db.prepare(`UPDATE accounts SET name=@name, geotab_server=@geotab_server, geotab_database=@geotab_database,
    geotab_username=@geotab_username, geotab_password_enc=@geotab_password_enc,
    netradyne_email=@netradyne_email, netradyne_password_enc=@netradyne_password_enc,
    netradyne_poll_ms=@netradyne_poll_ms, telegram_bot_token_enc=@telegram_bot_token_enc,
    telegram_chat_id=@telegram_chat_id WHERE id=@id`).run(next);
  return getAccount(id);
}

export function listAccounts() {
  return db.prepare("SELECT * FROM accounts ORDER BY name").all();
}

// Delete an account and everything tied to it (users, their sessions, push subs).
export const deleteAccount = db.transaction((id) => {
  const acct = getAccount(id);
  if (!acct) throw new Error(`Unknown account: ${id}`);
  const users = db.prepare("SELECT id FROM users WHERE account_id = ?").all(id);
  for (const u of users) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
  db.prepare("DELETE FROM push_subscriptions WHERE account_id = ?").run(id);
  for (const u of users) db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(u.id);
  db.prepare("DELETE FROM users WHERE account_id = ?").run(id);
  db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
  return { id, deletedUsers: users.length };
});

// Decrypted credentials for the pollers (never send to the client).
export function getAccountCredentials(id) {
  const a = getAccount(id);
  if (!a) return null;
  return {
    id: a.id,
    name: a.name,
    geotab: {
      server: a.geotab_server,
      database: a.geotab_database,
      username: a.geotab_username,
      password: decrypt(a.geotab_password_enc),
    },
    netradyne: {
      email: a.netradyne_email,
      password: decrypt(a.netradyne_password_enc),
      pollMs: a.netradyne_poll_ms,
    },
    telegram: {
      botToken: a.telegram_bot_token_enc ? decrypt(a.telegram_bot_token_enc) : "",
      chatId: a.telegram_chat_id || "",
    },
  };
}

// Safe public shape (no secrets).
export function publicAccount(a) {
  if (!a) return null;
  return {
    id: a.id,
    name: a.name,
    geotabServer: a.geotab_server,
    geotabDatabase: a.geotab_database,
    geotabUsername: a.geotab_username,      // non-secret identifier (email); password never exposed
    netradyneEmail: a.netradyne_email,      // non-secret identifier; password never exposed
    telegramChatId: a.telegram_chat_id,
    hasGeotab: Boolean(a.geotab_username && a.geotab_password_enc),
    hasNetradyne: Boolean(a.netradyne_email && a.netradyne_password_enc),
    hasTelegram: Boolean(a.telegram_chat_id),
    // The account's own extension API key (shown to its owner/dispatchers to configure
    // the browser extension). It only ever accompanies the user's own account.
    apiKey: a.api_key || null,
  };
}

// ---------- Users ----------
export function createUser(input) {
  const id = genId("user");
  const hash = bcrypt.hashSync(String(input.password), 10);
  if (!ROLES.includes(input.role)) throw new Error(`Invalid role: ${input.role}`);
  db.prepare(`INSERT INTO users (id, account_id, email, name, role, password_hash)
    VALUES (?,?,?,?,?,?)`).run(
    id, input.accountId || null, String(input.email).toLowerCase(), input.name || "", input.role, hash
  );
  return getUserById(id);
}

export function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) || null;
}

export function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).toLowerCase()) || null;
}

export function listUsers(accountId) {
  if (accountId) return db.prepare("SELECT * FROM users WHERE account_id = ? ORDER BY name").all(accountId);
  return db.prepare("SELECT * FROM users ORDER BY account_id, name").all();
}

export function verifyPassword(user, password) {
  if (!user) return false;
  return bcrypt.compareSync(String(password), user.password_hash);
}

export function changePassword(userId, newPassword) {
  const hash = bcrypt.hashSync(String(newPassword), 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);
}

export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, accountId: u.account_id, email: u.email, name: u.name, role: u.role };
}

// ---------- Sessions ----------
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)").run(token, userId, expires);
  return { token, expires };
}

export function getSessionUser(token) {
  if (!token) return null;
  const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now')`).get(token);
  return row || null;
}

export function deleteSession(token) {
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// ---------- Push subscriptions ----------
export function saveSubscription(userId, accountId, sub) {
  db.prepare(`INSERT INTO push_subscriptions (user_id, account_id, endpoint, sub_json)
    VALUES (?,?,?,?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id, account_id=excluded.account_id, sub_json=excluded.sub_json`)
    .run(userId, accountId || null, sub.endpoint, JSON.stringify(sub));
}

export function deleteSubscriptionByEndpoint(endpoint) {
  db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}

export function getSubscriptionsForAccount(accountId) {
  return db.prepare("SELECT * FROM push_subscriptions WHERE account_id = ?").all(accountId)
    .map((r) => JSON.parse(r.sub_json));
}

export function getSubscriptionsForUser(userId) {
  return db.prepare("SELECT * FROM push_subscriptions WHERE user_id = ?").all(userId)
    .map((r) => JSON.parse(r.sub_json));
}

// Diagnostics: every subscription with its account + owning user's email.
export function listAllSubscriptions() {
  return db.prepare(
    `SELECT s.account_id AS accountId, s.endpoint AS endpoint, u.email AS email
     FROM push_subscriptions s LEFT JOIN users u ON u.id = s.user_id
     ORDER BY s.account_id`
  ).all();
}

// ---------- First-run bootstrap ----------
export function bootstrap() {
  const userCount = db.prepare("SELECT COUNT(*) c FROM users").get().c;
  if (userCount > 0) return { seeded: false };

  // 1. Platform superadmin from env.
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  if (email && password) {
    createUser({ accountId: null, email, name: process.env.SUPERADMIN_NAME || "Admin", role: "superadmin", password });
    console.log(`Seeded superadmin: ${email}`);
  } else {
    console.warn("No SUPERADMIN_EMAIL/PASSWORD set — no admin user created.");
  }

  // 2. Migrate accounts from env (supports multiple accounts: GEOTAB_ACCOUNT_1_*, GEOTAB_ACCOUNT_2_*, etc.)
  for (let i = 1; i <= 10; i++) {
    const prefix = `GEOTAB_ACCOUNT_${i}_`;
    const netradyneprefix = i === 1 ? "NETRADYNE_" : `NETRADYNE_${i}_`;

    if (process.env[`${prefix}DATABASE`] || process.env[`${netradyneprefix}EMAIL`]) {
      const acct = createAccount({
        name: process.env[`${prefix}NAME`] || `Account ${i}`,
        geotabServer: process.env[`${prefix}SERVER`],
        geotabDatabase: process.env[`${prefix}DATABASE`],
        geotabUsername: process.env[`${prefix}USERNAME`],
        geotabPassword: process.env[`${prefix}PASSWORD`],
        netradyneEmail: process.env[`${netradyneprefix}EMAIL`],
        netradynePassword: process.env[`${netradyneprefix}PASSWORD`],
        netradynePollMs: Number(process.env[`${netradyneprefix}POLL_INTERVAL_MS`]) || 300000,
      });
      console.log(`Migrated account from env: ${acct.name} (${acct.id})`);
    }
  }

  return { seeded: true };
}

// ---------- Recaps ----------
export function getRecaps(accountId = null) {
  if (accountId) {
    const rows = db.prepare("SELECT * FROM recaps WHERE client_id = ?").all(accountId);
    return rows.map(r => JSON.parse(r.payload));
  }
  const rows = db.prepare("SELECT * FROM recaps").all();
  return rows.map(r => JSON.parse(r.payload));
}

// ---------- Down trucks (Truck Tracker) ----------
function rowToDownTruck(r) {
  return {
    id: r.id, accountId: r.account_id, truckNumber: r.truck_number || "",
    issue: r.issue || "", woNumber: r.wo_number || "", downDate: r.down_date || "",
    status: r.status || "Down", updatedAt: r.updated_at,
    vehicleType: r.vehicle_type || "", ownership: r.ownership || "", make: r.make || "",
    body: r.body || "", fuel: r.fuel || "", owner: r.owner || "",
    license: r.license || "", vin: r.vin || "",
  };
}

export function listDownTrucks(accountId = null) {
  const rows = accountId
    ? db.prepare("SELECT * FROM down_trucks WHERE account_id = ? ORDER BY down_date DESC, created_at DESC").all(accountId)
    : db.prepare("SELECT * FROM down_trucks ORDER BY down_date DESC, created_at DESC").all();
  return rows.map(rowToDownTruck);
}

export function getDownTruckById(id) {
  const r = db.prepare("SELECT * FROM down_trucks WHERE id = ?").get(id);
  return r ? rowToDownTruck(r) : null;
}

export function upsertDownTruck(t) {
  db.prepare(`
    INSERT INTO down_trucks (id, account_id, truck_number, issue, wo_number, down_date, status,
      vehicle_type, ownership, make, body, fuel, owner, license, vin, updated_at)
    VALUES (@id, @account_id, @truck_number, @issue, @wo_number, @down_date, @status,
      @vehicle_type, @ownership, @make, @body, @fuel, @owner, @license, @vin, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      account_id = excluded.account_id, truck_number = excluded.truck_number,
      issue = excluded.issue, wo_number = excluded.wo_number, down_date = excluded.down_date,
      status = excluded.status, vehicle_type = excluded.vehicle_type, ownership = excluded.ownership,
      make = excluded.make, body = excluded.body, fuel = excluded.fuel, owner = excluded.owner,
      license = excluded.license, vin = excluded.vin, updated_at = datetime('now')
  `).run({
    id: t.id, account_id: t.accountId, truck_number: t.truckNumber || "",
    issue: t.issue || "", wo_number: t.woNumber || "", down_date: t.downDate || "",
    status: t.status || "Active",
    vehicle_type: t.vehicleType || "", ownership: t.ownership || "", make: t.make || "",
    body: t.body || "", fuel: t.fuel || "", owner: t.owner || "",
    license: t.license || "", vin: t.vin || "",
  });
  return getDownTruckById(t.id);
}

export function deleteDownTruck(id) {
  return db.prepare("DELETE FROM down_trucks WHERE id = ?").run(id).changes;
}

// Read-only snapshot of what's actually stored (for the admin DB overview page).
export function getDbOverview() {
  const count = (t) => {
    try { return db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c; } catch (_) { return null; }
  };
  return {
    dbPath: DB_PATH,
    tables: {
      accounts: count("accounts"),
      users: count("users"),
      sessions: count("sessions"),
      push_subscriptions: count("push_subscriptions"),
      recaps: count("recaps"),
      down_trucks: count("down_trucks"),
    },
    accounts: listAccounts().map((a) => ({ id: a.id, name: a.name })),
    recapsByDay: db.prepare(
      "SELECT daily_date AS date, client_id AS account, COUNT(*) AS rows FROM recaps GROUP BY daily_date, client_id ORDER BY daily_date DESC LIMIT 30"
    ).all(),
    downTrucksByAccount: db.prepare(
      "SELECT account_id AS account, COUNT(*) AS rows FROM down_trucks GROUP BY account_id"
    ).all(),
  };
}

export function getRecapById(id) {
  const r = db.prepare("SELECT * FROM recaps WHERE id = ?").get(id);
  return r ? { id: r.id, clientId: r.client_id, dailyDate: r.daily_date, ...JSON.parse(r.payload) } : null;
}

export function deleteRecap(id) {
  return db.prepare("DELETE FROM recaps WHERE id = ?").run(id).changes;
}

export function syncRecaps(recapsArray) {
  const stmt = db.prepare(`
    INSERT INTO recaps (id, client_id, daily_date, payload, updated_at)
    VALUES (@id, @client_id, @daily_date, @payload, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      client_id = excluded.client_id,
      daily_date = excluded.daily_date,
      payload = excluded.payload,
      updated_at = datetime('now')
  `);

  const tx = db.transaction((recs) => {
    for (const r of recs) {
      if (!r.id || !r.clientId || !r.dailyDate) continue;
      stmt.run({
        id: r.id,
        client_id: r.clientId,
        daily_date: r.dailyDate,
        payload: JSON.stringify(r)
      });
    }
  });

  tx(recapsArray);
}
