// Load Triple J's tractor fleet into the Truck Tracker. Run ON the Railway
// container (railway ssh), where DB_PATH points at the production database.
//
//   node scripts/seed-trucks-triple-j.mjs            # preview, writes nothing
//   node scripts/seed-trucks-triple-j.mjs --apply    # write
//
// This is what /trucksinyard and /cngsinyard read: the yard lookup takes live
// positions from Geotab, then keeps only the trucks this tracker lists as active,
// filtered by fuel. Without these rows the commands find nothing, because a
// Geotab vehicle with no matching tracker row is skipped as "notInTracker".
//
// Re-running is safe. Each row has a stable id (tj-<assetId>), so a second run
// updates in place rather than inserting duplicates - duplicate truck numbers are
// a real hazard here, since the yard lookup resolves them to the WORST status to
// avoid reporting a broken truck as ready.
//
// Dispatcher-owned columns (issue, wo number, down date) are never overwritten.
import { listAccounts, getAccount, listDownTrucks, upsertDownTruck } from "../db.mjs";

const ACCOUNT_ID = process.argv.find((a) => !a.startsWith("--") && a !== process.argv[0] && a !== process.argv[1]) || "triple-j";
const APPLY = process.argv.includes("--apply");

// Source: Triple J asset list, 16 Oct 2026 (51 tractors).
// By default an existing row keeps the status dispatch gave it. The asset list is
// a snapshot and can easily be older than the shop: re-seeding over a truck
// someone marked down would hand it back to /trucksinyard as ready to dispatch.
// Pass --refresh-status to force every status back to the asset list.
const REFRESH_STATUS = process.argv.includes("--refresh-status");

const ASSETS = [
  { assetId: "FLD260751", type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3876411", vin: "3AKJJDDV8VSXM2907", status: "Reserved",    note: "Est. Week 42" },
  { assetId: "FLD260750", type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3876410", vin: "3AKJJDDV6VSXM2906", status: "Reserved",    note: "Est. Week 42" },
  { assetId: "FLD260754", type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3876414", vin: "3AKJJDDV8VSXM2910", status: "Reserved",    note: "Est. Week 42" },
  { assetId: "520118",    type: "Tractor", ownership: "Fleet",       make: "Kenworth",      body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3042843", vin: "1NKYD39X3MJ459790", status: "Unavailable", note: "" },
  { assetId: "9010324",   type: "Tractor", ownership: "Fleet",       make: "Kenworth",      body: "Sleeper",  fuel: "DIESEL", owner: "Paclease",        license: "3241205", vin: "1XKYDP9X2NJ225784", status: "Unavailable", note: "" },
  { assetId: "122455",    type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3256992", vin: "1FUJHTFW0PLNW4260", status: "Unavailable", note: "" },
  { assetId: "39185",     type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "3599953", vin: "4V4WC9EG2LN258723", status: "Unavailable", note: "" },
  { assetId: "124044",    type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Sleeper",  fuel: "DIESEL", owner: "AZNG",            license: "3545754", vin: "3AKJHPDV9SSVV8908", status: "Unavailable", note: "" },
  { assetId: "IND260284", type: "Tractor", ownership: "Fleet",       make: "International", body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3876562", vin: "3HSDZAPR9VN269685", status: "Active",      note: "" },
  { assetId: "IND260281", type: "Tractor", ownership: "Fleet",       make: "International", body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3876559", vin: "3HSDZAPR3VN269682", status: "Active",      note: "" },
  { assetId: "124091",    type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Sleeper",  fuel: "DIESEL", owner: "AZNG",            license: "3893139", vin: "3AKJHPDV7SSVV8955", status: "Active",      note: "" },
  { assetId: "IND260276", type: "Tractor", ownership: "Fleet",       make: "International", body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3876554", vin: "3HSDZAPR8VN269483", status: "Active",      note: "" },
  { assetId: "521280",    type: "Tractor", ownership: "Fleet",       make: "Kenworth",      body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3170671", vin: "1NKYD39X6NJ130521", status: "Active",      note: "" },
  { assetId: "39275",     type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "3599918", vin: "4V4WC9EG7LN260564", status: "Active",      note: "" },
  { assetId: "322460",    type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3256735", vin: "4V4NC9UG1PN335567", status: "Active",      note: "" },
  { assetId: "324080",    type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Sleeper",  fuel: "DIESEL", owner: "AZNG",            license: "3599755", vin: "4V4NC9EH9SN680569", status: "Active",      note: "" },
  { assetId: "39567",     type: "Tractor", ownership: "Permaloaner", make: "Volvo",         body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "3545620", vin: "4V4WC9EG6LN261849", status: "Active",      note: "" },
  { assetId: "324067",    type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Sleeper",  fuel: "DIESEL", owner: "AZNG",            license: "3599741", vin: "4V4NC9EH6SN680559", status: "Active",      note: "" },
  { assetId: "321795",    type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3184424", vin: "4V4NC9UG9NN317752", status: "Active",      note: "" },
  { assetId: "39196",     type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "3599954", vin: "4V4WC9EG7LN258734", status: "Active",      note: "" },
  { assetId: "39284",     type: "Tractor", ownership: "Permaloaner", make: "Volvo",         body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "3600032", vin: "4V4WC9EG8LN260573", status: "Active",      note: "" },
  { assetId: "521057",    type: "Tractor", ownership: "Fleet",       make: "Kenworth",      body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3043011", vin: "1NKYD39X8NJ480023", status: "Active",      note: "" },
  { assetId: "9010402",   type: "Tractor", ownership: "Fleet",       make: "Kenworth",      body: "Sleeper",  fuel: "DIESEL", owner: "Paclease",        license: "3257162", vin: "1XKYDP9X2PJ258562", status: "Active",      note: "" },
  { assetId: "520110",    type: "Tractor", ownership: "Fleet",       make: "Kenworth",      body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3893133", vin: "1NKYD39X4MJ459782", status: "Active",      note: "" },
  { assetId: "FLD260753", type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3876413", vin: "3AKJJDDV1VSXM2909", status: "Active",      note: "" },
  { assetId: "124090",    type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Sleeper",  fuel: "DIESEL", owner: "AZNG",            license: "3599706", vin: "3AKJHPDV5SSVV8954", status: "Active",      note: "" },
  { assetId: "39514",     type: "Tractor", ownership: "Permaloaner", make: "Volvo",         body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "3545591", vin: "4V4WC9EG0LN261796", status: "Active",      note: "" },
  { assetId: "IND260275", type: "Tractor", ownership: "Fleet",       make: "International", body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3876553", vin: "3HSDZAPR6VN269482", status: "Active",      note: "" },
  { assetId: "IND260283", type: "Tractor", ownership: "Fleet",       make: "International", body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3876561", vin: "3HSDZAPR7VN269684", status: "Active",      note: "" },
  { assetId: "FLD260264", type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3816518", vin: "3AKJJDDV1VSXK5642", status: "Active",      note: "" },
  { assetId: "122358",    type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3256675", vin: "1FUJHTFW8PLNY0092", status: "Active",      note: "" },
  { assetId: "39224",     type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "3545552", vin: "4V4WC9EG1LN258762", status: "Active",      note: "" },
  { assetId: "521266",    type: "Tractor", ownership: "Fleet",       make: "Kenworth",      body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3170657", vin: "1NKYD39X1NJ130507", status: "Active",      note: "" },
  { assetId: "321882",    type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3197805", vin: "4V4NC9UG2NN318306", status: "Active",      note: "" },
  { assetId: "122104",    type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3189547", vin: "1FUJHTFW9NLNP6758", status: "Active",      note: "" },
  { assetId: "124036",    type: "Tractor", ownership: "Permaloaner", make: "Freightliner",  body: "Sleeper",  fuel: "DIESEL", owner: "AZNG",            license: "3545731", vin: "3AKJHPDV4SSVV8900", status: "Active",      note: "" },
  { assetId: "324037",    type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Sleeper",  fuel: "DIESEL", owner: "AZNG",            license: "3545955", vin: "4V4NC9EH0SN680525", status: "Active",      note: "" },
  { assetId: "FLD260086", type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3816133", vin: "3AKJJDDV3VSXK5464", status: "Active",      note: "" },
  { assetId: "320257",    type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "2999687", vin: "4V4NC9UG6MN282375", status: "Active",      note: "" },
  { assetId: "59269",     type: "Tractor", ownership: "Fleet",       make: "Kenworth",      body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "2882968", vin: "1XKYDP9X2LJ408910", status: "Active",      note: "" },
  { assetId: "122426",    type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3256963", vin: "1FUJHTFW4PLNW4231", status: "Active",      note: "" },
  { assetId: "FLD260733", type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3876393", vin: "3AKJJDDVXVSXM2889", status: "Active",      note: "" },
  { assetId: "IND260279", type: "Tractor", ownership: "Fleet",       make: "International", body: "Sleeper",  fuel: "DIESEL", owner: "Fleet Advantage", license: "3876557", vin: "3HSDZAPR3VN269486", status: "Active",      note: "" },
  { assetId: "39391",     type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "3545524", vin: "4V4WC9EG9LN260680", status: "Active",      note: "" },
  { assetId: "322019",    type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Day cab",  fuel: "CNG",    owner: "AZNG",            license: "3239138", vin: "4V4NC9UG1NN318443", status: "Active",      note: "" },
  { assetId: "221025",    type: "Tractor", ownership: "Fleet",       make: "Freightliner",  body: "Sleeper",  fuel: "CNG",    owner: "AZNG",            license: "3256381", vin: "1FUJHPFW1PLNY0023", status: "Active",      note: "" },
  { assetId: "39530",     type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "2882849", vin: "4V4WC9EG5LN261812", status: "Active",      note: "" },
  { assetId: "39445",     type: "Tractor", ownership: "Fleet",       make: "Volvo",         body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "3600327", vin: "4V4WC9EG6LN260734", status: "Active",      note: "" },
  { assetId: "59165",     type: "Tractor", ownership: "Fleet",       make: "Kenworth",      body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "3893142", vin: "1XKYDP9X5LJ407542", status: "Active",      note: "" },
  { assetId: "39438",     type: "Tractor", ownership: "Permaloaner", make: "Volvo",         body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "3600329", vin: "4V4WC9EG9LN260727", status: "Active",      note: "" },
  { assetId: "59168",     type: "Tractor", ownership: "Fleet",       make: "Kenworth",      body: "Day cab",  fuel: "DIESEL", owner: "AZNG",            license: "2882716", vin: "1XKYDP9X0LJ407545", status: "Active",      note: "" },
];

// Asset-list status -> Truck Tracker status.
//   Active      -> Available   (dispatchable)
//   Unavailable -> Unavailable (in the fleet, not usable)
//   Reserved    -> Unavailable (ordered, not delivered yet - the estimated week
//                               is kept in the issue column so it is not lost)
function trackerStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "active") return "Available";
  return "Unavailable";
}

const account = getAccount(ACCOUNT_ID);
if (!account) {
  console.error(`No account "${ACCOUNT_ID}". Accounts: ${listAccounts().map((a) => a.id).join(", ") || "(none)"}`);
  process.exit(1);
}

const existingById = new Map(listDownTrucks(ACCOUNT_ID).map((t) => [t.id, t]));
const byNumber = new Map();
for (const t of listDownTrucks(ACCOUNT_ID)) {
  if (!byNumber.has(t.truckNumber)) byNumber.set(t.truckNumber, []);
  byNumber.get(t.truckNumber).push(t);
}

let created = 0, updated = 0, statusKept = 0;
const rows = [];

for (const a of ASSETS) {
  const id = `tj-${a.assetId}`;
  const prior = existingById.get(id);

  let status = trackerStatus(a.status);
  if (prior && !REFRESH_STATUS && prior.status && prior.status !== status) {
    status = prior.status;      // dispatch knows better than the snapshot
    statusKept += 1;
  }

  // Keep whatever dispatch wrote; only seed the Reserved note when empty.
  const issue = prior?.issue || (a.note ? `${a.status}: ${a.note}` : "");

  const row = {
    id,
    accountId: ACCOUNT_ID,
    truckNumber: a.assetId,
    issue,
    woNumber: prior?.woNumber || "",
    downDate: prior?.downDate || "",
    status,
    vehicleType: a.type,
    ownership: a.ownership,
    make: a.make,
    body: a.body,
    fuel: a.fuel,
    owner: a.owner,
    license: a.license,
    vin: a.vin,
  };

  rows.push(row);
  if (prior) updated += 1; else created += 1;
  if (APPLY) upsertDownTruck(row);
}

const avail = rows.filter((r) => r.status === "Available").length;
const cng = rows.filter((r) => r.fuel === "CNG").length;
const cngAvail = rows.filter((r) => r.fuel === "CNG" && r.status === "Available").length;

console.log(`${APPLY ? "Wrote" : "Would write"} ${rows.length} tractors to ${account.name} (${ACCOUNT_ID})`);
console.log(`  new: ${created}   updated in place: ${updated}`);
console.log(`  Available: ${avail}   Unavailable: ${rows.length - avail}`);
console.log(`  CNG: ${cng}   CNG + Available (what /cngsinyard can return): ${cngAvail}`);
if (statusKept) {
  console.log(`  kept dispatch's status on ${statusKept} truck(s) that differ from the asset list`);
  console.log("  (use --refresh-status to overwrite those from the list instead)");
}

// Pre-existing rows for the same truck number would make the yard lookup ambiguous.
const clashes = rows
  .filter((r) => (byNumber.get(r.truckNumber) || []).some((t) => t.id !== r.id))
  .map((r) => r.truckNumber);
if (clashes.length) {
  console.log(`\n  WARNING: these truck numbers already exist under a different row id: ${clashes.join(", ")}`);
  console.log("  The yard lookup resolves duplicates to the worst status. Delete the old rows in the Truck Tracker.");
}

if (!APPLY) console.log("\nPreview only. Re-run with --apply to write.");
