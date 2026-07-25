// netradyne/notifier.js — route scraped alerts to an account's users.
import { notifyAccount } from '../notify.mjs';
import { log } from './logger.js';

// account = { id, name }; alerts = newly-added alert objects
export async function notifyAlerts(account, alerts) {
  for (const alert of alerts) {
    const time = alert.occurredAt
      ? new Date(alert.occurredAt).toLocaleString('en-US', { timeZone: 'America/New_York' })
      : 'Unknown time';

    const isCritical = alert.severity === 'Severe';
    const emoji = isCritical ? '🚨' : (alert.severity === 'Moderate' ? '⚠️' : '📹');
    const sevText = alert.severity ? `${alert.severity} ` : '';
    const title = `${emoji} ${sevText}${alert.eventType || 'Netradyne Alert'}`;
    const body = `${alert.driverName || 'Unknown driver'} — Vehicle ${alert.vehicleNumber || 'N/A'} · ${time}`;
    const telegramText = [
      `${emoji} Netradyne · ${alert.severity || 'Alert'}`,
      `Event: ${alert.eventType || 'Unknown'}${alert.eventCategory ? ` (${alert.eventCategory})` : ''}`,
      `Driver: ${alert.driverName || 'Unknown'}`,
      `Vehicle: ${alert.vehicleNumber || 'N/A'}`,
      `Time: ${time}`,
      `Account: ${account.name}`,
    ].join('\n');

    try {
      await notifyAccount(account.id, {
        title, body,
        tag: `nd-${alert.externalAlertId}`,
        critical: isCritical,
        url: '/index.html',
        telegramText,
      });
      log.info(`[${account.id}] routed Netradyne alert ${alert.externalAlertId}`);
    } catch (e) {
      log.error(`[${account.id}] notify failed: ${e.message}`);
    }
  }
}
