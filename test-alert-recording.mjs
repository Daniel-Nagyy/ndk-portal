// Run with:  node test-alert-recording.mjs
//
// What gets written to the database, and what does not.
//
// Duty-status changes and arrivals are the highest-volume alerts in the system
// and are never shown on the board, so they are not stored. The thing to guard
// is that this drops the ROW and not the ALERT: they must still go out over
// Telegram exactly as before.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Stub ./db.mjs and the senders before notify.mjs imports them.
const recorded = [];
const telegrams = [];
const pushes = [];

register(
  `data:text/javascript,
  export async function resolve(spec, ctx, next) {
    if (spec.endsWith("db.mjs")) return { url: "stub:db", shortCircuit: true };
    if (spec.endsWith("web-push")) return { url: "stub:webpush", shortCircuit: true };
    if (spec === "dotenv") return { url: "stub:dotenv", shortCircuit: true };
    return next(spec, ctx);
  }
  export async function load(url, ctx, next) {
    if (url === "stub:db") return { format: "module", shortCircuit: true, source: \`
      export function recordAlert(a) { globalThis.__recorded.push(a); return { id: globalThis.__recorded.length }; }
      export function getAccountCredentials() { return { telegram: { botToken: "t", chatId: "c" } }; }
      export function getSubscriptionsForAccount() { return [{ endpoint: "e" }]; }
      export function deleteSubscriptionByEndpoint() {}
    \` };
    if (url === "stub:webpush") return { format: "module", shortCircuit: true, source: \`
      export default { setVapidDetails() {}, sendNotification: async () => { globalThis.__pushes.push(1); } };
    \` };
    if (url === "stub:dotenv") return { format: "module", shortCircuit: true, source: "export default { config() {} };" };
    return next(url, ctx);
  }`,
  pathToFileURL("./"),
);

globalThis.__recorded = recorded;
globalThis.__pushes = pushes;

globalThis.fetch = async (url, options) => {
  if (String(url).includes("api.telegram.org")) {
    telegrams.push(JSON.parse(options.body || "{}"));
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  }
  return { ok: true, status: 200, json: async () => ({}) };
};

const { notifyAccount } = await import("./notify.mjs");
const { MUTED_KINDS } = await import("./alert-kinds.mjs");

let failed = 0;
const ok = (label, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}`); if (!cond) failed++; };
const reset = () => { recorded.length = 0; telegrams.length = 0; pushes.length = 0; };

console.log("--- the muted kinds are the high-volume ones");
ok("duty-status changes are muted", MUTED_KINDS.includes("hos-status"));
ok("arrivals are muted", MUTED_KINDS.includes("arrival"));

console.log("\n--- a duty-status change is sent but not stored");
reset();
await notifyAccount("triple-j", {
  title: "HOS status — John Smith", body: "Off duty → Driving",
  kind: "hos-status", severity: "info", push: false,
  telegramText: "HOS status change",
});
ok("nothing written to the database", recorded.length === 0);
ok("but Telegram still receives it", telegrams.length === 1);

console.log("\n--- an arrival is sent but not stored");
reset();
await notifyAccount("mgi-transportation", {
  title: "Driver arrived at MGE45", body: "Check-in 14:45",
  kind: "arrival", severity: "info", push: false,
});
ok("nothing written", recorded.length === 0);
ok("Telegram still receives it", telegrams.length === 1);

console.log("\n--- everything that IS shown is still stored");
for (const [kind, severity] of [
  ["hos-risk", "critical"], ["hos-reset", "critical"], ["bobtail", "critical"],
  ["tour-offduty", "critical"], ["tour-stopped", "urgent"], ["netradyne", "urgent"],
  ["late", "warning"], ["departure", "info"], ["system", "warning"], ["other", "info"],
]) {
  reset();
  await notifyAccount("triple-j", { title: `a ${kind}`, body: "b", kind, severity });
  ok(`${kind} is recorded`, recorded.length === 1 && recorded[0].kind === kind);
}

console.log("\n--- an untagged caller still records");
// Anything that has not been given a kind yet must not vanish silently.
reset();
await notifyAccount("triple-j", { title: "legacy caller", body: "no kind given" });
ok("defaults to 'other' and is kept", recorded.length === 1 && recorded[0].kind === "other");

console.log("\n--- recording never blocks the alert");
reset();
const { recordAlert } = await import("./db.mjs");
const original = globalThis.__recorded;
globalThis.__recorded = { push() { throw new Error("disk full"); } };
await notifyAccount("triple-j", { title: "db is broken", body: "x", kind: "bobtail", severity: "critical" });
ok("Telegram still goes out when the write throws", telegrams.length === 1);
globalThis.__recorded = original;

console.log("\n--- volume saved");
// Rough shape of a day: status changes dominate, and they are now free.
const perDay = { "hos-status": 500, arrival: 180, "hos-risk": 25, bobtail: 8, "tour-stopped": 12 };
const BYTES = 194;
const stored = Object.entries(perDay)
  .filter(([k]) => !MUTED_KINDS.includes(k))
  .reduce((n, [, v]) => n + v, 0);
const all = Object.values(perDay).reduce((a, b) => a + b, 0);
console.log(`   rows/day before: ${all} (${((all * BYTES) / 1024).toFixed(0)}KB)`);
console.log(`   rows/day now   : ${stored} (${((stored * BYTES) / 1024).toFixed(0)}KB)`);
console.log(`   over 21 days   : ${((stored * BYTES * 21) / 1024 / 1024).toFixed(2)}MB vs ${((all * BYTES * 21) / 1024 / 1024).toFixed(2)}MB`);
ok("the stored share is a small fraction of the traffic", stored / all < 0.15);

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exitCode = failed ? 1 : 0;
