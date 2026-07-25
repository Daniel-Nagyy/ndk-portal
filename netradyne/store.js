// netradyne/store.js

const alerts = [];

/* -------------------------------------------------- */
/*  Seed data – remove after testing                  */
/* -------------------------------------------------- */
const now = Date.now();


/* -------------------------------------------------- */
/*  Store logic                                       */
/* -------------------------------------------------- */

export function getAlerts() {
  return alerts;
}
// netradyne/store.js (append at the end)
export function updateAlertStatus(id, newStatus) {
  const alert = alerts.find(a => a.id === id);
  if (alert) {
    alert.status = newStatus;
    alert.updatedAt = new Date().toISOString();
    return alert;
  }
  return null;
}
export function addAlerts(newAlerts) {
  const added = [];
  for (const alert of newAlerts) {
    if (!alerts.some(a => a.externalAlertId === alert.externalAlertId)) {
      alert.id = alert.id || crypto.randomUUID();
      alert.createdAt = alert.createdAt || new Date().toISOString();
      alerts.push(alert);
      added.push(alert);
    }
  }
  return added;
}

// Keep only last 1000 alerts to limit memory
setInterval(() => {
  if (alerts.length > 1000) alerts.splice(0, alerts.length - 1000);
}, 60000);