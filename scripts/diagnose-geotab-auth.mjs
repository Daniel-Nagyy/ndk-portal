// Why is a Geotab login blocked? Reports the breaker's timing and the integrity
// of the stored credential WITHOUT attempting a login and WITHOUT printing any
// password. Safe to run while blocked — it never touches Geotab.
//
//   node scripts/diagnose-geotab-auth.mjs
//   node scripts/diagnose-geotab-auth.mjs <accountId> --check
//
// --check reads a password on stdin and says only whether it matches the stored
// one. Nothing is echoed, and it is read from stdin rather than argv so the
// shell cannot mangle $, !, quotes or spaces, and it stays out of shell history.
import crypto from "node:crypto";
import { listAccounts, getAccountCredentials, listAuthFailures, AUTH_FAIL_LIMIT } from "../db.mjs";

const args = process.argv.slice(2);
const check = args.includes("--check");
const wantAccount = args.find((a) => !a.startsWith("--"));

const failures = listAuthFailures().filter((r) => r.provider === "geotab");
const byRef = new Map(failures.map((r) => [r.ref, r]));

// Character classes present, so a mangled password (shell ate the $ or the
// quotes) shows up without the value ever being displayed.
function shape(secret) {
  return {
    length: secret.length,
    hasUpper: /[A-Z]/.test(secret),
    hasLower: /[a-z]/.test(secret),
    hasDigit: /[0-9]/.test(secret),
    hasSymbol: /[^A-Za-z0-9]/.test(secret),
    leadingOrTrailingSpace: secret !== secret.trim(),
    hasNewline: /[\r\n]/.test(secret),
    sha256Prefix: crypto.createHash("sha256").update(secret).digest("hex").slice(0, 12),
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  // Strip only the single trailing newline a terminal or pipe adds.
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

const accounts = listAccounts().filter((a) => !wantAccount || a.id === wantAccount);

if (check) {
  if (!wantAccount) {
    console.error("usage: node scripts/diagnose-geotab-auth.mjs <accountId> --check");
    process.exit(1);
  }
  const c = getAccountCredentials(wantAccount);
  if (!c || !c.geotab) {
    console.error(`No Geotab credentials for "${wantAccount}"`);
    process.exit(1);
  }
  process.stderr.write("Paste the password you believe is correct, then Enter:\n");
  const typed = await readStdin();
  const stored = c.geotab.password || "";
  const same = stored.length > 0 && crypto.timingSafeEqual(
    crypto.createHash("sha256").update(stored).digest(),
    crypto.createHash("sha256").update(typed).digest()
  );
  console.log(`\nStored password matches what you typed: ${same ? "YES" : "NO"}`);
  if (!same) {
    console.log("  typed ", JSON.stringify(shape(typed), null, 2).replace(/\n/g, "\n  "));
    console.log("  stored", JSON.stringify(shape(stored), null, 2).replace(/\n/g, "\n  "));
  }
  process.exit(0);
}

console.log(`Block threshold: ${AUTH_FAIL_LIMIT} rejected login(s). No login is attempted by this script.\n`);

for (const account of accounts) {
  const c = getAccountCredentials(account.id);
  const g = (c && c.geotab) || {};
  const ref = `${g.server || "my.geotab.com"}|${g.database}|${g.username}`;
  const row = byRef.get(ref);

  console.log(`${account.name} (${account.id})`);
  console.log(`   database   ${g.database || "(none)"}`);
  console.log(`   username   ${g.username || "(none)"}`);

  const pw = g.password || "";
  if (!pw) {
    console.log("   password   EMPTY after decrypt — the stored value could not be read with the current");
    console.log("              APP_ENCRYPTION_KEY. This never reaches Geotab; it fails as 'Missing Geotab credentials'.");
  } else {
    const s = shape(pw);
    console.log(`   password   decrypts OK · ${s.length} chars · sha256 ${s.sha256Prefix}`);
    const flags = [];
    if (s.leadingOrTrailingSpace) flags.push("LEADING/TRAILING WHITESPACE");
    if (s.hasNewline) flags.push("CONTAINS A NEWLINE");
    if (!s.hasSymbol) flags.push("no symbols (shell may have eaten one)");
    if (flags.length) console.log(`              ⚠ ${flags.join(" · ")}`);
  }

  if (!row) {
    console.log("   breaker    no failures recorded\n");
    continue;
  }
  console.log(`   breaker    ${row.fail_count >= AUTH_FAIL_LIMIT ? "BLOCKED" : "failing"} (${row.fail_count} rejected)`);
  console.log(`   first fail ${row.first_failed_at} UTC`);
  console.log(`   last fail  ${row.last_failed_at} UTC`);
  console.log(`   last error ${row.last_error}\n`);
}

// Two independent accounts rejected within the same minute points at Geotab's
// side, not at two passwords going bad at once.
const stamps = failures.map((r) => Date.parse(r.first_failed_at + "Z")).filter(Number.isFinite);
if (stamps.length > 1) {
  const spreadSec = Math.round((Math.max(...stamps) - Math.min(...stamps)) / 1000);
  console.log(`First failures across ${stamps.length} credential(s) span ${spreadSec} second(s).`);
  if (spreadSec < 900) {
    console.log("That is simultaneous. Two separate passwords do not expire in the same minute —");
    console.log("this points at a Geotab/Amazon-side event, not at your stored credentials.");
  }
}
