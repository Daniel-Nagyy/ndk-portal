// db.mjs — SQLite data layer for accounts, users, sessions, push subscriptions.
import Database from "better-sqlite3";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { encrypt, decrypt } from "./crypto.mjs";
dotenv.config();

const DB_PATH = process.env.DB_PATH || "ndk-portal.db";
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
`);

// --- lightweight migrations: add columns to existing DBs if missing ---
function addColumnIfMissing(table, column, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
}
addColumnIfMissing("accounts", "telegram_bot_token_enc", "TEXT");
addColumnIfMissing("accounts", "telegram_chat_id", "TEXT");

const genId = (prefix) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
const slugify = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ---------- Accounts ----------
export function createAccount(input) {
  const id = input.id ? slugify(input.id) : slugify(input.name) || genId("acct");
  db.prepare(`INSERT INTO accounts
    (id, name, geotab_server, geotab_database, geotab_username, geotab_password_enc,
     netradyne_email, netradyne_password_enc, netradyne_poll_ms,
     telegram_bot_token_enc, telegram_chat_id)
    VALUES (@id,@name,@geotab_server,@geotab_database,@geotab_username,@geotab_password_enc,
     @netradyne_email,@netradyne_password_enc,@netradyne_poll_ms,
     @telegram_bot_token_enc,@telegram_chat_id)`).run({
    id,
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
    geotabDatabase: a.geotab_database,
    hasGeotab: Boolean(a.geotab_username && a.geotab_password_enc),
    hasNetradyne: Boolean(a.netradyne_email && a.netradyne_password_enc),
    hasTelegram: Boolean(a.telegram_chat_id),
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

  // 2. Migrate the existing Mako Waves account from env, if present.
  if (process.env.GEOTAB_ACCOUNT_1_DATABASE || process.env.NETRADYNE_EMAIL) {
    const acct = createAccount({
      name: process.env.GEOTAB_ACCOUNT_1_NAME || "Mako Waves Distribution",
      geotabServer: process.env.GEOTAB_ACCOUNT_1_SERVER,
      geotabDatabase: process.env.GEOTAB_ACCOUNT_1_DATABASE,
      geotabUsername: process.env.GEOTAB_ACCOUNT_1_USERNAME,
      geotabPassword: process.env.GEOTAB_ACCOUNT_1_PASSWORD,
      netradyneEmail: process.env.NETRADYNE_EMAIL,
      netradynePassword: process.env.NETRADYNE_PASSWORD,
      netradynePollMs: Number(process.env.NETRADYNE_POLL_INTERVAL_MS) || 300000,
    });
    console.log(`Migrated account from env: ${acct.name} (${acct.id})`);
  }

  return { seeded: true };
}
