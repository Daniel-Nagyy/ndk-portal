// netradyne/scraper.js — collect alerts via Netradyne's own REST API.
// Instead of scraping the DOM (brittle, changes with every UI redesign), we load
// the alerts page and capture the authenticated `alertsDataLite` response the
// Angular app itself makes. This is far more robust and needs no token handling.
import { NETRADYNE } from './config.js';
import { log } from './logger.js';

const ALERTS_API_RE = /\/tenants\/\d+\/alertsDataLite/;

export async function scrapeAlerts(context) {
  const page = await context.newPage();
  const payloads = [];

  page.on('response', async (resp) => {
    if (!ALERTS_API_RE.test(resp.url())) return;
    try {
      const json = await resp.json();
      if (json && json.data && Array.isArray(json.data.alerts)) payloads.push(json.data);
    } catch (_) { /* ignore non-JSON */ }
  });

  try {
    await page.goto(NETRADYNE.url, { waitUntil: 'networkidle', timeout: 30000 });
    // Wait for the app to fire at least one alertsDataLite request.
    await page.waitForResponse((r) => ALERTS_API_RE.test(r.url()), { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2500);

    // Merge all captured payloads, dedupe by alert_id, resolve vehicle numbers.
    const byId = new Map();
    const vehicleIdMap = {};
    for (const data of payloads) {
      Object.assign(vehicleIdMap, data.vehicleIdMap || {});
      for (const a of data.alerts || []) byId.set(a.alert_id, a);
    }

    const alerts = [...byId.values()].map((a) => {
      const veh = vehicleIdMap[a.vehicle_id] || {};
      return {
        externalAlertId: String(a.alert_id),
        driverName: a.driver_name || '',
        driverId: a.driver_id != null ? String(a.driver_id) : '',
        vehicleNumber: veh.nickname || veh.registration_number || a.vehicle_number || '',
        eventType: a.event_description || a.event_code || 'Alert',
        eventCategory: a.event_description || '',
        occurredAt: a.time_stamp ? new Date(a.time_stamp).toISOString() : '',
        durationSeconds: a.alert_duration || 0,
        status: 'New',
        severity: a.alert_severity != null ? String(a.alert_severity) : '',
        rawData: a,
      };
    });

    log.info(`Collected ${alerts.length} alerts via API`);
    return alerts;
  } finally {
    await page.close().catch(() => {});
  }
}
