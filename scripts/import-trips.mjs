// Import Amazon Relay "Trips" CSV exports into the driver_shifts table, which
// is what the Driver Slots dashboard reads.
//
//   node scripts/import-trips.mjs <accountId> <file-or-folder>... [--carrier TJER] [--since YYYY-MM-DD] [--replace]
//
// Only block rows are used: they are the ones carrying the Operator ID
// (TJER_MGE_Solo1_Tractor_21_d1), which is the slot. Blocks with no driver
// name on them are counted and reported, never guessed at. Re-importing the
// same export is safe; rows are keyed on the block id.
import fs from "node:fs";
import path from "node:path";
import { saveDriverShifts, clearDriverShifts, getAccount, listAccounts } from "../db.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const value = args[i + 1];
  args.splice(i, value && !value.startsWith("--") ? 2 : 1);
  return value && !value.startsWith("--") ? value : true;
};
const replace = Boolean(flag("--replace"));
const carrierFilter = flag("--carrier");
const since = flag("--since");
const [accountId, ...inputs] = args;

if (!accountId || !inputs.length) {
  console.error("usage: node scripts/import-trips.mjs <accountId> <file-or-folder>... [--carrier TJER] [--since YYYY-MM-DD] [--replace]");
  console.error("accounts:", listAccounts().map((a) => a.id).join(", "));
  process.exit(1);
}
if (!getAccount(accountId)) {
  console.error(`No account "${accountId}". Known: ${listAccounts().map((a) => a.id).join(", ")}`);
  process.exit(1);
}

// Relay quotes any field containing a comma, so the split has to respect quotes.
function parseCsv(text) {
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

function collectFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    const stat = fs.existsSync(input) ? fs.statSync(input) : null;
    if (!stat) { console.warn(`skipping missing path: ${input}`); continue; }
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(input)) {
        if (/^trips.*\.csv$/i.test(name)) files.push(path.join(input, name));
      }
    } else files.push(input);
  }
  // Oldest first, so a later export's version of a block wins.
  return files.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
}

const toIsoDate = (value) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || "");
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
};
// 0 = Monday, to match the dashboard.
const weekdayOf = (iso) => (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;

const files = collectFiles(inputs);
if (!files.length) { console.error("no CSV files found"); process.exit(1); }

const seen = new Map();
let unnamed = 0;
let otherCarrier = 0;
let skippedDate = 0;

for (const file of files) {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  for (const row of rows) {
    if ((row["Block/Trip"] || "") !== "Block") continue;
    const blockId = row["Block ID"];
    const isoDate = toIsoDate(row["Stop 1 Planned Arrival Date"]);
    if (!blockId || !isoDate) continue;
    if (since && isoDate < since) { skippedDate += 1; continue; }

    const driver = (row["Driver Name"] || "").replace(/\s+/g, " ").trim();
    if (!driver) { unnamed += 1; continue; }

    const operator = row["Operator ID"] || "";
    const parts = operator.split("_");
    const carrier = parts[0] || "";
    if (carrierFilter && carrier.toUpperCase() !== String(carrierFilter).toUpperCase()) {
      otherCarrier += 1;
      continue;
    }
    seen.set(blockId, {
      block_id: blockId,
      account_id: accountId,
      driver,
      driver_key: driver.toLowerCase(),
      operator_id: operator,
      carrier,
      domicile: parts[1] || "",
      solo: (operator.match(/Solo\d+/i) || [""])[0],
      tractor: (operator.match(/Tractor[_ ]?(\d+)/i) || [,""])[1] || "",
      shift_slot: (operator.match(/_(d\d)\b/i) || [,""])[1].toLowerCase(),
      weekday: weekdayOf(isoDate),
      start_date: isoDate,
      start_time: row["Stop 1 Planned Arrival Time"] || "",
      origin: row["Stop 1"] || "",
    });
  }
}

const rows = [...seen.values()];
if (!rows.length) {
  console.error("Nothing to import. Every block row was unnamed, filtered out, or had no date.");
  process.exit(1);
}

if (replace) console.log(`cleared ${clearDriverShifts(accountId)} existing shift(s) for ${accountId}`);
saveDriverShifts(rows);

const dates = rows.map((r) => r.start_date).sort();
const domiciles = {};
for (const r of rows) domiciles[r.domicile || "?"] = (domiciles[r.domicile || "?"] || 0) + 1;

console.log(`read ${files.length} file(s)`);
console.log(`imported ${rows.length} block(s) for ${accountId}: ${dates[0]} to ${dates[dates.length - 1]}`);
console.log(`domiciles: ${Object.entries(domiciles).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`skipped: ${unnamed} with no driver name${carrierFilter ? `, ${otherCarrier} from other carriers` : ""}${since ? `, ${skippedDate} before ${since}` : ""}`);
