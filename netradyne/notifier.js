// netradyne/notifier.js — route scraped alerts to an account's users.
import { notifyAccount } from '../notify.mjs';
import { log } from './logger.js';

// account = { id, name }; alerts = newly-added alert objects
export async function notifyAlerts(account, alerts) {
  for (const alert of alerts) {
    const time = alert.occurredAt
      ? new Date(alert.occurredAt).toLocaleString('en-US', { timeZone: 'America/New_York' })
      : 'Unknown time';

    const title = `Netradyne — ${alert.eventType || 'Alert'}`;
    const body = `${alert.driverName || 'Unknown'} · ${alert.vehicleNumber || 'N/A'}${alert.severity ? ` · ${alert.severity}` : ''}`;
    const telegramText = [
      '⚠️ Netradyne Alert',
      `Account: ${account.name}`,
      `Driver: ${alert.driverName || 'Unknown'}`,
      `Vehicle: ${alert.vehicleNumber || 'N/A'}`,
      `Type: ${alert.eventType || 'Unknown'}`,
      `Severity: ${alert.severity || 'N/A'}`,
      `Time: ${time}`,
    ].join('\n');

    try {
      await notifyAccount(account.id, {
        title, body,
        tag: `nd-${alert.externalAlertId}`,
        url: '/index.html',
        telegramText,
      });
      log.info(`[${account.id}] routed Netradyne alert ${alert.externalAlertId}`);
    } catch (e) {
      log.error(`[${account.id}] notify failed: ${e.message}`);
    }
  }
}
