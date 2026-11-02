// Run with:  node test-trips-import.mjs
//
// Relay's trip export writes one row per LEG. The fixtures below are the real
// shape that broke Driver Slots: a block running past midnight, and a block
// that changes drivers partway through.
import { blocksFromCsvs, normalizeStart, parseCsv, NON_SLOT_DRIVERS } from "./trips-import.mjs";

let failed = 0;
const ok = (label, cond) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failed += 1;
};
const eq = (label, actual, expected) =>
  ok(`${label} -> ${JSON.stringify(expected)}`, actual === expected)
  || (actual !== expected && console.log(`        got ${JSON.stringify(actual)}`));

const HEADER = [
  "Block ID", "Trip ID", "Driver Name", "Operator ID", "Domicile/Route",
  "Stop 1", "Stop 1 Planned Arrival Date", "Stop 1 Planned Arrival Time",
];
const csv = (legs) =>
  [HEADER.join(",")]
    .concat(legs.map((l) => [
      l.block, l.trip || "T-1", l.driver, l.op || "TJER_MGE_Solo1_Tractor_18_d1",
      "MGE", l.stop || "MGE45", l.date, l.time,
    ].join(",")))
    .join("\n");

const run = (legs, opts = {}) =>
  blocksFromCsvs([{ text: csv(legs) }], { accountId: "triple-j", ...opts });

// ---------------------------------------------------------------------------
console.log("--- normalizeStart snaps DOWN to the block's half hour");
// The export gives the driver's first STOP ARRIVAL. He reports at the yard and
// then drives to it, so the start can never be later than that arrival.
eq("14:30 exactly", normalizeStart("14:30"), "14:30");
eq("14:45", normalizeStart("14:45"), "14:30");
eq("15:27 (used to round UP to 15:30)", normalizeStart("15:27"), "14:30");
eq("15:29", normalizeStart("15:29"), "14:30");
eq("15:30", normalizeStart("15:30"), "15:30");
eq("13:04", normalizeStart("13:04"), "12:30");
eq("19:45", normalizeStart("19:45"), "19:30");
eq("00:10 wraps to the evening before", normalizeStart("00:10"), "23:30");
eq("00:30", normalizeStart("00:30"), "00:30");
eq("blank", normalizeStart(""), "");
eq("junk", normalizeStart("soon"), "");

console.log("\n--- a start is never after the arrival it came from");
for (let h = 0; h < 24; h += 1) {
  for (const m of [0, 1, 29, 30, 31, 44, 45, 59]) {
    const arrive = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const start = normalizeStart(arrive);
    const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    let gap = mins(arrive) - mins(start);
    if (gap < 0) gap += 1440;
    if (gap < 0 || gap >= 60) {
      ok(`${arrive} -> ${start} gap ${gap}`, false);
      h = 99;
      break;
    }
  }
}
ok("every minute of the day snaps 0-59 min before its arrival", true);

// ---------------------------------------------------------------------------
console.log("\n--- one block running past midnight is ONE shift");
// This is the real B-NQK33PH10. The 01:15 and 03:58 legs belong to the block
// that started the previous afternoon.
const overnight = run([
  { block: "B-NQK", driver: "Collin Ndahiriwe", stop: "MGE45", date: "10/27/2026", time: "14:45" },
  { block: "B-NQK", driver: "Collin Ndahiriwe", stop: "MGE3", date: "10/27/2026", time: "14:59" },
  { block: "B-NQK", driver: "Collin Ndahiriwe", stop: "SOUTHEAS", date: "10/27/2026", time: "18:15" },
  { block: "B-NQK", driver: "Collin Ndahiriwe", stop: "GSP3", date: "10/28/2026", time: "01:15" },
  { block: "B-NQK", driver: "Collin Ndahiriwe", stop: "MGE5", date: "10/28/2026", time: "03:58" },
]);
ok("5 legs collapse to 1 shift", overnight.rows.length === 1);
eq("dated the day it started", overnight.rows[0].start_date, "2026-10-27");
eq("starts at the first stop, not the overnight one", overnight.rows[0].start_time, "14:30");
eq("origin is the first stop", overnight.rows[0].origin, "MGE45");
eq("weekday is Tuesday (0 = Monday)", overnight.rows[0].weekday, 1);
ok("no phantom shift on the 28th", !overnight.rows.some((r) => r.start_date === "2026-10-28"));

console.log("\n--- the next day's real block is not swallowed by the overnight legs");
const twoDays = run([
  { block: "B-NQK", driver: "Collin Ndahiriwe", date: "10/27/2026", time: "14:45" },
  { block: "B-NQK", driver: "Collin Ndahiriwe", date: "10/28/2026", time: "01:15" },
  { block: "B-T8X", driver: "Collin Ndahiriwe", date: "10/28/2026", time: "15:27" },
  { block: "B-T8X", driver: "Collin Ndahiriwe", date: "10/28/2026", time: "17:30" },
]);
ok("two shifts", twoDays.rows.length === 2);
const on28 = twoDays.rows.find((r) => r.start_date === "2026-10-28");
eq("the 28th starts at 14:30, not 01:30", on28.start_time, "14:30");

// ---------------------------------------------------------------------------
console.log("\n--- a block that changes drivers is one shift EACH");
// B-2MDWQM879: Kenno drives the first leg, Collin takes it from MGE1.
const handoff = run([
  { block: "B-2MD", driver: "Kenno Clark", stop: "MGE45", date: "10/26/2026", time: "12:45" },
  { block: "B-2MD", driver: "Collin Ndahiriwe", stop: "MGE1", date: "10/26/2026", time: "13:04" },
  { block: "B-2MD", driver: "Collin Ndahiriwe", stop: "VENDOR", date: "10/26/2026", time: "15:12" },
  { block: "B-2MD", driver: "Collin Ndahiriwe", stop: "GSP3", date: "10/26/2026", time: "23:00" },
  { block: "B-2MD", driver: "Collin Ndahiriwe", stop: "AGS2", date: "10/27/2026", time: "01:45" },
]);
// Kenno Clark is a yard jockey, not a slot driver, so his leg is dropped and
// the block belongs to the driver who actually ran it.
ok("one shift, the yard jockey dropped", handoff.rows.length === 1);
const collin = handoff.rows.find((r) => r.driver === "Collin Ndahiriwe");
ok("the real driver survives", Boolean(collin));
ok("the yard jockey gets no shift", !handoff.rows.some((r) => r.driver === "Kenno Clark"));
eq("the dropped leg is counted", handoff.stats.nonSlot, 1);
eq("the real driver starts at HIS first stop", collin.start_time, "12:30");
eq("his origin is where he joined", collin.origin, "MGE1");
eq("his shift is dated the 26th", collin.start_date, "2026-10-26");

console.log("\n--- a genuine handoff between two real drivers keeps both");
const twoReal = run([
  { block: "B-REAL", driver: "Alice Adams", stop: "MGE45", date: "10/26/2026", time: "12:45" },
  { block: "B-REAL", driver: "Bob Brown", stop: "MGE1", date: "10/26/2026", time: "17:04" },
]);
ok("two shifts", twoReal.rows.length === 2);
eq("first driver kept", twoReal.rows.find((r) => r.driver === "Alice Adams").start_time, "12:30");
eq("second driver kept", twoReal.rows.find((r) => r.driver === "Bob Brown").start_time, "16:30");
ok("different keys", twoReal.rows[0].block_id !== twoReal.rows[1].block_id);

// ---------------------------------------------------------------------------
console.log("\n--- re-importing is idempotent");
const legs = [
  { block: "B-NQK", driver: "Collin Ndahiriwe", date: "10/27/2026", time: "14:45" },
  { block: "B-NQK", driver: "Collin Ndahiriwe", date: "10/28/2026", time: "01:15" },
];
const once = run(legs);
const twice = blocksFromCsvs([{ text: csv(legs) }, { text: csv(legs) }], { accountId: "triple-j" });
ok("the same file twice is still one shift", twice.rows.length === 1);
eq("and the same key", twice.rows[0].block_id, once.rows[0].block_id);
ok("the key carries the driver", once.rows[0].block_id.includes("#collin ndahiriwe"));

console.log("\n--- legs arriving out of order");
const shuffled = run([
  { block: "B-NQK", driver: "Collin Ndahiriwe", stop: "MGE5", date: "10/28/2026", time: "03:58" },
  { block: "B-NQK", driver: "Collin Ndahiriwe", stop: "GSP3", date: "10/28/2026", time: "01:15" },
  { block: "B-NQK", driver: "Collin Ndahiriwe", stop: "MGE45", date: "10/27/2026", time: "14:45" },
]);
eq("still finds the real start", shuffled.rows[0].start_time, "14:30");
eq("still dated the 27th", shuffled.rows[0].start_date, "2026-10-27");

console.log("\n--- a leg with no time never wins the start");
const noTime = run([
  { block: "B-NQK", driver: "Collin Ndahiriwe", stop: "MGE45", date: "10/27/2026", time: "" },
  { block: "B-NQK", driver: "Collin Ndahiriwe", stop: "MGE3", date: "10/27/2026", time: "14:45" },
]);
eq("takes the timed leg", noTime.rows[0].start_time, "14:30");

// ---------------------------------------------------------------------------
console.log("\n--- since filters on the block's start, not the leg's date");
const since = run([
  { block: "B-OLD", driver: "A B", date: "10/27/2026", time: "14:45" },
  { block: "B-OLD", driver: "A B", date: "10/28/2026", time: "01:15" },
  { block: "B-NEW", driver: "A B", date: "10/28/2026", time: "15:27" },
], { since: "2026-10-28" });
ok("the block that began before the cutoff is dropped whole", since.rows.length === 1);
eq("including its overnight tail", since.rows[0].start_date, "2026-10-28");
eq("and it is the real block", since.rows[0].start_time, "14:30");
eq("counted as skipped", since.stats.skippedDate, 1);

console.log("\n--- carrier filter and unnamed rows");
const mixed = run([
  { block: "B-1", driver: "A B", op: "TJER_MGE_Solo1_Tractor_1_d1", date: "10/27/2026", time: "08:45" },
  { block: "B-2", driver: "C D", op: "OTHR_MGE_Solo1_Tractor_2_d1", date: "10/27/2026", time: "08:45" },
  { block: "B-3", driver: "", op: "TJER_MGE_Solo1_Tractor_3_d1", date: "10/27/2026", time: "08:45" },
], { carrier: "TJER" });
ok("only the matching carrier", mixed.rows.length === 1);
eq("other carrier counted", mixed.stats.otherCarrier, 1);
eq("unnamed counted", mixed.stats.unnamed, 1);
eq("slot fields parsed", mixed.rows[0].tractor, "1");
eq("solo parsed", mixed.rows[0].solo, "Solo1");
eq("shift slot parsed", mixed.rows[0].shift_slot, "d1");
eq("domicile parsed", mixed.rows[0].domicile, "MGE");

console.log("\n--- quoted fields still parse");
const quoted = parseCsv('Block ID,Driver Name\n"B-1","Smith, John"');
eq("comma inside quotes", quoted[0]["Driver Name"], "Smith, John");

// ---------------------------------------------------------------------------
console.log("\n--- yard and shuttle drivers are kept out");
ok("Kenno Clark is on the list", NON_SLOT_DRIVERS.has("kenno clark"));

const onlyJockey = run([
  { block: "B-J", driver: "Kenno Clark", date: "10/26/2026", time: "12:45" },
]);
ok("a block with nobody but a yard jockey yields no shift", onlyJockey.rows.length === 0);
eq("and the leg is counted", onlyJockey.stats.nonSlot, 1);

const caseAndSpace = run([
  { block: "B-C", driver: "KENNO   CLARK", date: "10/26/2026", time: "12:45" },
  { block: "B-C", driver: "Real Driver", date: "10/26/2026", time: "13:45" },
]);
ok("matching ignores case and extra spaces", caseAndSpace.rows.length === 1);
eq("the real driver is the one kept", caseAndSpace.rows[0].driver, "Real Driver");

console.log("\n--- a leg naming two drivers");
// One tractor with two people on it is not a driver called "A;B".
const pair = run([
  { block: "B-P", driver: "Michael Moore;Kenno Clark", stop: "MGE5", date: "10/24/2026", time: "21:45" },
  { block: "B-P", driver: "Michael Moore", stop: "MGE1", date: "10/25/2026", time: "02:00" },
]);
ok("no driver is called \"A;B\"", !pair.rows.some((r) => r.driver.includes(";")));
ok("it folds into the real driver's own shift", pair.rows.length === 1);
eq("named properly", pair.rows[0].driver, "Michael Moore");
eq("and starts at the pair leg, which he was on", pair.rows[0].start_time, "21:30");
eq("the excluded half is counted", pair.stats.nonSlot, 1);

const team = run([
  { block: "B-T", driver: "Alice Adams;Bob Brown", stop: "MGE5", date: "10/24/2026", time: "21:45" },
]);
ok("a real team gives each driver a shift", team.rows.length === 2);
ok("both named", team.rows.map((r) => r.driver).sort().join("|") === "Alice Adams|Bob Brown");

console.log("\n--- the exclusion list can be overridden per call");
const overridden = run([
  { block: "B-O", driver: "Kenno Clark", date: "10/26/2026", time: "12:45" },
  { block: "B-O2", driver: "Someone Else", date: "10/26/2026", time: "12:45" },
], { exclude: ["someone else"] });
ok("the override replaces the default list", overridden.rows.length === 1);
eq("so Kenno comes back when asked for", overridden.rows[0].driver, "Kenno Clark");

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exitCode = failed ? 1 : 0;
