// node test-hos-phase.mjs
// The time-aware half: a driver already on their block is not a problem, and a
// driver who still has to reset before a later block might be.
import assert from "node:assert/strict";
import { VERDICT, PHASE, coverageFor, blockWindow, zonedToEpoch } from "./hos-coverage.mjs";

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass += 1; }
  catch (e) { console.error(`FAIL: ${name}\n  ${e.message}`); process.exitCode = 1; }
};

const DATE = "2026-11-05";
const at = (hhmm) => new Date(zonedToEpoch(DATE, hhmm));
const row = (over = {}) => ({
  id: "r1", dailyDate: DATE, driverAssigned: "Steven Frederick",
  blockId: "B-1", requestedStart: "08:30", scheduledFinal: "18:30", ...over,
});
const driving = (over = {}) => ({
  id: "d1", driverName: "Steven Frederick", readiness: "NOT READY", currentStatus: "D",
  minutesLeft: null, cycleRemainingMinutes: 30 * 60, drivingMinutes: 6 * 60, workdayMinutes: 9 * 60,
  ...over,
});
const resting = (left, over = {}) => ({
  id: "d1", driverName: "Steven Frederick", readiness: "NOT READY", currentStatus: "SB",
  minutesLeft: left, cycleRemainingMinutes: 30 * 60, drivingMinutes: 2 * 60, workdayMinutes: 3 * 60,
  ...over,
});
const rested = (over = {}) => ({
  id: "d1", driverName: "Steven Frederick", readiness: "READY", currentStatus: "OFF",
  minutesLeft: 0, cycleRemainingMinutes: 30 * 60, drivingMinutes: 11 * 60, workdayMinutes: 14 * 60,
  ...over,
});

// --- timezone + phase ---
test("recap wall-clock resolves through the operation's timezone", () => {
  assert.equal(new Date(zonedToEpoch(DATE, "08:30")).toISOString(), "2026-11-05T13:30:00.000Z");
});

test("phases follow the clock", () => {
  const r = row();
  assert.equal(blockWindow(r, { now: at("06:00") }).phase, PHASE.UPCOMING);
  assert.equal(blockWindow(r, { now: at("12:00") }).phase, PHASE.RUNNING);
  assert.equal(blockWindow(r, { now: at("20:00") }).phase, PHASE.DONE);
});

test("a row with no date cannot be placed in time", () => {
  assert.equal(blockWindow({ requestedStart: "08:30", scheduledFinal: "18:30" }).phase, PHASE.UNSCHEDULED);
});

// --- THE BUG: a driver mid-block is not a fault ---
test("driver actively driving their own block is NOT flagged", () => {
  // 12:00, so 6h30m of the block still to run, and 8h of drive to do it with.
  const r = coverageFor(row(), driving({ drivingMinutes: 8 * 60, workdayMinutes: 10 * 60 }), { now: at("12:00") });
  assert.equal(r.verdict, VERDICT.OK, r.reasons.join(" | "));
  assert.ok(!r.reasons.some((x) => /reset/.test(x)), "must not demand a reset mid-block");
});

test("mid-block, clocks are judged against what is LEFT, not the whole block", () => {
  // 15:00, so 3h30m left. 4h of drive is enough even though the block was 10h.
  const r = coverageFor(row(), driving({ drivingMinutes: 4 * 60 }), { now: at("15:00") });
  assert.equal(r.verdict, VERDICT.OK, r.reasons.join(" | "));
});

test("mid-block driver who will run out before the end IS flagged", () => {
  // 15:00, 3h30m to run, only 1h of drive left.
  const r = coverageFor(row(), driving({ drivingMinutes: 60 }), { now: at("15:00") });
  assert.equal(r.verdict, VERDICT.SHORT);
  assert.match(r.reasons.join(" "), /drive time 1h 00m left, needs 3h 30m to finish the block/);
});

test("a finished block says nothing at all", () => {
  const r = coverageFor(row(), driving({ drivingMinutes: 0 }), { now: at("20:00") });
  assert.equal(r.verdict, VERDICT.DONE);
  assert.deepEqual(r.reasons, []);
});

// --- upcoming blocks ---
test("still driving with a block too soon for a reset is flagged", () => {
  // Block at 08:30, now 06:00 — 2h30m away, nowhere near 10 hours.
  const r = coverageFor(row(), driving(), { now: at("06:00") });
  assert.equal(r.verdict, VERDICT.SHORT);
  assert.match(r.reasons[0], /still D — a 10-hour reset cannot finish before the 08:30 start/);
});

test("still driving but with room to reset is not a failure, just a warning", () => {
  // Block at 08:30 tomorrow-ish: 20h away, so 10h off still fits.
  const r = coverageFor(row({ requestedStart: "08:30" }), driving(), { now: at("08:00") });
  // 30 minutes to start -> cannot reset. Use a far earlier 'now' instead:
  const far = coverageFor(row(), driving(), { now: new Date(zonedToEpoch("2026-11-04", "12:00")) });
  assert.equal(far.verdict, VERDICT.OK, far.reasons.join(" | "));
  assert.match(far.notes[0], /must go off duty within/);
  assert.equal(r.verdict, VERDICT.SHORT); // the near case still fails
});

test("rest that finishes before the start is fine", () => {
  // 06:00, block 08:30 (150 min away), 60 minutes of rest left.
  const r = coverageFor(row(), resting(60), { now: at("06:00") });
  assert.equal(r.verdict, VERDICT.OK, r.reasons.join(" | "));
});

test("rest that finishes after the start is flagged with both numbers", () => {
  const r = coverageFor(row(), resting(300), { now: at("06:00") });
  assert.equal(r.verdict, VERDICT.SHORT);
  assert.match(r.reasons[0], /needs 5h 00m more but the block starts in 2h 30m/);
});

test("a driver who will reset before the start is not judged on stale clocks", () => {
  // 2h of drive left now, but a 60-minute rest completes before the start, so
  // the drive clock will be back to 11h. Only cycle should be considered.
  const r = coverageFor(row(), resting(60, { drivingMinutes: 2 * 60, workdayMinutes: 2 * 60 }), { now: at("06:00") });
  assert.equal(r.verdict, VERDICT.OK, r.reasons.join(" | "));
});

test("but cycle still counts, because a 10-hour reset does not restore it", () => {
  const r = coverageFor(row(), resting(60, { cycleRemainingMinutes: 4 * 60 }), { now: at("06:00") });
  assert.equal(r.verdict, VERDICT.SHORT);
  assert.match(r.reasons[0], /cycle hours 4h 00m left, needs 10h 00m for the block/);
});

// --- cooldown signature ---
test("signature is stable as the countdown ticks", () => {
  const a = coverageFor(row(), driving({ drivingMinutes: 60 }), { now: at("15:00") });
  const b = coverageFor(row(), driving({ drivingMinutes: 55 }), { now: at("15:10") });
  assert.notEqual(a.reasons[0], b.reasons[0], "wording should move");
  assert.equal(a.signature, b.signature, "signature must not");
});

test("signature changes when a different clock fails", () => {
  const a = coverageFor(row(), driving({ drivingMinutes: 60 }), { now: at("15:00") });
  const b = coverageFor(row(), driving({ cycleRemainingMinutes: 60 }), { now: at("15:00") });
  assert.notEqual(a.signature, b.signature);
});

test("overnight block running past midnight stays RUNNING", () => {
  const overnight = row({ requestedStart: "22:30", scheduledFinal: "06:30" });
  const win = blockWindow(overnight, { now: new Date(zonedToEpoch("2026-11-06", "02:00")) });
  assert.equal(win.phase, PHASE.RUNNING);
  assert.equal(win.toEnd, 270);
});

console.log(`${pass} passed`);
