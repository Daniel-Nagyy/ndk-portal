// yard.mjs — "is this truck sitting in the yard right now?"
//
// Pure geometry and matching, deliberately kept free of any Geotab or DB calls
// so it can be tested exactly. geotab.mjs supplies the live vehicle positions
// and zone polygons; this decides what is inside what, and which Truck Tracker
// row a Geotab vehicle corresponds to.

// Which zones count as "the yard". Geotab zone names vary by customer, so match
// loosely rather than demanding one exact string.
const DEFAULT_YARD_PATTERNS = [/\byard\b/i, /\bdomicile\b/i, /\bterminal\b/i];

export function isYardZone(zone, patterns = DEFAULT_YARD_PATTERNS) {
  const name = String(zone?.name || "");
  if (!name) return false;
  return patterns.some((re) => re.test(name));
}

// Ray casting. Geotab zone points are {x: longitude, y: latitude}; a point on or
// very near an edge counts as inside, because a truck parked on the fence line
// should not flicker in and out of the yard.
export function pointInPolygon(lat, lon, points) {
  if (!Array.isArray(points) || points.length < 3) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = Number(points[i]?.x), yi = Number(points[i]?.y);
    const xj = Number(points[j]?.x), yj = Number(points[j]?.y);
    if (![xi, yi, xj, yj].every(Number.isFinite)) continue;

    const intersects = (yi > lat) !== (yj > lat)
      && lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

// Geotab names a vehicle all sorts of ways ("521243", "Truck 521243",
// "521243 - Freightliner"). The Truck Tracker stores a bare number. Compare on
// the digit run, which is the only part both sides agree on.
export function truckKey(value) {
  const digits = String(value || "").match(/\d{3,}/g);
  return digits && digits.length ? digits[0] : "";
}

// A Geotab device is retired when activeTo is in the past.
export function isActiveDevice(device, now = Date.now()) {
  const to = device?.activeTo ? Date.parse(device.activeTo) : NaN;
  if (!Number.isFinite(to)) return true;
  // Geotab uses a year-2050 sentinel for "no end date".
  return to > now;
}

// Positions older than this are not trusted to say where a truck is now.
const DEFAULT_MAX_FIX_AGE_MS = 60 * 60 * 1000;

// Join live Geotab state to the Truck Tracker.
//
//   devices   [{ id, name, licensePlate?, activeTo? }]
//   statuses  [{ device: { id }, latitude, longitude, dateTime, isDeviceCommunicating? }]
//   zones     [{ name, points: [{x, y}] }]   (already filtered to yard zones)
//   trucks    Truck Tracker rows [{ truckNumber, status, fuel, ... }]
//
// Returns only trucks that are BOTH inside a yard zone and marked active in the
// tracker — the question asked is "what can I dispatch from the yard", so a
// truck sitting in the yard with a blown engine is not an answer.
export function trucksInYard({ devices, statuses, zones, trucks, fuel = "", now = Date.now(), maxFixAgeMs = DEFAULT_MAX_FIX_AGE_MS }) {
  const statusByDevice = new Map();
  for (const s of statuses || []) {
    const id = s?.device?.id || s?.deviceId;
    if (id) statusByDevice.set(id, s);
  }

  const wantFuel = String(fuel || "").trim().toUpperCase();

  // The Truck Tracker can hold more than one row per truck number (a truck that
  // was written up twice, or re-added). Picking whichever row came last is a
  // coin flip, and the wrong side of it tells dispatch a broken truck is ready.
  // So out-of-service always wins; between rows of equal standing, the most
  // recently updated one does.
  const trackerByKey = new Map();
  for (const t of trucks || []) {
    const key = truckKey(t?.truckNumber);
    if (!key) continue;
    const existing = trackerByKey.get(key);
    if (!existing) { trackerByKey.set(key, t); continue; }

    const outOfService = (row) => {
      const st = String(row?.status || "").trim().toLowerCase();
      return st === "down" || st === "unavailable";
    };
    if (outOfService(existing) && !outOfService(t)) continue;          // keep the worse one
    if (!outOfService(existing) && outOfService(t)) { trackerByKey.set(key, t); continue; }

    const ts = (row) => Date.parse(row?.updatedAt || "") || 0;
    if (ts(t) >= ts(existing)) trackerByKey.set(key, t);
  }

  const inYard = [];
  const skipped = { noPosition: 0, staleFix: 0, outsideYard: 0, notInTracker: 0, notActive: 0, wrongFuel: 0, retired: 0 };

  for (const device of devices || []) {
    if (!isActiveDevice(device, now)) { skipped.retired += 1; continue; }

    const status = statusByDevice.get(device.id);
    const lat = Number(status?.latitude);
    const lon = Number(status?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) { skipped.noPosition += 1; continue; }

    const fixAt = status?.dateTime ? Date.parse(status.dateTime) : NaN;
    if (Number.isFinite(fixAt) && now - fixAt > maxFixAgeMs) { skipped.staleFix += 1; continue; }

    const zone = (zones || []).find((z) => pointInPolygon(lat, lon, z?.points));
    if (!zone) { skipped.outsideYard += 1; continue; }

    const key = truckKey(device.name) || truckKey(device.licensePlate);
    const tracked = key ? trackerByKey.get(key) : null;
    if (!tracked) { skipped.notInTracker += 1; continue; }

    // "Active" in the Truck Tracker: anything not explicitly out of service.
    const trackerStatus = String(tracked.status || "").trim().toLowerCase();
    if (trackerStatus === "down" || trackerStatus === "unavailable") { skipped.notActive += 1; continue; }

    if (wantFuel && String(tracked.fuel || "").trim().toUpperCase() !== wantFuel) {
      skipped.wrongFuel += 1;
      continue;
    }

    inYard.push({
      truckNumber: tracked.truckNumber,
      fuel: tracked.fuel || "",
      status: tracked.status || "",
      make: tracked.make || "",
      vehicleType: tracked.vehicleType || "",
      zone: zone.name || "",
      geotabName: device.name || "",
      positionAt: status?.dateTime || null,
    });
  }

  inYard.sort((a, b) => {
    const na = Number(a.truckNumber), nb = Number(b.truckNumber);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a.truckNumber).localeCompare(String(b.truckNumber));
  });

  return { trucks: inYard, skipped };
}

// The Telegram reply. Kept here so its formatting is covered by the same tests.
export function formatYardReply(result, { fuel = "", zones = [] } = {}) {
  const label = fuel ? `${fuel.toUpperCase()} trucks` : "Trucks";
  const list = result?.trucks || [];

  if (!list.length) {
    const where = zones.length ? ` in ${zones.map((z) => z.name).join(", ")}` : " in the yard";
    return `<b>${label}${where}: none</b>\nNothing active is parked there right now.`;
  }

  const lines = list.map((t) => {
    const extra = [t.fuel, t.make].filter(Boolean).join(" ");
    return `• ${t.truckNumber}${extra ? ` — ${extra}` : ""}${t.zone ? ` (${t.zone})` : ""}`;
  });

  return `<b>${label} in the yard: ${list.length}</b>\n${lines.join("\n")}`;
}
