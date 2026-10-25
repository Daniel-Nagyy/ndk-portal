// Write an account's driver_shifts out to data/driver-shifts/<account>.json,
// which the server loads on boot.
//
//   node scripts/export-driver-shifts.mjs <accountId>
//
// The Relay exports live on a dispatcher's laptop and a hosted container cannot
// reach them, so the history is built here with scripts/import-trips.mjs and
// committed. Loading is keyed on slot and date, so a redeploy refreshes the
// rows rather than duplicating them.
import fs from "node:fs";
import path from "node:path";
import { db, getAccount, listAccounts } from "../db.mjs";

const accountId = process.argv[2];
if (!accountId || !getAccount(accountId)) {
  console.error("usage: node scripts/export-driver-shifts.mjs <accountId>");
  console.error("accounts:", listAccounts().map((a) => a.id).join(", "));
  process.exit(1);
}

const rows = db
  .prepare(`SELECT block_id, driver, driver_key, operator_id, carrier, domicile, solo, tractor,
      shift_slot, weekday, start_date, start_time, origin
    FROM driver_shifts WHERE account_id = ? ORDER BY start_date, start_time, driver`)
  .all(accountId);

if (!rows.length) {
  console.error(`No shifts stored for ${accountId}. Run scripts/import-trips.mjs first.`);
  process.exit(1);
}

const dir = path.join(process.cwd(), "data", "driver-shifts");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${accountId}.json`);
const dates = rows.map((r) => r.start_date).sort();
fs.writeFileSync(
  file,
  JSON.stringify({ accountId, generatedAt: new Date().toISOString(), first: dates[0], last: dates[dates.length - 1], rows }, null, 0) + "\n"
);

const size = (fs.statSync(file).size / 1024).toFixed(0);
console.log(`wrote ${rows.length} shift(s) for ${accountId} to data/driver-shifts/${accountId}.json (${size} KB)`);
console.log(`covering ${dates[0]} to ${dates[dates.length - 1]}`);
