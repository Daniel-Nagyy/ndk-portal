// ingest-store.mjs — in-memory live data pushed by the browser extension,
// partitioned by account (Relay late items + Geotab HOS rows).
const store = new Map(); // accountId -> { lateItems, hos, siteState, *UpdatedAt }

function slot(accountId) {
  let s = store.get(accountId);
  if (!s) {
    s = { lateItems: [], hos: [], siteState: [], lateUpdatedAt: null, hosUpdatedAt: null, siteUpdatedAt: null };
    store.set(accountId, s);
  }
  // Older slots predate siteState; fill it in rather than returning undefined.
  if (!s.siteState) { s.siteState = []; s.siteUpdatedAt = s.siteUpdatedAt || null; }
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

// Live site presence, pushed by the extension. One entry per driver currently on
// a tour, carrying the timestamps of his most recent stop events:
//   { driverName, siteName?, arrivedAt?, departedAt?, inSite?, tripId?, blockId? }
//
// Inside-a-site is decided the way dispatch reads the board: a driver who checked
// in and is due to DEPART next is inside; one whose last event was a departure is
// back on the road. Whichever timestamp is newer wins, so a driver who arrived,
// departed and arrived again reads as inside. An explicit `inSite` boolean, if the
// extension sends one, overrides the derivation.
//
// A driver with neither timestamp is UNKNOWN, not "outside" - the engine stays
// quiet rather than guessing about someone it has no events for.
function presenceOf(arrivedAt, departedAt, explicit) {
  const arrived = arrivedAt ? Date.parse(arrivedAt) : NaN;
  const departed = departedAt ? Date.parse(departedAt) : NaN;
  const hasArrived = Number.isFinite(arrived);
  const hasDeparted = Number.isFinite(departed);

  let lastEventAt = null;
  let lastEvent = "";
  if (hasArrived && hasDeparted) {
    lastEventAt = Math.max(arrived, departed);
    lastEvent = arrived >= departed ? "arrival" : "departure";
  } else if (hasArrived) {
    lastEventAt = arrived;
    lastEvent = "arrival";
  } else if (hasDeparted) {
    lastEventAt = departed;
    lastEvent = "departure";
  }

  let state;
  if (typeof explicit === "boolean") state = explicit ? "in" : "out";
  else if (!lastEvent) state = "unknown";
  else state = lastEvent === "arrival" ? "in" : "out";

  return { state, lastEvent, lastEventAt };
}

export function setSiteState(accountId, items) {
  const s = slot(accountId);
  s.siteState = (Array.isArray(items) ? items : [])
    .map((item) => {
      const arrivedAt = item.arrivedAt || item.arrival || item.checkInAt || "";
      const departedAt = item.departedAt || item.departure || "";
      const explicit = typeof item.inSite === "boolean" ? item.inSite : undefined;
      const { state, lastEvent, lastEventAt } = presenceOf(arrivedAt, departedAt, explicit);
      return {
        driverName: String(item.driverName || item.driver || "").trim(),
        siteName: String(item.siteName || item.site || item.stop || "").trim(),
        arrivedAt,
        departedAt,
        state,          // "in" | "out" | "unknown"
        inSite: state === "in",
        lastEvent,      // "arrival" | "departure" | ""
        lastEventAt,    // epoch ms or null
        tripId: String(item.tripId || "").trim(),
        blockId: String(item.blockId || "").trim(),
      };
    })
    .filter((item) => item.driverName);
  s.siteUpdatedAt = new Date().toISOString();
  return s.siteState.length;
}

export function getLateItems(accountId) { return store.get(accountId)?.lateItems || []; }
export function getHos(accountId) { return store.get(accountId)?.hos || []; }
export function getSiteState(accountId) { return store.get(accountId)?.siteState || []; }
export function getSiteUpdatedAt(accountId) { return store.get(accountId)?.siteUpdatedAt || null; }

export function getIngestStatus(accountId) {
  const s = store.get(accountId);
  return {
    lateUpdatedAt: s?.lateUpdatedAt || null,
    hosUpdatedAt: s?.hosUpdatedAt || null,
    siteUpdatedAt: s?.siteUpdatedAt || null,
    lateCount: s?.lateItems?.length || 0,
    hosCount: s?.hos?.length || 0,
    siteCount: s?.siteState?.length || 0,
    siteInCount: (s?.siteState || []).filter((d) => d.state === "in").length,
    siteOutCount: (s?.siteState || []).filter((d) => d.state === "out").length,
  };
}
