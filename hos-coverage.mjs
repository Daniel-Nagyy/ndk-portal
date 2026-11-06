// hos-coverage.mjs — can the driver assigned to a recap row legally finish it?
//
// One implementation, used by the Daily Recap badge (via /api/recap-hos) and by
// the alert engine, so the page and the notification can never disagree.
//
// The three checks the dispatcher asked for:
//   1. the 10-hour reset is actually complete,
//   2. cycle hours left cover the block,
//   3. the 11-hour drive and 14-hour shift clocks cover the block.
//
// A driver we cannot confidently match to Geotab is reported as UNKNOWN, never
// as OK. A missing match looks exactly like a healthy driver if you let it, and
// a false green here puts someone over hours.

export const VERDICT = {
  OK: "OK",
  SHORT: "SHORT",       // matched, and provably cannot finish the block
  UNKNOWN: "UNKNOWN",   // no confident driver match, or no HOS data
  PARTIAL: "PARTIAL",   // matched, clocks fine, but the block length is unknown
};

const DRIVE_LIMIT_MIN = 11 * 60;
const SHIFT_LIMIT_MIN = 14 * 60;

// --- names -----------------------------------------------------------------

// Relay writes "Steven ANTHONY Frederick", Geotab "Steven Frederick". Strip
// punctuation and case so the two can be compared at all.
export function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Generational suffixes are written on the Relay roster and usually not in
// Geotab, so "Angel Gutierrez JR" has to reach "Angel Gutierrez".
const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

// First and last token only, which is what survives middle names and initials.
function nameKey(value) {
  const parts = normalizeName(value).split(" ").filter(Boolean);
  while (parts.length > 2 && SUFFIXES.has(parts[parts.length - 1])) parts.pop();
  if (parts.length < 2) return parts[0] || "";
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

// Build a lookup over the Geotab readiness rows. Any key that two different
// drivers share is dropped rather than resolved: guessing between two people
// is worse than admitting we do not know which one is assigned.
export function buildDriverIndex(hosDrivers = []) {
  const exact = new Map();
  const loose = new Map();
  const ambiguous = new Set();

  const add = (map, key, driver) => {
    if (!key) return;
    const seen = map.get(key);
    if (seen && seen.id !== driver.id) {
      ambiguous.add(key);
      return;
    }
    map.set(key, driver);
  };

  for (const driver of hosDrivers) {
    const name = driver.driverName || driver.name || "";
    add(exact, normalizeName(name), driver);
    add(loose, nameKey(name), driver);
  }
  for (const key of ambiguous) {
    exact.delete(key);
    loose.delete(key);
  }
  return { exact, loose, ambiguous };
}

export function matchDriver(index, assignedName) {
  const full = normalizeName(assignedName);
  if (!full) return { driver: null, reason: "no driver on the row" };
  if (index.ambiguous.has(full) || index.ambiguous.has(nameKey(assignedName))) {
    return { driver: null, reason: "more than one Geotab driver matches that name" };
  }
  const hit = index.exact.get(full) || index.loose.get(nameKey(assignedName));
  if (!hit) return { driver: null, reason: "no Geotab driver matches that name" };
  return { driver: hit, reason: null };
}

// --- block length ----------------------------------------------------------

function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// Blocks routinely run past midnight, so an end earlier than the start is the
// next day rather than a negative duration.
export function blockMinutes(row = {}) {
  const start = toMinutes(row.requestedStart);
  const end = toMinutes(row.scheduledFinal);
  if (start == null || end == null) return null;
  const span = end - start;
  return span > 0 ? span : span + 24 * 60;
}

// --- the verdict -----------------------------------------------------------

function fmt(minutes) {
  if (minutes == null) return "--";
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}h ${String(abs % 60).padStart(2, "0")}m`;
}

// `row` is a recap row, `driver` a readiness record from geotab.mjs.
export function coverageFor(row, driver, { now = new Date() } = {}) {
  const need = blockMinutes(row);
  const block = {
    minutes: need,
    display: need == null ? null : fmt(need),
    start: row.requestedStart || null,
    end: row.scheduledFinal || null,
  };

  if (!driver) {
    return { verdict: VERDICT.UNKNOWN, block, reasons: [], detail: null };
  }
  if (driver.readiness === "NO LOGS" || driver.readiness === "Error") {
    return {
      verdict: VERDICT.UNKNOWN,
      block,
      reasons: [driver.readiness === "Error" ? "Geotab returned an error for this driver" : "no duty logs in Geotab"],
      detail: null,
    };
  }

  const detail = {
    driverName: driver.driverName || driver.name || "",
    status: driver.currentStatus || driver.status || null,
    resetComplete: driver.readiness === "READY",
    resetMinutesLeft: driver.minutesLeft ?? null,
    cycleMinutes: driver.cycleRemainingMinutes ?? null,
    driveMinutes: driver.drivingMinutes ?? null,
    shiftMinutes: driver.workdayMinutes ?? null,
  };

  const reasons = [];

  // 1. The 10-hour reset. "NOT READY" covers both a rest still running and a
  //    driver who is mid-shift and so has not reset at all; the two need
  //    different wording or the dispatcher cannot tell what to do about it.
  if (!detail.resetComplete) {
    if (detail.resetMinutesLeft != null && detail.resetMinutesLeft > 0) {
      reasons.push(`10-hour reset not finished — ${fmt(detail.resetMinutesLeft)} still to go`);
    } else {
      reasons.push(`no 10-hour reset — currently ${detail.status || "on duty"}`);
    }
  }

  // 2/3. Clocks against the block.
  //
  // Drive and shift are capped at their own legal maximums before comparing.
  // A 12-hour block does not mean 12 hours of driving — the 11-hour limit makes
  // that impossible for anyone — so comparing the raw block length against the
  // drive clock would flag every long tour, including a driver who just came
  // off a full reset. Capping asks the real question: has this driver got as
  // much of that clock as the block could possibly consume? Cycle is not capped,
  // because every minute of the block really does come off the cycle.
  const clocks = [
    ["cycle hours", detail.cycleMinutes, null],
    ["drive time", detail.driveMinutes, DRIVE_LIMIT_MIN],
    ["shift time", detail.shiftMinutes, SHIFT_LIMIT_MIN],
  ];
  for (const [label, left, cap] of clocks) {
    if (left == null) continue;
    if (left <= 0) {
      reasons.push(`${label} exhausted`);
      continue;
    }
    if (need == null) continue;
    const required = cap == null ? need : Math.min(need, cap);
    if (left < required) {
      reasons.push(`${label} ${fmt(left)} left, block needs ${fmt(required)}`);
    }
  }

  if (reasons.length) return { verdict: VERDICT.SHORT, block, reasons, detail };
  if (need == null) {
    return {
      verdict: VERDICT.PARTIAL,
      block,
      reasons: ["block start or end time missing — clocks look fine but the block length could not be checked"],
      detail,
    };
  }
  return { verdict: VERDICT.OK, block, reasons: [], detail };
}

// Verdicts for every row of a day's recap, keyed by row id.
export function coverageForRows(rows = [], hosDrivers = [], options = {}) {
  const index = buildDriverIndex(hosDrivers);
  const out = {};
  for (const row of rows) {
    const { driver, reason } = matchDriver(index, row.driverAssigned);
    const result = coverageFor(row, driver, options);
    if (!driver && reason) result.reasons = [reason];
    out[row.id] = result;
  }
  return out;
}

// The alert a SHORT verdict turns into. Lives here, beside the rule that
// produced it, so the Telegram message and the badge cannot drift apart and
// the wording can be tested without a Geotab or a Telegram round trip.
export function coverageAlert(accountName, row, result) {
  const block = row.blockId || "unknown block";
  const when = result.block.start ? ` starting ${result.block.start}` : "";
  return {
    title: `⛔ Not enough HOS — ${row.driverAssigned}`,
    body: `${block}${when}: ${result.reasons[0]}`,
    tag: `hos-coverage-${row.id}`,
    telegramText: [
      "⛔ HOS COVERAGE",
      `Driver: ${row.driverAssigned}`,
      `Block: ${block}${when}`,
      result.block.display ? `Block length: ${result.block.display}` : null,
      "",
      ...result.reasons.map((r) => `• ${r}`),
      "",
      `Account: ${accountName}`,
    ].filter((line) => line !== null).join("\n"),
  };
}
