import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer as createHttpsServer } from "node:https";
import { createServer as createHttpServer } from "node:http";
import { readFileSync } from "node:fs";import { extname, join, normalize } from "node:path";
import dotenv from "dotenv";
import { processHosTelegramAlerts, sendTelegramMessage } from "./hos-alerts.mjs";
import { startPolling, getNetradyneStatus } from './netradyne/poller.js';
import { getAlerts, updateAlertStatus, pruneToAccounts } from './netradyne/store.js';
import { getAuthenticatedContext } from './netradyne/auth.js';
import { pushConfigured, getVapidPublicKey, removeSubscription, subscriptionCount } from './push.mjs';
import {
  bootstrap, getUserByEmail, verifyPassword, createSession, deleteSession,
  publicUser, getAccount, publicAccount as dbPublicAccount, listAccounts, createAccount, updateAccount, deleteAccount,
  listUsers, createUser, saveSubscription, changePassword, getUserById, getAccountCredentials,
  getSubscriptionsForAccount, listAllSubscriptions, deleteSubscriptionByEndpoint,
  getRecaps, syncRecaps, getRecapById, deleteRecap, getDbOverview,
  listDownTrucks, getDownTruckById, upsertDownTruck, deleteDownTruck,
  getAccountByApiKey, regenerateApiKey,
  getScorecard, saveScorecard
} from './db.mjs';
import { setLateItems, getLateItems, getIngestStatus } from './ingest-store.mjs';

// Per-account dedupe for live extension alerts (accountId:dedupeKey -> lastSentMs).
const alertDedupe = new Map();
import { getAuthUser, getSessionToken, sessionCookie, clearSessionCookie, canAccessAccount } from './auth.mjs';
import { computeReadiness } from './geotab.mjs';
import { startHosEngine } from './hos-engine.mjs';
import { notifyAccount, sendPushToAccount } from './notify.mjs';
dotenv.config();

// Seed superadmin + migrate env account into the DB on first run.
try { bootstrap(); } catch (e) { console.error('DB bootstrap failed:', e.message || e); }

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

// Run plain HTTP when USE_HTTP=1 (behind a TLS-terminating tunnel or cloud host),
// otherwise HTTPS with the local self-signed cert for LAN/localhost use.
const certAvailable = existsSync("localhost+2.pem") && existsSync("localhost+2-key.pem");
const useHttp = process.env.USE_HTTP === "1" || !certAvailable;
const httpsOptions = useHttp ? null : {
  key: readFileSync("localhost+2-key.pem"),
  cert: readFileSync("localhost+2.pem")
};
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const GEOTAB_SERVER = (process.env.GEOTAB_SERVER || "my.geotab.com").trim();
const GEOTAB_ACCOUNTS = loadConfiguredAccounts();

let latestHosData = [];
let latestLateItemsData = [];

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function slugify(value, fallback) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function normalizeAccount(raw, fallbackId) {
  if (!raw || typeof raw !== "object") return null;
  const database = String(raw.database || raw.GEOTAB_DATABASE || "").trim();
  const username = String(raw.username || raw.userName || raw.GEOTAB_USERNAME || "").trim();
  const password = String(raw.password || raw.password || raw.GEOTAB_PASSWORD || "").trim();
  if (!database || !username || !password) return null;
  const name = String(raw.name || raw.label || database || fallbackId).trim();
  return {
    id: slugify(raw.id || name || database, fallbackId),
    name,
    server: String(raw.server || raw.GEOTAB_SERVER || GEOTAB_SERVER).trim(),
    database,
    username,
    password
  };
}

function loadConfiguredAccounts() {
  const accounts = [];
  const seen = new Set();
  const addAccount = (account) => {
    if (!account) return;
    let id = account.id;
    let suffix = 2;
    while (seen.has(id)) {
      id = `${account.id}-${suffix}`;
      suffix += 1;
    }
    seen.add(id);
    accounts.push({ ...account, id });
  };

  addAccount(normalizeAccount({
    id: "default",
    name: process.env.GEOTAB_ACCOUNT_NAME || process.env.GEOTAB_DATABASE || "Default Account",
    server: process.env.GEOTAB_SERVER,
    database: process.env.GEOTAB_DATABASE,
    username: process.env.GEOTAB_USERNAME,
    password: process.env.GEOTAB_PASSWORD
  }, "default"));

  if (process.env.GEOTAB_ACCOUNTS) {
    try {
      const parsed = JSON.parse(process.env.GEOTAB_ACCOUNTS);
      if (Array.isArray(parsed)) {
        parsed.forEach((account, index) => addAccount(normalizeAccount(account, `account-${index + 1}`)));
      }
    } catch (error) {
      console.warn("Failed to parse GEOTAB_ACCOUNTS", error.message || error);
    }
  }

  for (let i = 1; i <= 10; i += 1) {
    addAccount(normalizeAccount({
      id: process.env[`GEOTAB_ACCOUNT_${i}_ID`],
      name: process.env[`GEOTAB_ACCOUNT_${i}_NAME`],
      server: process.env[`GEOTAB_ACCOUNT_${i}_SERVER`],
      database: process.env[`GEOTAB_ACCOUNT_${i}_DATABASE`],
      username: process.env[`GEOTAB_ACCOUNT_${i}_USERNAME`],
      password: process.env[`GEOTAB_ACCOUNT_${i}_PASSWORD`]
    }, `account-${i}`));
  }

  return accounts;
}

function publicAccount(account) {
  return {
    id: account.id,
    name: account.name,
    server: account.server,
    database: account.database
  };
}

function simplifyError(err) {
  if (!err) return "Unknown error";
  const msg = String(err.message || err);
  if (msg.includes("fetch failed")) return "Network/API request failed";
  return msg;
}

// NOTE: Geotab auth + HOS readiness logic now lives in geotab.mjs (computeReadiness),
// used by both the /api/drivers-readiness endpoint and the HOS alert engine.

const requestHandler = (req, res) => {  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const sendJson = (status, obj, extraHeaders = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...extraHeaders });
    res.end(JSON.stringify(obj));
  };

  // ---------- Auth ----------
  if (req.url === '/api/login' && req.method === 'POST') {
    (async () => {
      try {
        const body = await readJsonBody(req);
        const user = getUserByEmail(body.email || '');
        if (!user || !verifyPassword(user, body.password || '')) {
          return sendJson(401, { success: false, error: 'Invalid email or password' });
        }
        const { token, expires } = createSession(user.id);
        const account = user.account_id ? dbPublicAccount(getAccount(user.account_id)) : null;
        sendJson(200, { success: true, user: publicUser(user), account }, { 'Set-Cookie': sessionCookie(token, expires) });
      } catch (error) {
        sendJson(500, { success: false, error: simplifyError(error) });
      }
    })();
    return;
  }

  if (req.url === '/api/logout' && req.method === 'POST') {
    deleteSession(getSessionToken(req));
    sendJson(200, { success: true }, { 'Set-Cookie': clearSessionCookie() });
    return;
  }

  if (req.url === '/api/me' && req.method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJson(200, { success: true, user: null });
    const account = user.account_id ? dbPublicAccount(getAccount(user.account_id)) : null;
    sendJson(200, { success: true, user: publicUser(user), account });
    return;
  }

  if (req.url === '/api/change-password' && req.method === 'POST') {
    (async () => {
      try {
        const user = getAuthUser(req);
        if (!user) return sendJson(401, { success: false, error: 'Not authenticated' });
        const body = await readJsonBody(req);
        if (!verifyPassword(user, body.currentPassword || '')) {
          return sendJson(400, { success: false, error: 'Current password is incorrect' });
        }
        if (!body.newPassword || String(body.newPassword).length < 6) {
          return sendJson(400, { success: false, error: 'New password must be at least 6 characters' });
        }
        changePassword(user.id, body.newPassword);
        sendJson(200, { success: true });
      } catch (error) {
        sendJson(500, { success: false, error: simplifyError(error) });
      }
    })();
    return;
  }

  // ---------- Admin: accounts & users ----------
  if (req.url === '/api/admin/accounts' && req.method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJson(401, { success: false, error: 'Not authenticated' });
    const accts = user.role === 'superadmin'
      ? listAccounts()
      : [getAccount(user.account_id)].filter(Boolean);
    sendJson(200, { success: true, accounts: accts.map(dbPublicAccount) });
    return;
  }

  if (req.url === '/api/admin/accounts' && req.method === 'POST') {
    (async () => {
      try {
        const user = getAuthUser(req);
        if (!user || user.role !== 'superadmin') return sendJson(403, { success: false, error: 'Superadmin only' });
        const body = await readJsonBody(req);
        if (!body.name) return sendJson(400, { success: false, error: 'name required' });
        const acct = createAccount(body);
        sendJson(200, { success: true, account: dbPublicAccount(acct) });
      } catch (error) {
        sendJson(500, { success: false, error: simplifyError(error) });
      }
    })();
    return;
  }

  if (req.url === '/api/admin/accounts' && (req.method === 'PUT' || req.method === 'PATCH')) {
    (async () => {
      try {
        const user = getAuthUser(req);
        if (!user || user.role !== 'superadmin') return sendJson(403, { success: false, error: 'Superadmin only' });
        const body = await readJsonBody(req);
        if (!body.id) return sendJson(400, { success: false, error: 'id required' });
        // updateAccount only changes provided keys; blank passwords are left untouched.
        const acct = updateAccount(body.id, body);
        sendJson(200, { success: true, account: dbPublicAccount(acct) });
      } catch (error) {
        sendJson(500, { success: false, error: simplifyError(error) });
      }
    })();
    return;
  }

  if (req.url === '/api/admin/accounts' && req.method === 'DELETE') {
    (async () => {
      try {
        const user = getAuthUser(req);
        if (!user || user.role !== 'superadmin') return sendJson(403, { success: false, error: 'Superadmin only' });
        const body = await readJsonBody(req);
        if (!body.id) return sendJson(400, { success: false, error: 'id required' });
        const result = deleteAccount(body.id);
        sendJson(200, { success: true, ...result });
      } catch (error) {
        sendJson(500, { success: false, error: simplifyError(error) });
      }
    })();
    return;
  }

  if (req.url && req.url.startsWith('/api/admin/users')) {
    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return sendJson(401, { success: false, error: 'Not authenticated' });
      const accountId = u.searchParams.get('accountId') || user.account_id;
      if (!canAccessAccount(user, accountId)) return sendJson(403, { success: false, error: 'Forbidden' });
      sendJson(200, { success: true, users: listUsers(accountId).map(publicUser) });
      return;
    }
    if (req.method === 'POST') {
      (async () => {
        try {
          const user = getAuthUser(req);
          if (!user) return sendJson(401, { success: false, error: 'Not authenticated' });
          const body = await readJsonBody(req);
          const accountId = body.accountId || user.account_id;
          // superadmin: any account; owner/manager: only their own account.
          const allowed = user.role === 'superadmin' || (['owner', 'manager'].includes(user.role) && user.account_id === accountId);
          if (!allowed) return sendJson(403, { success: false, error: 'Forbidden' });
          if (body.role === 'superadmin' && user.role !== 'superadmin') return sendJson(403, { success: false, error: 'Cannot create superadmin' });
          if (!body.email || !body.password || !body.role) return sendJson(400, { success: false, error: 'email, password, role required' });
          const created = createUser({ ...body, accountId });
          sendJson(200, { success: true, user: publicUser(created) });
        } catch (error) {
          sendJson(400, { success: false, error: simplifyError(error) });
        }
      })();
      return;
    }
  }

  // API Endpoints — HOS stays the Portal's own Geotab integration (unchanged).
  if (req.url === '/api/hos') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: latestHosData }));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (Array.isArray(parsed)) latestHosData = parsed;
          else if (parsed.hosItems) latestHosData = parsed.hosItems;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // ---------- Extension ingestion (Relay late items only; API-key authenticated) ----------
  if (req.url && req.url.startsWith('/api/ingest/')) {
    const iurl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (iurl.pathname === '/api/ingest/status' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return sendJson(401, { success: false, error: 'Not authenticated' });
      if (user.role === 'superadmin') {
        const out = listAccounts().map((a) => ({ account: a.name, id: a.id, ...getIngestStatus(a.id) }));
        return sendJson(200, { success: true, accounts: out });
      }
      return sendJson(200, { success: true, accounts: [{ id: user.account_id, ...getIngestStatus(user.account_id) }] });
    }
    (async () => {
      try {
        const apiKey = req.headers['x-api-key'] || iurl.searchParams.get('apiKey');
        const account = getAccountByApiKey(apiKey);
        if (!account) return sendJson(401, { success: false, error: 'Invalid or missing API key' });
        const body = await readJsonBody(req);
        if (iurl.pathname === '/api/ingest/late-items') {
          const items = Array.isArray(body) ? body : (body.lateItems || body.items || []);
          setLateItems(account.id, items);
          return sendJson(200, { success: true, account: account.id, count: items.length });
        }
        if (iurl.pathname === '/api/ingest/alert') {
          // Push a live extension-detected alert (e.g. bobtail-not-cleared) to
          // every device/Telegram on this account (dispatch + owner).
          const title = String(body.title || 'Dispatch alert').slice(0, 120);
          const alertBody = String(body.body || '').slice(0, 500);
          const dedupe = String(body.dedupe || body.tag || title).slice(0, 200);
          const cooldownMs = 9 * 60 * 1000;
          const now = Date.now();
          const last = alertDedupe.get(`${account.id}:${dedupe}`);
          if (last && now - last < cooldownMs) {
            return sendJson(200, { success: true, account: account.id, deduped: true });
          }
          alertDedupe.set(`${account.id}:${dedupe}`, now);
          const delivery = await notifyAccount(account.id, {
            title,
            body: alertBody,
            tag: dedupe,
            critical: body.critical !== false,
            url: '/',
            telegramText: `${title}\n${alertBody}`,
            push: body.push !== false, // arrival/departure send push:false → Telegram only
          });
          return sendJson(200, { success: true, account: account.id, accountName: account.name, delivery });
        }
        return sendJson(404, { success: false, error: 'Unknown ingest endpoint' });
      } catch (error) {
        sendJson(500, { success: false, error: simplifyError(error) });
      }
    })();
    return;
  }



  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  // Test push + Telegram for the logged-in user's OWN account (real routing path).
  // /api/test-alert?type=hos|netradyne&critical=1
  if (url.pathname === '/api/test-alert') {
    (async () => {
      try {
        // Two ways to target an account:
        //  1) ?apiKey=<account key>  → no login needed (shareable test URL per account)
        //  2) logged in: your own account, or superadmin via ?accountId=<id>
        let accountId = null;
        const keyParam = url.searchParams.get('apiKey') || url.searchParams.get('key');
        if (keyParam) {
          const acct = getAccountByApiKey(keyParam);
          if (!acct) return sendJson(401, { success: false, error: 'Invalid API key' });
          accountId = acct.id;
        } else {
          const authUser = getAuthUser(req);
          if (!authUser) return sendJson(401, { success: false, error: 'Log in, or pass ?apiKey=<account key>' });
          const requested = url.searchParams.get('accountId');
          accountId = (requested && (authUser.role === 'superadmin' || authUser.account_id === requested))
            ? requested
            : authUser.account_id;
        }
        if (!accountId) return sendJson(400, { success: false, error: 'No account. Pass ?apiKey=<key> or ?accountId=<id> (superadmin).' });
        const type = (url.searchParams.get('type') || 'hos').toLowerCase();
        const critical = url.searchParams.get('critical') !== '0';
        const nowEt = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

        let payload;
        if (type === 'netradyne') {
          payload = {
            title: `${critical ? '🚨 Severe' : '⚠️ Moderate'} Driver Drowsiness`,
            body: `Test Driver — Vehicle 000000 · ${nowEt}`,
            tag: 'test-netradyne',
            critical,
            telegramText: `${critical ? '🚨' : '⚠️'} Netradyne TEST (${critical ? 'Severe' : 'Moderate'})\nEvent: Driver Drowsiness\nDriver: Test Driver\nVehicle: 000000\nTime: ${nowEt}`,
          };
        } else {
          payload = {
            title: `${critical ? '🚨 HOS CRITICAL' : '⏰ HOS Warning'} — Test Driver`,
            body: critical ? 'Break runs out in 8 min (0:08 left). Act now.' : 'Break: 0:45 left (~45 min).',
            tag: 'test-hos',
            critical,
            telegramText: `${critical ? '🚨 HOS CRITICAL' : '⏰ HOS Warning'} TEST\nDriver: Test Driver\nBreak: ${critical ? '8' : '45'} min left`,
          };
        }
        const subs = getSubscriptionsForAccount(accountId).length;
        const result = await notifyAccount(accountId, payload);
        sendJson(200, { success: true, account: accountId, deviceSubscriptions: subs, ...result });
      } catch (error) {
        sendJson(500, { success: false, error: simplifyError(error) });
      }
    })();
    return;
  }

  // Diagnostics: which device (endpoint) is subscribed under which account.
  // Production readiness snapshot (superadmin): is push/data/telegram wired?
  if (url.pathname === '/api/health' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'superadmin') return sendJson(403, { success: false, error: 'Superadmin only' });
    const dbPath = process.env.DB_PATH || 'ndk-portal.db';
    const health = {
      pushConfigured: pushConfigured(),                       // VAPID keys present
      encryptionKeySet: Boolean(process.env.APP_ENCRYPTION_KEY),
      dbPath,
      dbOnVolume: dbPath.startsWith('/') && !dbPath.startsWith('/app'), // heuristic: absolute, not the code dir
      telegramGlobalConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      accounts: listAccounts().map((a) => ({
        name: a.name,
        id: a.id,
        pushSubscribers: getSubscriptionsForAccount(a.id).length,
        hasTelegram: Boolean(a.telegram_chat_id),
        hasNetradyne: Boolean(a.netradyne_email),
        hasGeotab: Boolean(a.geotab_username),
      })),
    };
    return sendJson(200, { success: true, health });
  }

  // What's actually stored in the database (on the Railway volume). Superadmin.
  if (url.pathname === '/api/admin/db-overview' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'superadmin') return sendJson(403, { success: false, error: 'Superadmin only' });
    return sendJson(200, { success: true, overview: getDbOverview() });
  }

  if (url.pathname === '/api/push/debug' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'superadmin') return sendJson(403, { success: false, error: 'Superadmin only' });
    const subs = listAllSubscriptions().map((s) => ({
      account: s.accountId,
      user: s.email,
      endpoint: `${String(s.endpoint).slice(0, 55)}…`,
    }));
    const byAccount = {};
    for (const s of subs) byAccount[s.account || 'null'] = (byAccount[s.account || 'null'] || 0) + 1;
    sendJson(200, { success: true, total: subs.length, byAccount, fileStore: subscriptionCount(), subscriptions: subs });
    return;
  }

  // Cleanup: remove a subscription by endpoint (superadmin), e.g. a mis-tagged one.
  if (url.pathname === '/api/push/remove' && req.method === 'POST') {
    (async () => {
      try {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.role !== 'superadmin') return sendJson(403, { success: false, error: 'Superadmin only' });
        const body = await readJsonBody(req);
        const endpoint = body.endpoint;
        if (!endpoint) return sendJson(400, { success: false, error: 'endpoint required' });
        deleteSubscriptionByEndpoint(endpoint);
        removeSubscription(endpoint); // also drop from the legacy file store
        sendJson(200, { success: true });
      } catch (error) {
        sendJson(500, { success: false, error: simplifyError(error) });
      }
    })();
    return;
  }

  if (url.pathname === '/api/notify' && req.method === 'POST') {
    (async () => {
      try {
        const body = await readJsonBody(req);
        const text = body.text || '';
        if (!text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing text' }));
          return;
        }
        const result = await sendTelegramMessage(text);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('Notify error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: simplifyError(error) }));
      }
    })();
    return;
  }
  // ---------- Web Push API ----------
  if (url.pathname === '/api/push/vapid-public-key' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, configured: pushConfigured(), key: getVapidPublicKey() }));
    return;
  }

  if (url.pathname === '/api/push/subscribe' && req.method === 'POST') {
    (async () => {
      try {
        const body = await readJsonBody(req);
        const sub = body.subscription || body;
        // Subscriptions are strictly account-scoped: a device must be tied to the
        // logged-in user's account so alerts never cross accounts.
        const user = getAuthUser(req);
        if (!user) return sendJson(401, { success: false, error: 'Log in before enabling notifications' });
        if (!sub || !sub.endpoint) return sendJson(400, { success: false, error: 'Invalid subscription' });
        saveSubscription(user.id, user.account_id, sub);
        sendJson(200, { success: true, account: user.account_id });
      } catch (error) {
        sendJson(500, { success: false, error: simplifyError(error) });
      }
    })();
    return;
  }

  if (url.pathname === '/api/push/unsubscribe' && req.method === 'POST') {
    (async () => {
      try {
        const body = await readJsonBody(req);
        const endpoint = body.endpoint || body.subscription?.endpoint;
        const result = removeSubscription(endpoint);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: simplifyError(error) }));
      }
    })();
    return;
  }

  if (url.pathname === '/api/push/test' && req.method === 'POST') {
    (async () => {
      try {
        // Account-scoped: only sends to the logged-in user's own account.
        const user = getAuthUser(req);
        if (!user || !user.account_id) return sendJson(401, { success: false, error: 'Log in as an account user' });
        const body = await readJsonBody(req);
        const result = await sendPushToAccount(user.account_id, {
          title: body.title || 'NDK test alert',
          body: body.body || 'If you can see this with the app closed, push works.',
          requireInteraction: true,
          url: '/index.html',
        });
        sendJson(200, { success: true, account: user.account_id, ...result });
      } catch (error) {
        sendJson(500, { success: false, error: simplifyError(error) });
      }
    })();
    return;
  }

  // ---------- Recaps ----------
  if (url.pathname === '/api/recaps' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    if (!authUser) {
      res.writeHead(401);
      return res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
    }
    
    // Admins see all recaps. Owners/dispatchers see only their account's recaps (if tied to one).
    const filterAccountId = (authUser.role === "superadmin" || authUser.role === "admin") ? null : authUser.account_id;
    const recaps = getRecaps(filterAccountId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, recaps }));
    return;
  }

  if (url.pathname === '/api/recaps/sync' && req.method === 'POST') {
    (async () => {
      try {
        const authUser = getAuthUser(req);
        if (!authUser) {
          res.writeHead(401);
          return res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
        }
        
        const body = await readJsonBody(req);
        if (body && Array.isArray(body.recaps)) {
          // If the user isn't an admin, enforce their account_id
          const recsToSync = body.recaps.map(r => {
            if (authUser.role !== "superadmin" && authUser.role !== "admin") {
              r.clientId = authUser.account_id;
            }
            return r;
          });
          syncRecaps(recsToSync);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        console.error("Recaps sync error:", e);
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    })();
    return;
  }

  // ---------- Truck Tracker (down trucks) — DB-backed, account-scoped ----------
  if (url.pathname === '/api/down-trucks') {
    (async () => {
      try {
        const authUser = getAuthUser(req);
        if (!authUser) return sendJson(401, { success: false, error: 'Unauthorized' });
        const isAdmin = authUser.role === 'superadmin' || authUser.role === 'admin';

        if (req.method === 'GET') {
          const trucks = listDownTrucks(isAdmin ? null : authUser.account_id);
          return sendJson(200, { success: true, trucks });
        }
        // Owners are read-only for the Truck Tracker.
        if ((req.method === 'POST' || req.method === 'DELETE') && authUser.role === 'owner') {
          return sendJson(403, { success: false, error: 'Owners cannot modify the truck tracker' });
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req);
          if (!body.id) return sendJson(400, { success: false, error: 'id required' });
          // Non-admins can only write to their own account.
          const accountId = isAdmin ? (body.accountId || authUser.account_id) : authUser.account_id;
          if (!accountId) return sendJson(400, { success: false, error: 'No account for this user' });
          const saved = upsertDownTruck({
            id: body.id, accountId,
            truckNumber: body.truckNumber, issue: body.issue,
            woNumber: body.woNumber, downDate: body.downDate, status: body.status,
            vehicleType: body.vehicleType, ownership: body.ownership, make: body.make,
            body: body.body, fuel: body.fuel, owner: body.owner,
            license: body.license, vin: body.vin,
          });
          return sendJson(200, { success: true, truck: saved });
        }
        if (req.method === 'DELETE') {
          const body = await readJsonBody(req);
          if (!body.id) return sendJson(400, { success: false, error: 'id required' });
          if (!isAdmin) {
            const existing = getDownTruckById(body.id);
            if (existing && existing.accountId !== authUser.account_id) {
              return sendJson(403, { success: false, error: 'Forbidden' });
            }
          }
          return sendJson(200, { success: true, deleted: deleteDownTruck(body.id) });
        }
        return sendJson(405, { success: false, error: 'Method not allowed' });
      } catch (e) {
        sendJson(500, { success: false, error: simplifyError(e) });
      }
    })();
    return;
  }

  // ---------- Company scorecard (per account) — managers edit, everyone reads ----------
  if (url.pathname === '/api/scorecard') {
    (async () => {
      try {
        const authUser = getAuthUser(req);
        if (!authUser) return sendJson(401, { success: false, error: 'Unauthorized' });
        const isSuper = authUser.role === 'superadmin';
        const accountId = isSuper ? (url.searchParams.get('accountId') || null) : authUser.account_id;

        if (req.method === 'GET') {
          if (!accountId) return sendJson(200, { success: true, scorecard: null });
          return sendJson(200, { success: true, scorecard: getScorecard(accountId) });
        }
        if (req.method === 'POST') {
          if (!(authUser.role === 'manager' || isSuper)) {
            return sendJson(403, { success: false, error: 'Only managers can edit the scorecard' });
          }
          if (!accountId) return sendJson(400, { success: false, error: 'No account for this scorecard' });
          const body = await readJsonBody(req);
          return sendJson(200, { success: true, scorecard: saveScorecard(accountId, body) });
        }
        return sendJson(405, { success: false, error: 'Method not allowed' });
      } catch (e) {
        sendJson(500, { success: false, error: simplifyError(e) });
      }
    })();
    return;
  }

  // Save ONE recap row (upsert). Per-row saves are far more stable than syncing
  // the whole array on every keystroke.
  if (url.pathname === '/api/recaps/save' && req.method === 'POST') {
    (async () => {
      try {
        const authUser = getAuthUser(req);
        if (!authUser) return sendJson(401, { success: false, error: 'Unauthorized' });
        const body = await readJsonBody(req);
        const r = body.recap || body;
        if (!r || !r.id) return sendJson(400, { success: false, error: 'recap id required' });
        const isAdmin = authUser.role === 'superadmin' || authUser.role === 'admin';
        if (!isAdmin) r.clientId = authUser.account_id; // pin non-admins to their account
        if (!r.clientId || !r.dailyDate) return sendJson(400, { success: false, error: 'clientId and dailyDate required' });
        syncRecaps([r]); // upsert by id
        sendJson(200, { success: true, id: r.id });
      } catch (e) {
        sendJson(500, { success: false, error: simplifyError(e) });
      }
    })();
    return;
  }

  if (url.pathname === '/api/recaps/delete' && req.method === 'POST') {
    (async () => {
      try {
        const authUser = getAuthUser(req);
        if (!authUser) return sendJson(401, { success: false, error: 'Unauthorized' });
        const body = await readJsonBody(req);
        if (!body.id) return sendJson(400, { success: false, error: 'id required' });
        const isAdmin = authUser.role === 'superadmin' || authUser.role === 'admin';
        if (!isAdmin) {
          const existing = getRecapById(body.id);
          // Non-admins may only delete rows belonging to their own account.
          if (existing && existing.clientId && existing.clientId !== authUser.account_id) {
            return sendJson(403, { success: false, error: 'Forbidden' });
          }
        }
        const changes = deleteRecap(body.id);
        sendJson(200, { success: true, deleted: changes });
      } catch (e) {
        sendJson(500, { success: false, error: simplifyError(e) });
      }
    })();
    return;
  }

  if (url.pathname === '/api/accounts' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      accounts: GEOTAB_ACCOUNTS.map(publicAccount),
      defaultAccountId: GEOTAB_ACCOUNTS[0]?.id || ""
    }));
    return;
  }

  if (url.pathname === '/api/drivers-readiness' && (req.method === 'GET' || req.method === 'POST')) {
    (async () => {
      try {
        const authUser = getAuthUser(req);
        let creds = null;
        let accountLabel = null;

        // 1. Logged-in user's own account (multi-tenant default).
        if (authUser && authUser.account_id) {
          const c = getAccountCredentials(authUser.account_id);
          if (c && c.geotab.database && c.geotab.username) {
            creds = c.geotab; accountLabel = { id: c.id, name: c.name };
          }
        }
        // 2. superadmin (or GET) may request a specific DB account via ?accountId.
        if (!creds) {
          const reqAccountId = String(url.searchParams.get('accountId') || '').trim();
          if (reqAccountId) {
            const c = getAccountCredentials(reqAccountId);
            if (c && c.geotab.database) { creds = c.geotab; accountLabel = { id: c.id, name: c.name }; }
          }
        }
        // 3. POSTed credentials (backward compatibility).
        if (!creds && req.method === 'POST') {
          const body = await readJsonBody(req);
          const b = body.credentials || body;
          if (b && b.database && (b.username || b.userName)) {
            creds = { server: b.server, database: b.database, username: b.username || b.userName, password: b.password };
          }
        }
        // 4. env-configured account (legacy fallback).
        if (!creds) {
          const envAcct = GEOTAB_ACCOUNTS[0];
          if (envAcct) {
            creds = { server: envAcct.server, database: envAcct.database, username: envAcct.username, password: envAcct.password };
            accountLabel = { id: envAcct.id, name: envAcct.name };
          }
        }
        if (!creds) throw new Error('No Geotab account configured for this user');

        const result = await computeReadiness(creds);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          totalDrivers: result.totalDrivers,
          generatedAt: result.generatedAt,
          account: accountLabel,
          summary: result.summary,
          drivers: result.drivers
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: simplifyError(error) }));
      }
    })();
    return;
  }

  if (url.pathname === '/api/hos-alerts/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      warningMinutes: 60,
      criticalMinutes: 30,
    }));
    return;
  }

  if (url.pathname === '/api/hos-alerts/sync' && req.method === 'POST') {
    (async () => {
      try {
        const body = await readJsonBody(req);
        const drivers = Array.isArray(body.drivers) ? body.drivers : [];
        const result = await processHosTelegramAlerts(drivers);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: simplifyError(error) }));
      }
    })();
    return;
  }
  // Inject a FAKE critical HOS risk through the real alert pipeline (for testing push).
  if (url.pathname === '/api/hos-alerts/test' && (req.method === 'GET' || req.method === 'POST')) {
    (async () => {
      try {
        let opts = {};
        if (req.method === 'POST') opts = await readJsonBody(req);
        const name = String(opts.name || url.searchParams.get('name') || 'TEST DRIVER');
        const minutes = Math.max(0, Math.min(59, Number(opts.minutes ?? url.searchParams.get('minutes') ?? 12)));
        const metric = String(opts.metric || url.searchParams.get('metric') || 'driving').toLowerCase();
        const display = `0:${String(minutes).padStart(2, '0')}`;

        // Unique id each call so the per-driver cooldown never suppresses a re-test.
        const fakeDriver = {
          id: `test-${Date.now()}`,
          driverName: name,
          currentStatus: 'D', // on-duty so the risk is counted
          breakDisplay: metric === 'break' ? display : undefined,
          drivingDisplay: metric === 'driving' ? display : undefined,
          dutyDisplay: metric === 'duty' ? display : undefined,
          cycleRemainingDisplay: metric === 'cycle' ? display : undefined,
        };

        const result = await processHosTelegramAlerts([fakeDriver]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          injected: { name, metric, minutes },
          subscriptions: subscriptionCount(),
          ...result,
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: simplifyError(error) }));
      }
    })();
    return;
  }

  // Diagnostics: is the Netradyne poller logging in and collecting alerts per account?
  if (url.pathname === '/api/netradyne/status' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'superadmin') return sendJson(403, { success: false, error: 'Superadmin only' });
    const st = getNetradyneStatus();
    const accounts = listAccounts().map((a) => {
      const c = getAccountCredentials(a.id);
      const s = st[a.id] || {};
      return {
        account: a.name,
        id: a.id,
        hasNetradyneCreds: Boolean(c && c.netradyne.email && c.netradyne.password),
        pollMs: c ? c.netradyne.pollMs : null,
        lastPollAt: s.lastPollAt || null,
        loginOk: s.loginOk ?? null,
        lastScrapedCount: s.lastScrapedCount ?? null,   // alerts pulled from Netradyne
        lastNotifiedCount: s.lastNotifiedCount ?? null,  // fresh alerts that fired notifications
        lastError: s.lastError || null,
        storedAlerts: getAlerts(a.id).length,
        pushSubscribers: getSubscriptionsForAccount(a.id).length,
      };
    });
    sendJson(200, { success: true, netradyneEnabled: process.env.NETRADYNE_ENABLED !== '0', accounts });
    return;
  }

  // ---------- Netradyne API (account-scoped) ----------
  if (url.pathname === '/api/netradyne/alerts' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    // Drop alerts for any deleted account so ghost data never shows.
    pruneToAccounts(listAccounts().map((a) => a.id));
    // superadmin sees all; account users see only their account's alerts.
    const scope = authUser && authUser.role !== 'superadmin' ? authUser.account_id : null;
    const alerts = getAlerts(scope);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, alerts }));
    return;
  }

  if (url.pathname === '/api/netradyne/summary' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    pruneToAccounts(listAccounts().map((a) => a.id));
    const scope = authUser && authUser.role !== 'superadmin' ? authUser.account_id : null;
    const alerts = getAlerts(scope);
    const now = new Date();
    const summary = {
      today: alerts.filter(a => new Date(a.occurredAt) > new Date(now).setHours(0,0,0,0)).length,
      lastHour: alerts.filter(a => new Date(a.occurredAt) > now - 3600000).length,
      hardBraking: alerts.filter(a => a.eventType === 'Hard Braking').length,
      speeding: alerts.filter(a => a.eventType === 'Speeding').length,
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, summary }));
    return;
  }

  // ---------- Existing late-items (restored cleanly) ----------
  // Live Relay late items for the logged-in user's account (fed by the extension).
  if (url.pathname === '/api/late-items' && req.method === 'GET') {
    const user = getAuthUser(req);
    const data = user && user.account_id ? getLateItems(user.account_id) : [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data }));
    return;
  }
if (url.pathname.startsWith('/api/netradyne/alerts/') && req.method === 'PATCH') {
  (async () => {
    try {
      const id = url.pathname.split('/').pop();
      const body = await readJsonBody(req);
      const { status } = body;
      const updated = updateAlertStatus(id, status);
      if (updated) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, alert: updated }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Alert not found' }));
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  })();
  return;
}
if (url.pathname === '/api/netradyne/debug' && req.method === 'GET') {
  (async () => {
    try {
      const authUser = getAuthUser(req);
      const accountId = url.searchParams.get('accountId') || authUser?.account_id;
      if (!accountId) throw new Error('No account for Netradyne debug');
      const c = getAccountCredentials(accountId);
      if (!c || !c.netradyne.email) throw new Error('Account has no Netradyne credentials');
      const ctx = await getAuthenticatedContext({ id: c.id, netradyneEmail: c.netradyne.email, netradynePassword: c.netradyne.password });
      const page = await ctx.newPage();
      await page.goto('https://idms.netradyne.com/console/#/alerts', { waitUntil: 'networkidle' });
      // Wait for any alert rows or container to appear
      await page.waitForTimeout(3000);
      const screenshot = await page.screenshot({ encoding: 'base64' });
      const html = await page.content();
      await page.close();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, screenshot, html }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  })();
  return;
}
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/g, "");
  const filePath = join(root, safePath);

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, { "content-type": mime[extname(filePath)] || "application/octet-stream" });
  createReadStream(filePath).pipe(res);

};

const server = useHttp
  ? createHttpServer(requestHandler)
  : createHttpsServer(httpsOptions, requestHandler);

server.listen(port, "0.0.0.0", () => {
  const scheme = useHttp ? "http" : "https";
  console.log(`NDK Dispatch Portal running at ${scheme}://localhost:${port}/ (${useHttp ? "HTTP mode" : "HTTPS mode"})`);
  console.log(`To access from your phone, connect to the same WiFi and use your computer's local IP address (e.g. ${scheme}://192.168.x.x:${port}/)`);
  if (!useHttp) {
    console.log(`NOTE: You will see a security warning in Chrome because this uses a self-signed certificate. Click "Advanced" then "Proceed to localhost" to continue.`);
  }
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    console.log("HOS Telegram alerts: enabled");
  } else {
    console.log("HOS Telegram alerts: disabled (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env)");
  }

  // Per-account HOS alert engine (Geotab → push + Telegram, 60 & 30 min thresholds).
  startHosEngine();
});
startPolling();