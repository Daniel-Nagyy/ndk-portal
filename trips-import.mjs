// trips-import.mjs — turning Amazon Relay "Trips" CSV exports into
// driver_shifts rows. Shared by the Driver Slots upload in the portal and by
// scripts/import-trips.mjs, so the two can never read the same file differently.

// Relay quotes any field holding a comma, so a plain split will not do.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.replace(/^﻿/, "").trim());
  return rows.slice(1)
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// Names that appear on blocks but do not work slots: yard jockeys, hostlers
// and shuttle drivers, who move a tractor one leg and hand it to the driver who
// actually runs the block. They turn up on many blocks a day, always alongside
// someone else, and listing them in Driver Slots makes it look as though a slot
// is covered when it is not.
//
// Kenno Clark: 20 blocks in nine days, 8 of them on 10/26 alone, every single
// one shared with another driver and never one he ran on his own.
//
// Lower case, matched against the driver name with runs of whitespace
// collapsed. Add a name here to keep it out of Driver Slots entirely.
export const NON_SLOT_DRIVERS = new Set([
  "kenno clark",
]);

const toIsoDate = (value) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || "");
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
};
// 0 = Monday, matching the dashboard.
const weekdayOf = (iso) => (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;

// Blocks start on the half hour: 07:30, 08:30 and so on. Trip-level exports
// report the driver's first STOP ARRIVAL instead, which is always at or after
// the block start -- he reports at the yard, then drives to it. So the block
// start is the half hour at or before that arrival, never the one after it.
//
// This used to round to the NEAREST half hour, which pushed a 15:27 arrival up
// to a 15:30 start: a block starting three minutes after the driver had
// already arrived at his first stop. Every arrival in the second half of an
// hour came out an hour late, so an afternoon slot read as the next one up.
//
// 19:45 becomes 19:30, 15:27 becomes 14:30, 14:30 stays 14:30, and 00:10
// becomes 23:30 the evening before rather than a time that does not exist.
export function normalizeStart(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!m) return "";
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  const snapped = Math.floor((minutes - 30) / 60) * 60 + 30;
  const wrapped = ((snapped % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:30`;
}

// Pull the shift rows out of one or more exports.
//
// The slot lives in the Operator ID (TJER_MGE_Solo1_Tractor_21_d1): carrier,
// domicile, solo type, tractor and which half of the week. Relay writes that
// field on block rows in some exports and on trip rows in others, so any row
// carrying one counts and the Block/Trip column is ignored.
//
// A shift is one BLOCK, and it starts at the earliest stop on that block.
//
// Relay's trip export writes one row per LEG, and the "Stop 1 ..." columns on
// each row describe that leg's own origin -- not the block's first stop. A
// block that runs past midnight therefore has legs dated the following day:
//
//   MGE45 -> MGE3                  10/27 14:45   <- the block really starts here
//   MGE3  -> SOUTHEAS_30233        10/27 14:59
//   SOUTHEAS_30233 -> GSP3         10/27 18:15
//   GSP3  -> MGE5                  10/28 01:15
//   MGE5  -> MGE45                 10/28 03:58
//
// Grouping those by each row's own date (the old "<operator id>|<date>" key)
// invented a second shift on 10/28 starting at 01:15, and that phantom then
// outranked the real 10/28 block starting 15:27, because the earliest time was
// picked by comparing clock times with no date attached. A driver who works
// afternoons showed up as working 01:30.
//
// So legs are grouped by Block ID and the start is the earliest full
// DATE AND TIME, which is also what the driver_shifts primary key has always
// expected. Re-importing the same block updates the row instead of adding one.
// Rows with no driver name are counted and reported, never guessed at.
export function blocksFromCsvs(files, { accountId, carrier, since, exclude } = {}) {
  const skipDrivers = exclude
    ? new Set([...exclude].map((n) => String(n).toLowerCase().replace(/\s+/g, " ").trim()))
    : NON_SLOT_DRIVERS;
  const seen = new Map();
  const carriers = {};
  let unnamed = 0;
  let otherCarrier = 0;
  let skippedDate = 0;
  let slotRows = 0;
  let nonSlot = 0;

  for (const file of files) {
    for (const row of parseCsv(file.text || "")) {
      const operator = (row["Operator ID"] || "").trim();
      if (!operator) continue;
      slotRows += 1;

      const isoDate = toIsoDate(row["Stop 1 Planned Arrival Date"]);
      if (!isoDate) continue;

      // A leg occasionally names two people ("Michael Moore;Kenno Clark"), which
      // is one tractor with two drivers on it, not a driver called that. Split
      // them so each is credited, and so an excluded name inside a pair is
      // still excluded instead of smuggling itself in as a new driver.
      const legDrivers = (row["Driver Name"] || "")
        .split(";")
        .map((name) => name.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      if (!legDrivers.length) { unnamed += 1; continue; }

      // Dropping the leg is enough: each driver's shift is keyed separately, so
      // the block still produces a shift for whoever actually ran it.
      const drivers = legDrivers.filter((name) => !skipDrivers.has(name.toLowerCase()));
      nonSlot += legDrivers.length - drivers.length;
      if (!drivers.length) continue;

      const parts = operator.split("_");
      const rowCarrier = parts[0] || "";
      carriers[rowCarrier || "?"] = (carriers[rowCarrier || "?"] || 0) + 1;
      if (carrier && rowCarrier.toUpperCase() !== String(carrier).toUpperCase()) {
        otherCarrier += 1;
        continue;
      }

      // Block-level exports carry one row per block and still fill Block ID.
      // The operator+date key is only a fallback for an export that omits it;
      // it cannot span midnight correctly, which is why it is not the default.
      //
      // The driver is part of the key because a block can change hands partway
      // through -- 43 of the 200 blocks in a typical week do. Keying on the
      // block alone would file the whole thing under whoever drove the first
      // leg and lose the other driver's shift completely. Each driver's shift
      // starts at the first stop HE is on, not at the block's first stop.
      const blockId = (row["Block ID"] || "").trim();
      const rawTime = (row["Stop 1 Planned Arrival Time"] || "").trim();
      // Sorts legs across a midnight boundary. A leg with no time must never
      // win the comparison, so it sorts last rather than first.
      const stamp = `${isoDate}T${rawTime || "99:99"}`;

      for (const driver of drivers) {
        const driverKey = driver.toLowerCase();
        const key = `${blockId || `${operator}|${isoDate}`}#${driverKey}`;

        const existing = seen.get(key);
        if (existing) {
          if (stamp < existing.stamp) {
            existing.stamp = stamp;
            existing.start_date = isoDate;
            existing.weekday = weekdayOf(isoDate);
            existing.start_time = normalizeStart(rawTime);
            existing.origin = row["Stop 1"] || existing.origin;
          }
          continue;
        }

        seen.set(key, {
          block_id: key,
          account_id: accountId,
          driver,
          driver_key: driverKey,
          operator_id: operator,
          carrier: rowCarrier,
          domicile: parts[1] || "",
          solo: (operator.match(/Solo\d+/i) || [""])[0],
          tractor: (operator.match(/Tractor[_ ]?(\d+)/i) || [, ""])[1] || "",
          shift_slot: (operator.match(/_(d\d)(?:_|$)/i) || [, ""])[1].toLowerCase(),
          weekday: weekdayOf(isoDate),
          start_date: isoDate,
          start_time: normalizeStart(rawTime),
          origin: row["Stop 1"] || "",
          stamp,
        });
      }
    }
  }

  // `since` is applied to the block's own start, after grouping. Filtering legs
  // first would keep the tail of a block that began before the cutoff and
  // report it as a shift starting at whatever time that leg happened to run.
  let grouped = [...seen.values()];
  if (since) {
    const before = grouped.length;
    grouped = grouped.filter((row) => row.start_date >= since);
    skippedDate = before - grouped.length;
  }

  // stamp only orders the legs while grouping; it is not a column, and passing
  // it on would break the insert.
  const rows = grouped.map(({ stamp, ...row }) => row);
  const dates = rows.map((r) => r.start_date).sort();
  const domiciles = {};
  for (const r of rows) domiciles[r.domicile || "?"] = (domiciles[r.domicile || "?"] || 0) + 1;

  return {
    rows,
    stats: {
      files: files.length,
      slotRows,
      imported: rows.length,
      unnamed,
      otherCarrier,
      nonSlot,
      skippedDate,
      first: dates[0] || null,
      last: dates[dates.length - 1] || null,
      domiciles,
      carriers,
    },
  };
}
