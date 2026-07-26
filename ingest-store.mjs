// ingest-store.mjs — in-memory live data pushed by the browser extension,
// partitioned by account (Relay late items + Geotab HOS rows).
const store = new Map(); // accountId -> { lateItems, hos, lateUpdatedAt, hosUpdatedAt }

function slot(accountId) {
  let s = store.get(accountId);
  if (!s) { s = { lateItems: [], hos: [], lateUpdatedAt: null, hosUpdatedAt: null }; store.set(accountId, s); }
  return s;
}

export function setLateItems(accountId, items) {
  const s = slot(accountId);
  s.lateItems = Array.isArray(items) ? items : [];
  s.lateUpdatedAt = new Date().toISOString();
}

export function setHos(accountId, items) {
  const s = slot(accountId);
  s.hos = Array.isArray(items) ? items : [];
  s.hosUpdatedAt = new Date().toISOString();
}

export function getLateItems(accountId) { return store.get(accountId)?.lateItems || []; }
export function getHos(accountId) { return store.get(accountId)?.hos || []; }

export function getIngestStatus(accountId) {
  const s = store.get(accountId);
  return {
    lateUpdatedAt: s?.lateUpdatedAt || null,
    hosUpdatedAt: s?.hosUpdatedAt || null,
    lateCount: s?.lateItems?.length || 0,
    hosCount: s?.hos?.length || 0,
  };
}
