// netradyne/store.js — in-memory alert store, partitioned by account.
import crypto from 'node:crypto';

const alerts = []; // each alert carries an accountId

export function getAlerts(accountId) {
  return accountId ? alerts.filter(a => a.accountId === accountId) : alerts;
}

// Drop any stored alert whose account no longer exists (e.g. after an account is
// deleted). Keeps the superadmin "all accounts" view from showing ghost data.
export function pruneToAccounts(validAccountIds) {
  const valid = new Set(validAccountIds);
  for (let i = alerts.length - 1; i >= 0; i--) {
    if (!valid.has(alerts[i].accountId)) alerts.splice(i, 1);
  }
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
