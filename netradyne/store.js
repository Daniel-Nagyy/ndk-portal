// netradyne/store.js — in-memory alert store, partitioned by account.
import crypto from 'node:crypto';

const alerts = []; // each alert carries an accountId

export function getAlerts(accountId) {
  return accountId ? alerts.filter(a => a.accountId === accountId) : alerts;
}

export function updateAlertStatus(id, newStatus) {
  const alert = alerts.find(a => a.id === id);
  if (alert) {
    alert.status = newStatus;
    alert.updatedAt = new Date().toISOString();
    return alert;
  }
  return null;
}

// Dedupe within an account by externalAlertId; tags each alert with accountId.
export function addAlerts(accountId, newAlerts) {
  const added = [];
  for (const alert of newAlerts) {
    if (!alerts.some(a => a.accountId === accountId && a.externalAlertId === alert.externalAlertId)) {
      alert.accountId = accountId;
      alert.id = alert.id || crypto.randomUUID();
      alert.createdAt = alert.createdAt || new Date().toISOString();
      alerts.push(alert);
      added.push(alert);
    }
  }
  return added;
}

// Keep only the most recent 1000 alerts to bound memory.
setInterval(() => {
  if (alerts.length > 1000) alerts.splice(0, alerts.length - 1000);
}, 60000);
