// Runs computeReadiness twice against a live account — once per-driver, once with
// ExecuteMultiCall — and compares the alert-relevant output per driver + timing.
import { getAccountCredentials } from "../db.mjs";
import { computeReadiness } from "../geotab.mjs";

const ACCOUNT = process.argv[2] || "mako-waves-distribution";
const c = getAccountCredentials(ACCOUNT);
if (!c || !c.geotab || !c.geotab.username || !c.geotab.password) {
  console.error(`No Geotab credentials for account "${ACCOUNT}"`);
  process.exit(1);
}
const creds = { server: c.geotab.server, database: c.geotab.database, username: c.geotab.username, password: c.geotab.password };
console.log(`Account: ${ACCOUNT}  db=${creds.database}  user=${creds.username}`);

// Fields that actually drive HOS alerts (snapshots from Geotab; shouldn't change
// in the seconds between the two calls).
const KEYS = ["currentStatus", "readiness", "breakDisplay", "drivingDisplay",
  "dutyDisplay", "workdayDisplay", "cycleRemainingDisplay", "cycleTomorrowDisplay"];

function pick(r) { const o = {}; for (const k of KEYS) o[k] = r[k]; return o; }

const run = async (multi) => {
  process.env.GEOTAB_MULTICALL = multi ? "1" : "";
  const t = Date.now();
  const res = await computeReadiness(creds);
  return { res, ms: Date.now() - t };
};

console.log("Running per-driver…");
const A = await run(false);
console.log("Running multicall…");
const B = await run(true);

console.log(`\nper-driver: ${A.res.totalDrivers} drivers in ${A.ms}ms  ${JSON.stringify(A.res.summary)}`);
console.log(`multicall : ${B.res.totalDrivers} drivers in ${B.ms}ms  ${JSON.stringify(B.res.summary)}`);
console.log(`speedup   : ${(A.ms / B.ms).toFixed(1)}x faster\n`);

const mapA = new Map(A.res.drivers.map((d) => [d.id, d]));
const mapB = new Map(B.res.drivers.map((d) => [d.id, d]));
let diffs = 0, missing = 0;
for (const [id, da] of mapA) {
  const db = mapB.get(id);
  if (!db) { missing++; console.log(`MISSING in multicall: ${da.driverName}`); continue; }
  if (JSON.stringify(pick(da)) !== JSON.stringify(pick(db))) {
    diffs++;
    if (diffs <= 8) {
      console.log(`DIFF ${da.driverName}:`);
      for (const k of KEYS) if (JSON.stringify(da[k]) !== JSON.stringify(db[k])) console.log(`   ${k}: "${da[k]}" (per-driver) != "${db[k]}" (multi)`);
    }
  }
}
console.log(`\ncount match: ${A.res.totalDrivers === B.res.totalDrivers ? "✅" : "❌"}  (${A.res.totalDrivers} vs ${B.res.totalDrivers})`);
console.log(missing === 0 && diffs === 0
  ? "✅ ALERT-RELEVANT OUTPUT IS IDENTICAL — multicall is safe."
  : `❌ ${diffs} driver(s) differ, ${missing} missing — DO NOT enable multicall yet.`);
process.exit(0);
