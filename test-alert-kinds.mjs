// Run with:  node test-alert-kinds.mjs
// The extension posts free text to /api/ingest/alert. Getting the kind wrong
// puts a bobtail under "Everything else" on the board; getting the severity
// wrong colours a critical alert the same as a status change.
import { classifyAlert, kindLabel, kindGroup, ALERT_KINDS } from "./alert-kinds.mjs";

let failed = 0;
const ok = (label, cond) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failed += 1;
};
const kindOf = (title, body = "") => classifyAlert({ title, body }).kind;
const sevOf = (title, body = "") => classifyAlert({ title, body }).severity;

console.log("--- real wording the extension actually sends");
ok("bobtail", kindOf("Bobtail not cleared", "Truck 124091 at ATL40 for 31 min") === "bobtail");
ok("reset, long form", kindOf("Reset not finished before the tour", "He resets by 08:20 - 2h35m too late") === "hos-reset");
ok("reset, no-rest form", kindOf("No 10-hour reset running before the tour", "ON now") === "hos-reset");
ok("off duty at a stop", kindOf("\u{1f7e5} Off duty at a stop - John Smith") === "tour-offduty");
ok("stopped outside a site", kindOf("\u{1f6d1} Stopped outside a site - Rick Roe") === "tour-stopped");
ok("HOS critical", kindOf("\u{1f6a8} HOS CRITICAL - John Smith", "Driving runs out in 25 min") === "hos-risk");
ok("HOS 20 min", kindOf("⛔ HOS 20 MIN - John Smith") === "hos-risk");
ok("arrival", kindOf("Driver arrived at MGE45", "Check-in 14:45") === "arrival");
ok("departure", kindOf("Driver departed GSP3", "03:58") === "departure");
ok("late", kindOf("Late to stop 2", "42 min behind plan") === "late");
ok("drowsiness", kindOf("Drowsiness detected", "severity high") === "netradyne");
ok("roadside parking", kindOf("Roadside parking event") === "netradyne");
ok("watch failure", kindOf("Reset watch cannot read HOS", "Invalid or missing API key") === "system");

console.log("\n--- the order of the patterns matters");
// A bobtail message mentioning the yard must not read as an arrival, and a
// reset warning must not read as a plain HOS clock alert.
ok("bobtail beats arrival", kindOf("Bobtail not cleared", "arrived at the yard and never cleared") === "bobtail");
ok("reset beats hos-risk", kindOf("HOS: reset not finished before the tour") === "hos-reset");
ok("off-duty beats arrival", kindOf("Off duty at a stop", "arrived at MGE45 6 min ago") === "tour-offduty");

console.log("\n--- severity");
ok("bobtail is critical", sevOf("Bobtail not cleared") === "critical");
ok("reset is critical", sevOf("Reset not finished before the tour") === "critical");
ok("arrival is info", sevOf("Driver arrived at MGE45") === "info");
ok("departure is info", sevOf("Driver departed GSP3") === "info");
ok("late is a warning", sevOf("Late to stop 2") === "warning");
ok("netradyne is urgent", sevOf("Drowsiness detected") === "urgent");

console.log("\n--- an explicit kind is believed, never pattern-matched");
const explicit = classifyAlert({ title: "Driver arrived at MGE45", kind: "bobtail", severity: "critical" });
ok("kind honoured", explicit.kind === "bobtail");
ok("severity honoured", explicit.severity === "critical");
const badKind = classifyAlert({ title: "Bobtail not cleared", kind: "not-a-real-kind" });
ok("an unknown kind falls back to matching", badKind.kind === "bobtail");

console.log("\n--- nothing matches");
const unknown = classifyAlert({ title: "Something nobody planned for", body: "no pattern here" });
ok("files as other", unknown.kind === "other");
ok("and as info when not flagged critical", unknown.severity === "info");
// `critical` is what the senders already pass to drive push urgency. Honour it
// as a floor so an unrecognised but urgent alert is never coloured as info.
const unknownCritical = classifyAlert({ title: "Totally new thing", critical: true });
ok("critical flag survives an unmatched title", unknownCritical.severity === "critical");
ok("an explicit severity wins over the flag",
   classifyAlert({ title: "x", critical: true, severity: "warning" }).severity === "warning");
ok("a nonsense severity is ignored",
   classifyAlert({ title: "Driver arrived" , severity: "spicy" }).severity === "info");

console.log("\n--- empty and malformed input");
ok("no title at all", classifyAlert({}).kind === "other");
ok("undefined argument", classifyAlert().kind === "other");
ok("null title", classifyAlert({ title: null, body: null }).kind === "other");

console.log("\n--- every kind has a label and a group");
for (const kind of Object.keys(ALERT_KINDS)) {
  ok(`${kind}: labelled and grouped`, Boolean(kindLabel(kind)) && Boolean(kindGroup(kind)));
}
ok("an unknown kind still labels", kindLabel("nope") === ALERT_KINDS.other.label);

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exitCode = failed ? 1 : 0;
