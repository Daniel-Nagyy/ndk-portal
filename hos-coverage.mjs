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
  DONE: "DONE",         // the block has already ended; nothing to warn about
};

// Where the block sits relative to now. The question to ask changes completely
// between them, which is the whole reason this is time-aware:
//
//   upcoming — will the driver be legal when the block STARTS? A driver still
//              on duty needs 10 hours off first, and that has to fit before the
//              start time.
//   running  — the driver is on the block now. Driving is expected, not a
//              fault. The only question is whether the clocks reach the END.
//   done     — the block is over. Say nothing.
export const PHASE = { UPCOMING: "upcoming", RUNNING: "running", DONE: "done", UNSCHEDULED: "unscheduled" };

const WORKING_STATUSES = new Set(["ON", "D", "YM"]);
const RESET_MINUTES = 10 * 60;

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

// --- when is the block? -----------------------------------------------------

// Recap times are wall-clock in the operation's timezone; the container runs in
// UTC. Resolving "2026-11-05 08:30 in America/New_York" to a real instant is
// the difference between a correct phase and a five-hour error.
export const PORTAL_TIMEZONE = process.env.PORTAL_TIMEZONE || "America/New_York";

function zoneOffsetMs(ts, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
      .formatToParts(new Date(ts))
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second)
  );
  return asUtc - ts;
}

// Wall-clock date + HH:MM in a zone -> epoch ms. Applied twice so a time that
// lands near a DST change is corrected with the offset actually in force.
export function zonedToEpoch(dateIso, hhmm, timeZone = PORTAL_TIMEZONE) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateIso || "").trim());
  const minutes = toMinutes(hhmm);
  if (!d || minutes == null) return null;
  const naive = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), 0, 0) + minutes * 60000;
  let ts = naive;
  for (let i = 0; i < 2; i += 1) ts = naive - zoneOffsetMs(ts, timeZone);
  return ts;
}

// The block's real start and end instants, and which phase it is in.
export function blockWindow(row = {}, { now = new Date(), timeZone = PORTAL_TIMEZONE } = {}) {
  const span = blockMinutes(row);
  const startTs = zonedToEpoch(row.dailyDate || row.tripDate, row.requestedStart, timeZone);
  if (span == null || startTs == null) {
    return { phase: PHASE.UNSCHEDULED, span, startTs: null, endTs: null, toStart: null, toEnd: null };
  }
  const endTs = startTs + span * 60000;
  const nowTs = now instanceof Date ? now.getTime() : Number(now);
  const phase = nowTs >= endTs ? PHASE.DONE : nowTs >= startTs ? PHASE.RUNNING : PHASE.UPCOMING;
  return {
    phase, span, startTs, endTs,
    toStart: Math.round((startTs - nowTs) / 60000),
    toEnd: Math.round((endTs - nowTs) / 60000),
  };
}

// --- the verdict -----------------------------------------------------------

function fmt(minutes) {
  if (minutes == null) return "--";
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}h ${String(abs % 60).padStart(2, "0")}m`;
}

// `row` is a recap row, `driver` a readiness record from geotab.mjs.
//
// Returns { verdict, block, reasons, notes, detail, signature }. `signature` is
// a stable name for the problem ("running:drive,cycle") that does not move as
// the clock ticks down, so the alert cooldown keys on it instead of on wording
// that changes every poll.
export function coverageFor(row, driver, { now = new Date(), timeZone } = {}) {
  const win = blockWindow(row, { now, timeZone });
  const need = win.span;
  const block = {
    minutes: need,
    display: need == null ? null : fmt(need),
    start: row.requestedStart || null,
    end: row.scheduledFinal || null,
    phase: win.phase,
    minutesToStart: win.toStart,
    minutesToEnd: win.toEnd,
  };
  const bare = (verdict, reasons = [], detail = null) => ({ verdict, block, reasons, notes: [], detail, signature: `${verdict.toLowerCase()}:` });

  if (!driver) return bare(VERDICT.UNKNOWN);
  if (driver.readiness === "NO LOGS" || driver.readiness === "Error") {
    return bare(VERDICT.UNKNOWN, [
      driver.readiness === "Error" ? "Geotab returned an error for this driver" : "no duty logs in Geotab",
    ]);
  }

  const detail = {
    driverName: driver.driverName || driver.name || "",
    status: driver.currentStatus || driver.status || null,
    working: WORKING_STATUSES.has(driver.currentStatus || driver.status),
    resetComplete: driver.readiness === "READY",
    resetMinutesLeft: driver.minutesLeft ?? null,
    cycleMinutes: driver.cycleRemainingMinutes ?? null,
    driveMinutes: driver.drivingMinutes ?? null,
    shiftMinutes: driver.workdayMinutes ?? null,
    phase: win.phase,
  };

  // A block that has already finished is not a problem to report.
  if (win.phase === PHASE.DONE) {
    return { verdict: VERDICT.DONE, block, reasons: [], notes: [], detail, signature: "done:" };
  }

  const reasons = [];
  const notes = [];
  const failing = [];

  // True only when a reset is still AHEAD of the driver and will land before
  // the block starts. In that case the drive and shift clocks Geotab reports
  // now are stale — they will be back to 11h and 14h by the start, so checking
  // today's partial values would flag a driver who is going to be fine.
  //
  // A driver who has ALREADY completed their reset is the opposite case: their
  // current clocks are exactly the ones they will start with, so they must be
  // checked.
  let resetStillAhead = false;

  if (win.phase === PHASE.UPCOMING && !detail.resetComplete) {
    const toStart = win.toStart;
    if (detail.resetMinutesLeft != null && detail.resetMinutesLeft > 0) {
      // Resting now — does the rest finish before the block starts?
      if (detail.resetMinutesLeft > toStart) {
        reasons.push(
          `10-hour reset needs ${fmt(detail.resetMinutesLeft)} more but the block starts in ${fmt(toStart)}`
        );
        failing.push("reset");
      } else {
        resetStillAhead = true;
      }
    } else if (RESET_MINUTES > toStart) {
      // Still working, and a full 10 hours off no longer fits before the start.
      reasons.push(
        `still ${detail.status || "on duty"} — a 10-hour reset cannot finish before the ${row.requestedStart} start (${fmt(toStart)} away)`
      );
      failing.push("reset");
    } else {
      // There is room, but only if they stop in time. Worth saying, not worth
      // calling a failure: the driver has not broken anything yet.
      resetStillAhead = true;
      notes.push(`must go off duty within ${fmt(toStart - RESET_MINUTES)} to get a 10-hour reset before the start`);
    }
  }

  // How much of the block is still ahead of the driver. Mid-block, only the
  // remainder matters: hours already run are not a shortfall.
  const remaining = win.phase === PHASE.RUNNING ? win.toEnd : need;

  // Cycle is never restored by a 10-hour reset (only a 34-hour restart does
  // that), so it is always checked against what is left to run.
  const clocks = [["cycle hours", "cycle", detail.cycleMinutes, null]];
  if (!(win.phase === PHASE.UPCOMING && resetStillAhead)) {
    clocks.push(["drive time", "drive", detail.driveMinutes, DRIVE_LIMIT_MIN]);
    clocks.push(["shift time", "shift", detail.shiftMinutes, SHIFT_LIMIT_MIN]);
  }

  const tail = win.phase === PHASE.RUNNING ? "to finish the block" : "for the block";
  for (const [label, key, left, cap] of clocks) {
    if (left == null) continue;
    if (left <= 0) {
      reasons.push(`${label} exhausted`);
      failing.push(key);
      continue;
    }
    if (remaining == null) continue;
    const required = cap == null ? remaining : Math.min(remaining, cap);
    if (left < required) {
      reasons.push(`${label} ${fmt(left)} left, needs ${fmt(required)} ${tail}`);
      failing.push(key);
    }
  }

  const signature = `${win.phase}:${failing.sort().join(",")}`;
  if (reasons.length) return { verdict: VERDICT.SHORT, block, reasons, notes, detail, signature };
  if (win.phase === PHASE.UNSCHEDULED) {
    return {
      verdict: VERDICT.PARTIAL, block, notes, detail, signature,
      reasons: ["block start or end time missing — clocks look fine but the block could not be checked against them"],
    };
  }
  return { verdict: VERDICT.OK, block, reasons: [], notes, detail, signature };
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
