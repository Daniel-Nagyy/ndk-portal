// netradyne/poller.js — per-account Netradyne polling.
// Each account with Netradyne credentials gets its own login/session and poll
// loop. Ban-risk safeguards: session reuse, a 5-min minimum interval, staggered
// starts, and one concurrent poll per account.
import { getAuthenticatedContext } from './auth.js';
import { scrapeAlerts } from './scraper.js';
import { addAlerts } from './store.js';
import { notifyAlerts } from './notifier.js';
import { log } from './logger.js';
import { NETRADYNE } from './config.js';
import { listAccounts, getAccountCredentials } from '../db.mjs';

const running = new Set(); // accountIds currently mid-poll
const status = new Map(); // accountId -> diagnostic status (for /api/netradyne/status)

export function getNetradyneStatus() {
  const out = {};
  for (const [id, s] of status) out[id] = s;
  return out;
}

// Only notify alerts that occurred recently, so a restart (in-memory store resets)
// doesn't re-blast every alert from earlier today. Dedup still prevents repeats.
const FRESH_MS = Number(process.env.NETRADYNE_ALERT_FRESH_MS) || 20 * 60 * 1000;

async function pollAccount(account) {
  if (running.has(account.id)) return;
  running.add(account.id);
  const s = status.get(account.id) || {};
  try {
    const ctx = await getAuthenticatedContext(account);
    s.loginOk = true;
    const raw = await scrapeAlerts(ctx);
    s.lastScrapedCount = raw.length;
    const added = addAlerts(account.id, raw);
    const now = Date.now();
    const fresh = added.filter((a) => a.occurredAt && (now - new Date(a.occurredAt).getTime()) <= FRESH_MS);
    s.lastNotifiedCount = fresh.length;
    s.lastError = null;
    if (fresh.length > 0) {
      log.info(`[${account.id}] ${fresh.length} new alert(s) to notify (${added.length} added total)`);
      await notifyAlerts(account, fresh);
    }
  } catch (err) {
    s.loginOk = false;
    s.lastError = err.message;
    log.error(`[${account.id}] poll failed: ${err.message}`);
  } finally {
    s.lastPollAt = new Date().toISOString();
    status.set(account.id, s);
    running.delete(account.id);
  }
}

function netradyneAccounts() {
  return listAccounts()
    .map((a) => getAccountCredentials(a.id))
    .filter((c) => c && c.netradyne.email && c.netradyne.password)
    .map((c) => ({
      id: c.id,
      name: c.name,
      netradyneEmail: c.netradyne.email,
      netradynePassword: c.netradyne.password,
      pollMs: Math.max(Number(c.netradyne.pollMs) || NETRADYNE.minPollMs, NETRADYNE.minPollMs),
    }));
}

export function startPolling() {
  if (process.env.NETRADYNE_ENABLED === '0') {
    log.info('Netradyne polling disabled (NETRADYNE_ENABLED=0)');
    return;
  }
  const accounts = netradyneAccounts();
  if (!accounts.length) {
    log.info('No accounts with Netradyne credentials — polling not started');
    return;
  }
  // Stagger initial logins so we never hit Netradyne with simultaneous auth.
  accounts.forEach((account, i) => {
    setTimeout(() => {
      pollAccount(account);
      setInterval(() => pollAccount(account), account.pollMs);
    }, i * 20000);
    log.info(`Netradyne polling scheduled: ${account.name} every ${Math.round(account.pollMs / 1000)}s`);
  });
}
