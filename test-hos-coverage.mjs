// node test-hos-coverage.mjs
import assert from "node:assert/strict";
import {
  VERDICT, normalizeName, buildDriverIndex, matchDriver,
  blockMinutes, coverageFor, coverageForRows, coverageAlert,
} from "./hos-coverage.mjs";

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass += 1; }
  catch (e) { console.error(`FAIL: ${name}\n  ${e.message}`); process.exitCode = 1; }
};

const ready = (over = {}) => ({
  id: "d1", driverName: "Steven Frederick", readiness: "READY", currentStatus: "OFF",
  minutesLeft: 0, cycleRemainingMinutes: 40 * 60, drivingMinutes: 11 * 60, workdayMinutes: 14 * 60,
  ...over,
});
const row = (over = {}) => ({ id: "r1", driverAssigned: "Steven Frederick", requestedStart: "08:30", scheduledFinal: "18:30", ...over });

// --- names ---
test("normalizeName strips case and punctuation", () => {
  assert.equal(normalizeName("  Steven ANTHONY  Frederick-Jr. "), "steven anthony frederick jr");
});

test("middle names still match on first+last", () => {
  const idx = buildDriverIndex([ready()]);
  assert.equal(matchDriver(idx, "Steven ANTHONY Frederick").driver.id, "d1");
});

test("exact match wins", () => {
  const idx = buildDriverIndex([ready()]);
  assert.equal(matchDriver(idx, "steven frederick").driver.id, "d1");
});

test("two drivers sharing a name resolve to nobody", () => {
  const idx = buildDriverIndex([ready(), ready({ id: "d2" })]);
  const m = matchDriver(idx, "Steven Frederick");
  assert.equal(m.driver, null);
  assert.match(m.reason, /more than one/);
});

test("unknown name does not match", () => {
  const idx = buildDriverIndex([ready()]);
  assert.equal(matchDriver(idx, "Nobody Here").driver, null);
});

test("blank name does not match", () => {
  const idx = buildDriverIndex([ready()]);
  assert.equal(matchDriver(idx, "").driver, null);
});

// --- block length ---
test("ordinary block", () => assert.equal(blockMinutes({ requestedStart: "08:30", scheduledFinal: "18:30" }), 600));
test("block over midnight is not negative", () => assert.equal(blockMinutes({ requestedStart: "22:30", scheduledFinal: "06:30" }), 480));
test("missing times give null", () => assert.equal(blockMinutes({ requestedStart: "", scheduledFinal: "06:30" }), null));
test("junk times give null", () => assert.equal(blockMinutes({ requestedStart: "99:99", scheduledFinal: "06:30" }), null));

// --- verdicts ---
test("rested driver with a full cycle covers the block", () => {
  assert.equal(coverageFor(row(), ready()).verdict, VERDICT.OK);
});

test("unmatched driver is UNKNOWN, never OK", () => {
  assert.equal(coverageFor(row(), null).verdict, VERDICT.UNKNOWN);
});

test("no logs is UNKNOWN", () => {
  assert.equal(coverageFor(row(), ready({ readiness: "NO LOGS" })).verdict, VERDICT.UNKNOWN);
});

test("reset still running is SHORT and says how long is left", () => {
  const r = coverageFor(row(), ready({ readiness: "NOT READY", minutesLeft: 150 }));
  assert.equal(r.verdict, VERDICT.SHORT);
  assert.match(r.reasons[0], /10-hour reset not finished.*2h 30m/);
});

test("driver mid-shift has had no reset at all", () => {
  const r = coverageFor(row(), ready({ readiness: "NOT READY", minutesLeft: null, currentStatus: "D" }));
  assert.equal(r.verdict, VERDICT.SHORT);
  assert.match(r.reasons[0], /no 10-hour reset.*D/);
});

test("cycle shorter than the block is caught", () => {
  const r = coverageFor(row(), ready({ cycleRemainingMinutes: 5 * 60 }));
  assert.equal(r.verdict, VERDICT.SHORT);
  assert.match(r.reasons[0], /cycle hours 5h 00m left, block needs 10h 00m/);
});

test("cycle at zero is caught even without block times", () => {
  const r = coverageFor(row({ scheduledFinal: "" }), ready({ cycleRemainingMinutes: 0 }));
  assert.equal(r.verdict, VERDICT.SHORT);
  assert.match(r.reasons[0], /cycle hours exhausted/);
});

test("drive time shorter than the block is caught", () => {
  const r = coverageFor(row(), ready({ drivingMinutes: 4 * 60 }));
  assert.match(r.reasons[0], /drive time 4h 00m left/);
});

// A 12h block cannot be 12h of driving: the limit is 11h. Comparing the raw
// block length against the drive clock would flag every long tour.
test("a rested driver is not flagged on a block longer than the 11h drive limit", () => {
  const long = row({ requestedStart: "06:30", scheduledFinal: "19:30" }); // 13h
  assert.equal(coverageFor(long, ready()).verdict, VERDICT.OK);
});

test("shift clock is capped at 14h the same way", () => {
  const veryLong = row({ requestedStart: "06:30", scheduledFinal: "22:30" }); // 16h
  const r = coverageFor(veryLong, ready());
  // Cycle still has to cover the whole 16h; the capped clocks must not complain.
  assert.ok(!r.reasons.some((x) => /drive time|shift time/.test(x)), r.reasons.join(" | "));
});

test("cycle is NOT capped — every block minute comes off it", () => {
  const long = row({ requestedStart: "06:30", scheduledFinal: "19:30" }); // 13h
  const r = coverageFor(long, ready({ cycleRemainingMinutes: 12 * 60 }));
  assert.equal(r.verdict, VERDICT.SHORT);
  assert.match(r.reasons[0], /cycle hours 12h 00m left, block needs 13h 00m/);
});

test("a short drive clock is still caught on a long block", () => {
  const long = row({ requestedStart: "06:30", scheduledFinal: "19:30" }); // 13h
  const r = coverageFor(long, ready({ drivingMinutes: 5 * 60 }));
  assert.match(r.reasons.join(" "), /drive time 5h 00m left, block needs 11h 00m/);
});

test("generational suffixes still match", () => {
  const idx = buildDriverIndex([ready({ id: "g3", driverName: "Angel Gutierrez" })]);
  assert.equal(matchDriver(idx, "Angel Gutierrez JR").driver.id, "g3");
  assert.equal(matchDriver(idx, "Angel Gutierrez III").driver.id, "g3");
});

test("a two-token name that ends in a suffix word is not truncated away", () => {
  const idx = buildDriverIndex([ready({ id: "g9", driverName: "Marcus Jr" })]);
  assert.equal(matchDriver(idx, "Marcus Jr").driver.id, "g9");
});

test("shift time shorter than the block is caught", () => {
  const r = coverageFor(row(), ready({ workdayMinutes: 3 * 60 }));
  assert.match(r.reasons[0], /shift time 3h 00m left/);
});

test("every failing clock is reported, not just the first", () => {
  const r = coverageFor(row(), ready({ cycleRemainingMinutes: 60, drivingMinutes: 60, workdayMinutes: 60 }));
  assert.equal(r.reasons.length, 3);
});

test("healthy clocks but no block times is PARTIAL, not OK", () => {
  const r = coverageFor(row({ scheduledFinal: "" }), ready());
  assert.equal(r.verdict, VERDICT.PARTIAL);
  assert.match(r.reasons[0], /block length could not be checked/);
});

test("a null clock is not treated as zero", () => {
  const r = coverageFor(row(), ready({ drivingMinutes: null }));
  assert.equal(r.verdict, VERDICT.OK);
});

test("block over midnight is measured against the clocks correctly", () => {
  const overnight = row({ requestedStart: "20:30", scheduledFinal: "04:30" }); // 8h
  assert.equal(coverageFor(overnight, ready({ cycleRemainingMinutes: 9 * 60 })).verdict, VERDICT.OK);
  assert.equal(coverageFor(overnight, ready({ cycleRemainingMinutes: 7 * 60 })).verdict, VERDICT.SHORT);
});

// --- whole day ---
test("coverageForRows keys by row id and explains a missed match", () => {
  const rows = [row(), row({ id: "r2", driverAssigned: "Ghost Driver" })];
  const out = coverageForRows(rows, [ready()]);
  assert.equal(out.r1.verdict, VERDICT.OK);
  assert.equal(out.r2.verdict, VERDICT.UNKNOWN);
  assert.match(out.r2.reasons[0], /no Geotab driver matches/);
});

test("an empty fleet makes every row UNKNOWN rather than OK", () => {
  const out = coverageForRows([row()], []);
  assert.equal(out.r1.verdict, VERDICT.UNKNOWN);
});

// --- the alert a SHORT verdict becomes ---
test("alert names the driver, the block and every reason", () => {
  const r = coverageFor(row({ blockId: "B-123" }), ready({ cycleRemainingMinutes: 60, drivingMinutes: 60 }));
  const a = coverageAlert("Triple J", row({ blockId: "B-123" }), r);
  assert.match(a.title, /Not enough HOS .* Steven Frederick/);
  assert.match(a.body, /B-123 starting 08:30/);
  for (const reason of r.reasons) assert.ok(a.telegramText.includes(reason), `missing: ${reason}`);
  assert.match(a.telegramText, /Block length: 10h 00m/);
  assert.match(a.telegramText, /Account: Triple J/);
  assert.ok(!a.telegramText.includes("null"), a.telegramText);
});

test("alert copes with a block whose times are missing", () => {
  const bare = row({ blockId: "", requestedStart: "", scheduledFinal: "" });
  const r = coverageFor(bare, ready({ cycleRemainingMinutes: 0 }));
  const a = coverageAlert("Triple J", bare, r);
  assert.match(a.body, /unknown block/);
  assert.ok(!a.telegramText.includes("Block length:"), a.telegramText);
  assert.ok(!a.telegramText.includes("null"), a.telegramText);
});

test("each alert is tagged per row so one driver cannot bury another", () => {
  const r = coverageFor(row(), ready({ cycleRemainingMinutes: 0 }));
  assert.equal(coverageAlert("X", row({ id: "r9" }), r).tag, "hos-coverage-r9");
});

console.log(`${pass} passed`);
