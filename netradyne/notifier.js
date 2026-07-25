import { sendTelegramMessage } from '../hos-alerts.mjs';
import { log } from './logger.js';

export async function notifyAlerts(alerts) {
  for (const alert of alerts) {
    const time = alert.occurredAt
      ? new Date(alert.occurredAt).toLocaleString('en-US', { timeZone: 'America/New_York' })
      : 'Unknown time';

    const text = [
      `⚠️ Netradyne Alert`,
      `Driver: ${alert.driverName || 'Unknown'}`,
      `Vehicle: ${alert.vehicleNumber || 'N/A'}`,
      `Type: ${alert.eventType || 'Unknown'}`,
      `Severity: ${alert.severity || 'N/A'}`,
      `Time: ${time}`,
    ].join('\n');

    try {
      await sendTelegramMessage(text);
      log.info(`Telegram sent for alert ${alert.externalAlertId}`);
    } catch (e) {
      log.error('Telegram failed: ' + e.message);
    }
  }
}