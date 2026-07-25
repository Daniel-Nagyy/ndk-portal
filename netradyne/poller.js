// netradyne/poller.js
import { getAuthenticatedContext } from './auth.js';
import { scrapeAlerts } from './scraper.js';
import { addAlerts } from './store.js';
import { notifyAlerts } from './notifier.js';
import { log } from './logger.js';
import { NETRADYNE } from './config.js';

let running = false;

export async function poll() {
  if (running) return;
  running = true;
  try {
    const ctx = await getAuthenticatedContext();
    const rawAlerts = await scrapeAlerts(ctx);
    const newAlerts = addAlerts(rawAlerts);
    if (newAlerts.length > 0) {
      log.info(`${newAlerts.length} new alerts`);
      await notifyAlerts(newAlerts);
    }
  } catch (err) {
    log.error('Poll failed: ' + err.message);
  } finally {
    running = false;
  }
}

export function startPolling() {
  poll();
  setInterval(poll, NETRADYNE.pollInterval);
  log.info(`Netradyne polling started every ${NETRADYNE.pollInterval}ms`);
}