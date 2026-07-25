import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer as createHttpsServer } from "node:https";
import { createServer as createHttpServer } from "node:http";
import { readFileSync } from "node:fs";import { extname, join, normalize } from "node:path";
import dotenv from "dotenv";
import { processHosTelegramAlerts, sendTelegramMessage } from "./hos-alerts.mjs";
import { startPolling } from './netradyne/poller.js';
import { getAlerts } from './netradyne/store.js';
import {addAlerts, updateAlertStatus } from './netradyne/store.js';
import { pushConfigured, getVapidPublicKey, addSubscription, removeSubscription, sendPushToAll, subscriptionCount } from './push.mjs';
dotenv.config();

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
const AUTH_CACHE_MS = 30 * 60 * 1000;
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

function getAccountFromRequest(url, req) {
  const requested = String(url.searchParams.get("accountId") || req.headers["x-geotab-account"] || "").trim();
  if (requested) {
    const account = GEOTAB_ACCOUNTS.find((item) => item.id === requested);
    if (!account) throw new Error(`Unknown account: ${requested}`);
    return account;
  }
  return GEOTAB_ACCOUNTS[0] || null;
}

function requireConfiguredAccount(account) {
  if (account) return;
  const missing = [];
  if (!process.env.GEOTAB_DATABASE) missing.push("GEOTAB_DATABASE");
  if (!process.env.GEOTAB_USERNAME) missing.push("GEOTAB_USERNAME");
  if (!process.env.GEOTAB_PASSWORD) missing.push("GEOTAB_PASSWORD");
  if (missing.length) {
    throw new Error(`Missing Geotab account env values: ${missing.join(", ")} or GEOTAB_ACCOUNT_*`);
  }
  throw new Error("No valid Geotab accounts configured.");
}

function simplifyError(err) {
  if (!err) return "Unknown error";
  const msg = String(err.message || err);
  if (msg.includes("fetch failed")) return "Network/API request failed";
  return msg;
}

async function geotabCall(method, params, server = GEOTAB_SERVER) {
  const url = `https://${server}/apiv1`;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params, id: 1, jsonrpc: "2.0" })
    });
  } catch (error) {
    throw new Error(`${method}: network request failed (${error.message || error})`);
  }
  if (!response.ok) {
    let bodyText = "";
    try { bodyText = await response.text(); } catch (_) {}
    throw new Error(`${method}: HTTP ${response.status} ${response.statusText}${bodyText ? ` - ${bodyText.slice(0, 200)}` : ""}`);
  }
  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`${method}: invalid JSON response`);
  }
  if (data.error) {
    throw new Error(`${method}: ${data.error.message || "Geotab API error"}`);
  }
  return data.result;
}

async function withRetry(fn, options = {}) {
  const retries = Number(options.retries || 0);
  const delayMs = Number(options.delayMs || 0);
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function geotabCallWithRetry(method, params, options = {}) {
  return withRetry(() => geotabCall(method, params, options.account?.server || GEOTAB_SERVER), options);
}

const authCache = new Map();

async function authenticate(credentials, options = {}) {
  if (!credentials || !credentials.database || !credentials.userName || !credentials.password) {
    throw new Error("Missing Geotab credentials");
  }
  const cacheKey = `${credentials.server || GEOTAB_SERVER}|${credentials.database}|${credentials.userName}`;
  const cached = authCache.get(cacheKey);
  if (!options.force && cached && Date.now() - cached.createdAt < AUTH_CACHE_MS) {
    return cached.auth;
  }
  const auth = await geotabCallWithRetry("Authenticate", {
    database: credentials.database,
    userName: credentials.userName,
    password: credentials.password
  }, { retries: 1, delayMs: 400, account: { server: credentials.server || GEOTAB_SERVER } });
  authCache.set(cacheKey, { auth, createdAt: Date.now() });
  return auth;
}

function parseDurationToMinutes(value) {
  if (value == null) return null;

  // 1. Already a number – treat as minutes, but if it's huge (>100 000) assume it's milliseconds
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Math.abs(value) > 100000) {
      // Likely milliseconds → minutes
      const minutes = value / 60000;
      return Math.floor(Math.abs(minutes)) * (value < 0 ? -1 : 1);
    }
    // Assume minutes, but if still abnormally large (e.g., > 7000 minutes = 116h) it’s probably wrong
    // We'll cap at 10,000 minutes just in case
    return Math.min(value, 10000);
  }

  const text = String(value).trim();
  if (!text) return null;

  // 2. ISO 8601 duration (e.g., "P0DT8H42M", "PT8H42M")
  const isoMatch = text.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (isoMatch) {
    const days = Number(isoMatch[1] || 0);
    const hours = Number(isoMatch[2] || 0);
    const minutes = Number(isoMatch[3] || 0);
    const seconds = Number(isoMatch[4] || 0);
    return Math.floor(days * 24 * 60 + hours * 60 + minutes + seconds / 60);
  }

  // 3. Timespan with optional sign and possibly days (e.g., "-12:34:56", "1.02:03:04", "5:30")
  const spanMatch = text.match(/^(-?)(?:(\d+)\.)?(\d{1,3}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/);
  if (spanMatch) {
    const sign = spanMatch[1] ? -1 : 1;
    const days = Number(spanMatch[2] || 0);
    const hours = Number(spanMatch[3] || 0);
    const minutes = Number(spanMatch[4] || 0);
    const seconds = Number(spanMatch[5] || 0);
    const fractional = spanMatch[6] ? Number(`0.${spanMatch[6]}`) : 0;
    const totalMinutes = ((days * 24 + hours) * 60) + minutes + ((seconds + fractional) / 60);
    return sign * Math.floor(totalMinutes);
  }

  // 4. Plain number string (e.g., "1440")
  const number = Number(text.replace(/[^0-9.-]+/g, ""));
  if (Number.isFinite(number)) {
    // Same logic as #1 – large numbers → milliseconds
    if (Math.abs(number) > 100000) {
      return Math.floor(number / 60000);
    }
    return Math.floor(number);
  }

  return null;
}

function formatMinutes(minutes) {
  if (minutes == null || !Number.isFinite(minutes)) return "--";
  const sign = minutes < 0 ? -1 : 1;
  const abs = Math.abs(Math.round(minutes));
  const hrs = Math.floor(abs / 60);
  const mins = abs % 60;
  return `${sign < 0 ? "-" : ""}${String(hrs).padStart(1, "0")}:${String(mins).padStart(2, "0")}`;
}
function safeDate(value) {
  if (value == null) return new Date(NaN);   // returns Invalid Date

  // Handle Microsoft JSON format: "/Date(978307200000)/"
  if (typeof value === "string") {
    const msMatch = value.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
    if (msMatch) value = Number(msMatch[1]);
  }

  let num = Number(value);
  if (Number.isFinite(num)) {
    // If number is plausible seconds (less than 1e12, roughly year 33658 as ms),
    // assume it is seconds and convert to milliseconds.
    if (num < 1e12) num *= 1000;
    return new Date(num);
  }

  // fallback: try parsing as string date
  return new Date(value);
}
function availabilityTypeMap(item) {
  const map = {};
  const list = Array.isArray(item?.availabilities) ? item.availabilities : [];
  for (const entry of list) {
    const key = String(entry?.type || "").toLowerCase();
    if (!key) continue;
    map[key] = parseDurationToMinutes(entry?.duration);
  }
  return map;
}

function extractCycleAvailableTomorrowMinutes(item) {
  if (!item || typeof item !== "object") return null;
  const candidates = item.CycleAvailabilities ?? item.cycleAvailabilities;
  if (candidates == null) return null;
  if (Array.isArray(candidates)) {
    const first = candidates[0];
    if (first && typeof first === "object") {
      return parseDurationToMinutes(first.available ?? first.Available ?? first.duration ?? first.Duration);
    }
    return parseDurationToMinutes(first);
  }
  return parseDurationToMinutes(candidates);
}

async function getDriverAvailability(credentials, userId) {
  const searches = [
    { userSearch: { id: userId } },
    { UserSearch: { Id: userId } },
    { userSearch: { Id: userId } },
    { UserSearch: { id: userId } }
  ];

  let lastError = null;
  for (const search of searches) {
    try {
      const result = await geotabCallWithRetry("Get", {
        typeName: "DutyStatusAvailability",
        credentials,
        search
      }, { retries: 2, delayMs: 400, account: { server: credentials.server || GEOTAB_SERVER } });
      if (Array.isArray(result) && result.length) {
        const item = result[0];
        const typed = availabilityTypeMap(item);
        const cycleRemainingMinutes = typed.cycle ?? parseDurationToMinutes(item.Cycle ?? item.cycle);
        const drivingMinutes = typed.driving ?? parseDurationToMinutes(item.Driving ?? item.driving);
        const breakMinutes = typed.break ?? typed.rest ?? parseDurationToMinutes(item.Break ?? item.break ?? item.drivingBreakDuration);
        const dutyMinutes = typed.duty ?? null;
        const workdayMinutes = typed.workday ?? parseDurationToMinutes(item.Workday ?? item.workday ?? item.Duty ?? item.duty);
        const cycleTomorrowMinutes = extractCycleAvailableTomorrowMinutes(item);
        return {
          cycleRemainingMinutes,
          cycleRemainingDisplay: formatMinutes(cycleRemainingMinutes),
          cycleTomorrowMinutes,
          cycleTomorrowDisplay: formatMinutes(cycleTomorrowMinutes),
          drivingMinutes,
          drivingDisplay: formatMinutes(drivingMinutes),
          dutyMinutes,
          dutyDisplay: formatMinutes(dutyMinutes),
          workdayMinutes,
          workdayDisplay: formatMinutes(workdayMinutes),
          breakMinutes,
          breakDisplay: formatMinutes(breakMinutes),
          cycleRaw: item,
          availabilityError: null
        };
      }
    } catch (error) {
      lastError = error;
    }
  }
  return {
    cycleRemainingMinutes: null,
    cycleRemainingDisplay: "--",
    cycleTomorrowMinutes: null,
    cycleTomorrowDisplay: "--",
    drivingMinutes: null,
    drivingDisplay: "--",
    dutyMinutes: null,
    dutyDisplay: "--",
    workdayMinutes: null,
    workdayDisplay: "--",
    breakMinutes: null,
    breakDisplay: "--",
    cycleRaw: null,
    availabilityError: lastError ? simplifyError(lastError) : null
  };
}

async function getDriverLogs(credentials, userId) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const searches = [
    { search: { fromDate: weekAgo.toISOString(), toDate: now.toISOString(), userSearch: { id: userId } } },
    { search: { fromDate: weekAgo.toISOString(), toDate: now.toISOString(), userSearch: { Id: userId } } }
  ];

  let lastError = null;
  for (const item of searches) {
    try {
      const result = await geotabCallWithRetry("Get", {
        typeName: "DutyStatusLog",
        credentials,
        search: item.search,
        resultsLimit: 500
      }, { retries: 3, delayMs: 500, account: { server: credentials.server || GEOTAB_SERVER } });
      if (Array.isArray(result) && result.length) {
        return { logs: result, logsError: null };
      }
    } catch (error) {
      lastError = error;
    }
  }
  return { logs: [], logsError: lastError ? simplifyError(lastError) : null };
}

function calculateCycleReset(logs, now) {
  const resetStatuses = new Set(["OFF", "SB", "PC"]);
  if (!Array.isArray(logs) || logs.length === 0) {
    return { cycleResetMinutes: null, cycleResetDisplay: "--" };
  }
  const validLogs = logs
    .filter((log) => log && log.dateTime && log.status)
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
  if (!validLogs.length) {
    return { cycleResetMinutes: null, cycleResetDisplay: "--" };
  }
  const latest = validLogs[0];
  if (!resetStatuses.has(latest.status)) {
    return { cycleResetMinutes: null, cycleResetDisplay: "--" };
  }
  let resetStart = new Date(latest.dateTime);
  for (let i = 1; i < validLogs.length; i += 1) {
    if (resetStatuses.has(validLogs[i].status)) {
      resetStart = new Date(validLogs[i].dateTime);
    } else {
      break;
    }
  }
  const elapsedMinutes = Math.floor((now - resetStart) / (1000 * 60));
  const remainingMinutes = Math.max(0, (34 * 60) - elapsedMinutes);
  return { cycleResetMinutes: remainingMinutes, cycleResetDisplay: remainingMinutes <= 0 ? "Completed" : formatMinutes(remainingMinutes) };
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, month: "short", day: "numeric" });
}

function buildRow(user, logs, now, availability = {}, extraNote = null) {
  const allowedStatuses = new Set(["OFF", "SB", "ON", "D", "PC", "YM"]);
  const MAX_LOG_AGE_MS = 30 * 24 * 60 * 60 * 1000;   // 30 days
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || user.userName || "Unknown Driver";
  const base = {
    id: user.id,
    name,
    userName: user.userName || "",
    cycleRemainingMinutes: availability.cycleRemainingMinutes ?? null,
    cycleRemainingDisplay: availability.cycleRemainingDisplay ?? "--",
    cycleTomorrowDisplay: availability.cycleTomorrowDisplay ?? "--",
    drivingDisplay: availability.drivingDisplay ?? "--",
    dutyDisplay: availability.dutyDisplay ?? "--",
    workdayDisplay: availability.workdayDisplay ?? "--",
    breakDisplay: availability.breakDisplay ?? "--",
    cycleResetMinutes: null,
    cycleResetDisplay: "--",
    cycleRaw: availability.cycleRaw ?? null
  };

  if (!Array.isArray(logs) || logs.length === 0) {
    return {
      ...base,
      currentStatus: "No recent logs",
      readiness: "NO LOGS",
      lastRestStart: "--",
      lastRestStartIso: null,
      minutesLeft: null,
      remainingDisplay: "--",
      note: extraNote || "No logs found in the last 7 days."
    };
  }

  // First filter: valid status and not ignored
  let filtered = logs.filter((log) => {
    const validRecord = log.eventRecordStatus === 1 || log.eventRecordStatus === "1" || log.eventRecordStatus == null;
    return validRecord && log.isIgnored !== true && allowedStatuses.has(log.status);
  });

  // Second filter: keep only logs from the last 30 days
filtered = filtered.filter((log) => {
    const logTime = safeDate(log.dateTime).getTime();
    return !isNaN(logTime) && (now.getTime() - logTime <= MAX_LOG_AGE_MS);
});

  // If nothing is recent, treat as NO LOGS
  if (filtered.length === 0) {
    return {
      ...base,
      currentStatus: "No recent logs",
      readiness: "NO LOGS",
      lastRestStart: "--",
      lastRestStartIso: null,
      minutesLeft: null,
      remainingDisplay: "--",
      note: extraNote || "No logs within the last 30 days."
    };
  }

  const cycleReset = calculateCycleReset(filtered, now);
filtered.sort((a, b) => safeDate(b.dateTime) - safeDate(a.dateTime));  const latest = filtered[0];

  // Driver is currently ON, D, YM, etc. (not resting)
  if (!allowedStatuses.has(latest.status) || (latest.status !== "OFF" && latest.status !== "SB" && latest.status !== "PC")) {
    let statusSince = new Date(latest.dateTime);
    for (let i = 1; i < filtered.length; i += 1) {
      if (filtered[i].status === latest.status) statusSince = new Date(filtered[i].dateTime);
      else break;
    }
    return {
      ...base,
      cycleResetMinutes: cycleReset.cycleResetMinutes,
      cycleResetDisplay: cycleReset.cycleResetDisplay,
      currentStatus: latest.status,
      statusSinceIso: statusSince.toISOString(),
      statusSinceDisplay: formatDate(statusSince),
      readiness: "NOT READY",
      lastRestStart: "--",
      lastRestStartIso: null,
      minutesLeft: null,
      remainingDisplay: "--",
      note: extraNote || `Current duty status is ${latest.status}.`
    };
  }

  // Driver is in a rest status (OFF, SB, PC)
  let restStart = new Date(latest.dateTime);
  for (let i = 1; i < filtered.length; i += 1) {
    if (filtered[i].status === "OFF" || filtered[i].status === "SB" || filtered[i].status === "PC") {
      restStart = new Date(filtered[i].dateTime);
    } else {
      break;
    }
  }

  const elapsedMinutes = Math.floor((now.getTime() - restStart.getTime()) / 60000);
  const remainingMinutes = Math.max(0, 600 - elapsedMinutes);

  if (remainingMinutes <= 0) {
    return {
      ...base,
      cycleResetMinutes: cycleReset.cycleResetMinutes,
      cycleResetDisplay: cycleReset.cycleResetDisplay,
      currentStatus: latest.status,
      readiness: "READY",
      lastRestStart: formatDate(restStart),
      lastRestStartIso: restStart.toISOString(),
      minutesLeft: 0,
      remainingDisplay: "Completed",
      note: extraNote || "Completed required 10-hour rest period."
    };
  }

  return {
    ...base,
    cycleResetMinutes: cycleReset.cycleResetMinutes,
    cycleResetDisplay: cycleReset.cycleResetDisplay,
    currentStatus: latest.status,
    readiness: "NOT READY",
    lastRestStart: formatDate(restStart),
    lastRestStartIso: restStart.toISOString(),
    minutesLeft: remainingMinutes,
    remainingDisplay: formatMinutes(remainingMinutes),
    note: extraNote || `Needs ${formatMinutes(remainingMinutes)} to complete 10-hour rest.`
  };
}

const requestHandler = (req, res) => {  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoints
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



  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
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
        const result = addSubscription(sub);
        res.writeHead(result.ok ? 200 : 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: result.ok, ...result }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: simplifyError(error) }));
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
        const body = await readJsonBody(req);
        const result = await sendPushToAll({
          title: body.title || 'NDK test alert',
          body: body.body || 'If you can see this with the app closed, push works.',
          requireInteraction: true,
          url: '/index.html',
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, subscriptions: subscriptionCount(), ...result }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: simplifyError(error) }));
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
        let account = null;
        if (req.method === 'GET') {
          const accountId = String(url.searchParams.get('accountId') || '').trim();
          if (accountId) {
            account = GEOTAB_ACCOUNTS.find((item) => item.id === accountId);
            if (!account) throw new Error(`Unknown Geotab account: ${accountId}`);
          }
        }

        let credentials = null;
        if (req.method === 'POST') {
          const body = await readJsonBody(req);
          credentials = body.credentials || body;
        }

        if (!account && credentials) {
          account = normalizeAccount(credentials, "posted-account");
        }
        if (!account) {
          account = GEOTAB_ACCOUNTS[0] || null;
        }
        requireConfiguredAccount(account);

        const auth = await authenticate({
          database: account.database,
          userName: account.username,
          password: account.password,
          server: account.server
        });
        const geotabCredentials = auth.credentials;

        const users = await geotabCallWithRetry('Get', {
          typeName: 'User',
          credentials: geotabCredentials
        }, { retries: 2, delayMs: 400, account });

        const now = new Date();
        const seen = new Set();
        const drivers = (Array.isArray(users) ? users : []).filter((user) => {
          if (!user || !user.id || !user.isDriver) return false;
          const key = typeof user.id === 'string' ? user.id : JSON.stringify(user.id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const rows = await Promise.all(drivers.map(async (user) => {
          const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.userName || 'Unknown Driver';
          const [logsResult, availability] = await Promise.all([
            getDriverLogs(geotabCredentials, user.id),
            getDriverAvailability(geotabCredentials, user.id)
          ]);

          let finalLogs = logsResult.logs;
          let finalLogsError = logsResult.logsError;
          const availabilityError = availability.availabilityError || null;
// --- Discard any log older than 30 days, even if Geotab returns them ---
const MAX_LOG_AGE_MS = 30 * 24 * 60 * 60 * 1000;
finalLogs = (finalLogs || []).filter((log) => {
  const logTime = new Date(log.dateTime).getTime();
  return !isNaN(logTime) && (now.getTime() - logTime <= MAX_LOG_AGE_MS);
});
if (finalLogsError) {
  try {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    finalLogs = await geotabCallWithRetry("Get", {
      typeName: "DutyStatusLog",
      credentials: geotabCredentials,
      search: {
        userSearch: { id: user.id },
        fromDate: thirtyDaysAgo.toISOString()    // ✅ only recent logs
      }
    }, { retries: 1, delayMs: 700, account });
    finalLogsError = null;
  } catch (error) {
    finalLogsError = simplifyError(error);
  }
}

          if (finalLogsError) {
            return {
              id: user.id,
              driverName: name,
              status: 'Error',
              vehicle: null,
              activeTripId: null,
              lastStatusChange: null,
              breakTime: availability.breakDisplay,
              driving: availability.drivingDisplay,
              duty: availability.dutyDisplay,
              workday: availability.workdayDisplay,
              cycle: availability.cycleRemainingDisplay,
              updatedAt: new Date().toISOString(),
              clientId: null,
              currentStatus: 'Error',
              cycleRemainingDisplay: availability.cycleRemainingDisplay,
              cycleTomorrowDisplay: availability.cycleTomorrowDisplay,
              drivingDisplay: availability.drivingDisplay,
              dutyDisplay: availability.dutyDisplay,
              workdayDisplay: availability.workdayDisplay,
              breakDisplay: availability.breakDisplay,
              cycleResetDisplay: availability.cycleResetDisplay ?? '--',
              note: finalLogsError ? `Logs: ${finalLogsError} ${availabilityError ? `| Avail: ${availabilityError}` : ''}` : null,
              statusSinceDisplay: null,
              statusSinceIso: null,
              readiness: 'NO LOGS'
            };
          }

          const row = buildRow(user, finalLogs, now, availability, availabilityError ? `Availability: ${availabilityError}` : null);
          return {
            id: row.id,
            driverName: row.name,
            status: row.currentStatus,
            activityStatus: row.currentStatus,
            vehicle: null,
            activeTripId: null,
            lastStatusChange: row.lastRestStartIso || row.lastRestStart || null,
            breakTime: row.breakDisplay,
            driving: row.drivingDisplay,
            duty: row.dutyDisplay,
            workday: row.workdayDisplay,
            cycle: row.cycleRemainingDisplay,
            updatedAt: new Date().toISOString(),
            clientId: null,
            currentStatus: row.currentStatus,
            cycleRemainingDisplay: row.cycleRemainingDisplay,
            cycleTomorrowDisplay: row.cycleTomorrowDisplay,
            drivingDisplay: row.drivingDisplay,
            dutyDisplay: row.dutyDisplay,
            workdayDisplay: row.workdayDisplay,
            breakDisplay: row.breakDisplay,
            cycleResetDisplay: row.cycleResetDisplay,
            remainingDisplay: row.remainingDisplay,
            statusSinceDisplay: row.statusSinceDisplay,
            statusSinceIso: row.statusSinceIso,
            note: row.note,
            readiness: row.readiness
          };
        }));

        rows.sort((a, b) => String(a.driverName || '').localeCompare(String(b.driverName || '')));
        const summary = {
          ready: rows.filter((row) => row.readiness === 'READY').length,
          notReady: rows.filter((row) => row.readiness === 'NOT READY').length,
          noLogs: rows.filter((row) => row.readiness === 'NO LOGS').length
        };

        processHosTelegramAlerts(rows).catch((error) => {
          console.warn("HOS Telegram alert error:", error.message || error);
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          totalDrivers: rows.length,
          generatedAt: new Date().toISOString(),
          account: publicAccount(account),
          summary,
          drivers: rows
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

  // ---------- Netradyne API ----------
  if (url.pathname === '/api/netradyne/alerts' && req.method === 'GET') {
    const alerts = getAlerts();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, alerts }));
    return;
  }

  if (url.pathname === '/api/netradyne/summary' && req.method === 'GET') {
    const alerts = getAlerts();
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
  if (url.pathname === '/api/late-items') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: latestLateItemsData }));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (Array.isArray(parsed)) latestLateItemsData = parsed;
          else if (parsed.lateItems) latestLateItemsData = parsed.lateItems;
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
      const ctx = await getAuthenticatedContext();
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

  const pollMs = Number(process.env.HOS_ALERT_POLL_MS || 120000);
  if (GEOTAB_ACCOUNTS.length) {
    setInterval(async () => {
      try {
const response = await fetch(`${useHttp ? "http" : "https"}://127.0.0.1:${port}/api/drivers-readiness`, {
  rejectUnauthorized: false   // allow self-signed cert
});        if (!response.ok) return;
        const payload = await response.json();
        if (payload.success && Array.isArray(payload.drivers)) {
          await processHosTelegramAlerts(payload.drivers);
        }
      } catch (error) {
        console.warn("HOS alert poll failed:", error.message || error);
      }
    }, pollMs);
  }
});
startPolling();