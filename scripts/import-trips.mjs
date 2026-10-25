// Import Amazon Relay "Trips" CSV exports into the driver_shifts table, which
// is what the Driver Slots dashboard reads.
//
//   node scripts/import-trips.mjs <accountId> <file-or-folder>... [--carrier TJER] [--since YYYY-MM-DD] [--replace]
//
// This is the command-line way in, for files that are already on the same
// machine as the database. On a hosted deployment the CSVs usually live on
// someone's laptop instead, so the Driver Slots page has an upload button that
// does exactly the same thing through the browser.
import fs from "node:fs";
import path from "node:path";
import { saveDriverShifts, clearDriverShifts, getAccount, listAccounts } from "../db.mjs";
import { blocksFromCsvs } from "../trips-import.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const value = args[i + 1];
  args.splice(i, value && !value.startsWith("--") ? 2 : 1);
  return value && !value.startsWith("--") ? value : true;
};
const replace = Boolean(flag("--replace"));
const carrier = flag("--carrier");
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

const paths = collectFiles(inputs);
if (!paths.length) {
  console.error("No CSV files found. Pass the CSV files themselves, or a folder holding Trips*.csv.");
  process.exit(1);
}

const { rows, stats } = blocksFromCsvs(
  paths.map((p) => ({ name: path.basename(p), text: fs.readFileSync(p, "utf8") })),
  { accountId, carrier, since }
);

if (!rows.length) {
  console.error("Nothing to import. Every block row was unnamed, filtered out, or had no date.");
  console.error("carriers seen:", Object.entries(stats.carriers).map(([k, v]) => `${k} ${v}`).join(", ") || "none");
  process.exit(1);
}

if (replace) console.log(`cleared ${clearDriverShifts(accountId)} existing shift(s) for ${accountId}`);
saveDriverShifts(rows);

console.log(`read ${stats.files} file(s)`);
console.log(`imported ${stats.imported} shift(s) for ${accountId}: ${stats.first} to ${stats.last}`);
console.log(`domiciles: ${Object.entries(stats.domiciles).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`skipped: ${stats.unnamed} with no driver name${carrier ? `, ${stats.otherCarrier} from other carriers` : ""}${since ? `, ${stats.skippedDate} before ${since}` : ""}`);
