// netradyne/scraper.js — collect Expanded-View alert data via Netradyne's REST API.
// The Expanded View and Smart View both load the same `alertsDataLite` endpoint;
// the per-event severity shown in the Expanded View comes from the alert-type
// config (`getVisibleAlerts`: event_code -> alertSeverity/alertType). We capture
// both authenticated responses so severity, type and time match the Expanded View
// exactly — without brittle DOM scraping.
import { NETRADYNE } from './config.js';
import { log } from './logger.js';

const ALERTS_API_RE = /\/tenants\/\d+\/alertsDataLite/;
const VISIBLE_API_RE = /\/tenants\/\d+\/getVisibleAlerts/;

// Netradyne severity: 1 = Severe, 2 = Moderate, 3 = Low; recognition events = Positive.
function severityLabel(sev, alertType) {
  if (alertType && /STAR|POSITIVE|RECOGNITION|GREENZONE/i.test(alertType)) return 'Positive';
  return { 1: 'Severe', 2: 'Moderate', 3: 'Low' }[sev] || '';
}

// "DRIVER-DROWSINESS" -> "Driver Drowsiness" (matches the Expanded View category label).
function humanizeType(alertType, fallback) {
  if (!alertType) return fallback || 'Alert';
  return alertType
    .split(/[-_ ]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim() || (fallback || 'Alert');
}

export async function scrapeAlerts(context) {
  const page = await context.newPage();
  const alertPayloads = [];
  const alertTypeMap = {}; // event_code -> { desc, sev, type }

  page.on('response', async (resp) => {
    const url = resp.url();
    if (ALERTS_API_RE.test(url)) {
      try {
        const j = await resp.json();
        if (j && j.data && Array.isArray(j.data.alerts)) alertPayloads.push(j.data);
      } catch (_) {}
    } else if (VISIBLE_API_RE.test(url)) {
      try {
        const j = await resp.json();
        for (const s of (j && j.data && j.data.alertSubTypes) || []) {
          alertTypeMap[s.eventCode] = { desc: s.eventDescription, sev: s.alertSeverity, type: s.alertType };
        }
      } catch (_) {}
    }
  });

  try {
    await page.goto(NETRADYNE.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for the alert data (required) and the alert-type config (for severity,
    // shorter wait). Resolve as soon as the alert payload arrives instead of a
    // fixed long wait — that was adding seconds to every poll.
    await Promise.allSettled([
      page.waitForResponse((r) => ALERTS_API_RE.test(r.url()), { timeout: 20000 }),
      page.waitForResponse((r) => VISIBLE_API_RE.test(r.url()), { timeout: 8000 }),
    ]);
    await page.waitForTimeout(800);

    const byId = new Map();
    const vehicleIdMap = {};
    for (const data of alertPayloads) {
      Object.assign(vehicleIdMap, data.vehicleIdMap || {});
      for (const a of data.alerts || []) byId.set(a.alert_id, a);
    }

    const alerts = [...byId.values()].map((a) => {
      const veh = vehicleIdMap[a.vehicle_id] || {};
      const meta = alertTypeMap[a.event_code] || {};
      const sev = a.alert_severity != null ? a.alert_severity : meta.sev;
      return {
        externalAlertId: String(a.alert_id),
        driverName: a.driver_name || '',
        driverId: a.driver_id != null ? String(a.driver_id) : '',
        vehicleNumber: veh.nickname || veh.registration_number || a.vehicle_number || '',
        eventType: humanizeType(meta.type, a.event_description),   // e.g. "Driver Drowsiness"
        eventCategory: a.event_description || meta.desc || '',      // e.g. "Drowsy"
        occurredAt: a.time_stamp ? new Date(a.time_stamp).toISOString() : '',
        durationSeconds: a.alert_duration || 0,
        status: 'New',
        severity: severityLabel(sev, meta.type),                   // Severe / Moderate / Low / Positive
        rawData: a,
      };
    });

    log.info(`Collected ${alerts.length} alerts (severity from alert-type config)`);
    return alerts;
  } finally {
    await page.close().catch(() => {});
  }
}
