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

async function pollAccount(account) {
  if (running.has(account.id)) return;
  running.add(account.id);
  try {
    const ctx = await getAuthenticatedContext(account);
    const raw = await scrapeAlerts(ctx);
    const added = addAlerts(account.id, raw);
    if (added.length > 0) {
      log.info(`[${account.id}] ${added.length} new alerts`);
      await notifyAlerts(account, added);
    }
  } catch (err) {
    log.error(`[${account.id}] poll failed: ${err.message}`);
  } finally {
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
