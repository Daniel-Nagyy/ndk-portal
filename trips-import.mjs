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

const toIsoDate = (value) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || "");
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
};
// 0 = Monday, matching the dashboard.
const weekdayOf = (iso) => (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;

// Blocks start on the half hour: 07:30, 08:30 and so on. Trip-level exports
// report the first trip's own time instead, which lands a few minutes either
// side, so every start is snapped to the nearest half hour. 19:45 becomes
// 19:30, and 00:10 becomes 23:30 the evening before rather than a time that
// does not exist.
export function normalizeStart(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!m) return "";
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  const snapped = Math.round((minutes - 30) / 60) * 60 + 30;
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
// A shift is one slot on one day, keyed as "<operator id>|<date>". That is
// what makes a trip-level export safe: a driver's eight trips that day are one
// shift, not eight, and re-importing the same day from a different export
// updates the row instead of adding another. Rows with no driver name are
// counted and reported, never guessed at.
export function blocksFromCsvs(files, { accountId, carrier, since } = {}) {
  const seen = new Map();
  const carriers = {};
  let unnamed = 0;
  let otherCarrier = 0;
  let skippedDate = 0;
  let slotRows = 0;

  for (const file of files) {
    for (const row of parseCsv(file.text || "")) {
      const operator = (row["Operator ID"] || "").trim();
      if (!operator) continue;
      slotRows += 1;

      const isoDate = toIsoDate(row["Stop 1 Planned Arrival Date"]);
      if (!isoDate) continue;
      if (since && isoDate < since) { skippedDate += 1; continue; }

      const driver = (row["Driver Name"] || "").replace(/\s+/g, " ").trim();
      if (!driver) { unnamed += 1; continue; }

      const parts = operator.split("_");
      const rowCarrier = parts[0] || "";
      carriers[rowCarrier || "?"] = (carriers[rowCarrier || "?"] || 0) + 1;
      if (carrier && rowCarrier.toUpperCase() !== String(carrier).toUpperCase()) {
        otherCarrier += 1;
        continue;
      }

      const key = `${operator}|${isoDate}`;
      const rawStart = row["Stop 1 Planned Arrival Time"] || "";
      const startTime = normalizeStart(rawStart);
      const existing = seen.get(key);
      if (existing) {
        // Several trips on the same slot-day: the shift starts at the earliest.
        if (rawStart && (!existing.start_raw || rawStart < existing.start_raw)) {
          existing.start_raw = rawStart;
          existing.start_time = startTime;
          existing.origin = row["Stop 1"] || existing.origin;
        }
        continue;
      }

      seen.set(key, {
        block_id: key,
        account_id: accountId,
        driver,
        driver_key: driver.toLowerCase(),
        operator_id: operator,
        carrier: rowCarrier,
        domicile: parts[1] || "",
        solo: (operator.match(/Solo\d+/i) || [""])[0],
        tractor: (operator.match(/Tractor[_ ]?(\d+)/i) || [, ""])[1] || "",
        shift_slot: (operator.match(/_(d\d)(?:_|$)/i) || [, ""])[1].toLowerCase(),
        weekday: weekdayOf(isoDate),
        start_date: isoDate,
        start_time: startTime,
        start_raw: rawStart,
        origin: row["Stop 1"] || "",
      });
    }
  }

  // start_raw is only used while picking the earliest trip of a slot-day; it is
  // not a column, and passing it on would break the insert.
  const rows = [...seen.values()].map(({ start_raw, ...row }) => row);
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
      skippedDate,
      first: dates[0] || null,
      last: dates[dates.length - 1] || null,
      domiciles,
      carriers,
    },
  };
}
