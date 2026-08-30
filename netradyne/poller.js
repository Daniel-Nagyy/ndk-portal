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
import { listAccounts, getAccountCredentials, recordAuthFailure, isAuthBlocked, clearAuthFailure, getAuthFailure, listAuthFailures, AUTH_FAIL_LIMIT } from '../db.mjs';
import crypto from 'node:crypto';

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

// ---------- Credential circuit breaker ----------
// Netradyne locks accounts after repeated bad logins, so a rejected password must
// not be replayed every poll. Once login is refused we stop trying until the
// stored credentials change (the fingerprint covers the password, so saving a new
// one clears the block automatically).
function credFingerprint(account) {
  return crypto
    .createHash('sha256')
    .update(`${account.netradyneEmail}|${account.netradynePassword}`)
    .digest('hex')
    .slice(0, 16);
}

// A rejected login, as opposed to a timeout/network/scrape failure worth retrying.
function isCredentialError(message) {
  return /login not accepted|invalid|incorrect|wrong|locked|expired|not found|authentication failed/i.test(String(message || ''));
}

export function getNetradyneAuthBlocks() {
  return listAuthFailures()
    .filter((r) => r.provider === 'netradyne')
    .map((r) => ({ accountId: r.ref, failCount: r.fail_count, blocked: r.fail_count >= AUTH_FAIL_LIMIT, lastError: r.last_error, lastFailedAt: r.last_failed_at }));
}

// Manual override, e.g. after unlocking the account on Netradyne's side.
export function clearNetradyneAuthBlock(accountId) {
  if (!accountId) throw new Error('clearNetradyneAuthBlock: pass an accountId');
  clearAuthFailure('netradyne', accountId);
}

async function pollAccount(account) {
  if (running.has(account.id)) return;
  const s = status.get(account.id) || {};

  const fingerprint = credFingerprint(account);
  if (isAuthBlocked('netradyne', account.id, fingerprint)) {
    const row = getAuthFailure('netradyne', account.id);
    s.loginOk = false;
    s.authBlocked = true;
    s.lastError = `login blocked after ${row.fail_count} rejected attempt(s); not retrying until the password is updated: ${row.last_error}`;
    status.set(account.id, s);
    return;
  }

  running.add(account.id);
  try {
    const ctx = await getAuthenticatedContext(account);
    s.loginOk = true;
    s.authBlocked = false;
    clearAuthFailure('netradyne', account.id);
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
    if (isCredentialError(err.message)) {
      const row = recordAuthFailure('netradyne', account.id, fingerprint, err.message);
      s.authBlocked = row.fail_count >= AUTH_FAIL_LIMIT;
      log.error(`[${account.id}] Netradyne login rejected (${row.fail_count}/${AUTH_FAIL_LIMIT})${s.authBlocked ? ' — polling paused until the stored password is updated' : ''}: ${err.message}`);
    } else {
      log.error(`[${account.id}] poll failed: ${err.message}`);
    }
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
    }));
}

// Random delay in [minPollMs, maxPollMs] so the polling cadence isn't a fixed,
// detectable pattern (helps avoid rate-limit/ban flags).
function nextDelay() {
  const min = NETRADYNE.minPollMs;
  const max = Math.max(NETRADYNE.maxPollMs || min, min);
  return Math.floor(min + Math.random() * (max - min));
}

const scheduled = new Set(); // accountIds with an active poll loop

export function startPolling() {
  if (process.env.NETRADYNE_ENABLED === '0') {
    log.info('Netradyne polling disabled (NETRADYNE_ENABLED=0)');
    return;
  }

  // Start a self-rescheduling loop for one account. The loop re-reads the current
  // account list every cycle, so credential changes are picked up and a deleted
  // account stops polling on its own.
  const startLoop = (id, initialDelay) => {
    if (scheduled.has(id)) return;
    scheduled.add(id);
    const loop = async () => {
      if (!scheduled.has(id)) return;
      const account = netradyneAccounts().find((a) => a.id === id);
      if (!account) { scheduled.delete(id); log.info(`[${id}] account gone — Netradyne polling stopped`); return; }
      await pollAccount(account);
      if (scheduled.has(id)) {
        const delay = nextDelay();
        setTimeout(loop, delay);
        log.info(`[${id}] next Netradyne poll in ${Math.round(delay / 1000)}s`);
      }
    };
    setTimeout(loop, initialDelay);
  };

  // Reconcile the running loops against the current account list. Runs at startup
  // and periodically, so accounts added/removed while the server is up are picked
  // up WITHOUT a restart (previously the account list was snapshotted once at boot).
  const reconcile = () => {
    const accounts = netradyneAccounts();
    const currentIds = new Set(accounts.map((a) => a.id));
    for (const id of scheduled) if (!currentIds.has(id)) scheduled.delete(id); // stop removed
    accounts.forEach((account, i) => {
      if (scheduled.has(account.id)) return;
      // Stagger new loops so accounts don't all hit Netradyne at once.
      startLoop(account.id, i * 15000 + Math.floor(Math.random() * 10000));
      log.info(`Netradyne polling scheduled (randomized ${Math.round(NETRADYNE.minPollMs / 1000)}–${Math.round((NETRADYNE.maxPollMs || NETRADYNE.minPollMs) / 1000)}s): ${account.name}`);
    });
    if (!accounts.length) log.info('No accounts with Netradyne credentials — waiting');
  };

  reconcile();
  setInterval(reconcile, 60000);
}
