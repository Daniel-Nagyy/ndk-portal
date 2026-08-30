// Inspect or update the Geotab / Netradyne credentials an account polls with,
// and see/clear the login-failure circuit breaker. Run ON the Railway container
// (railway ssh), where DB_PATH points at the production database.
//
//   node scripts/provider-creds.mjs status
//   node scripts/provider-creds.mjs set <accountId> geotab    <password>
//   node scripts/provider-creds.mjs set <accountId> netradyne <password>
//   node scripts/provider-creds.mjs unblock <accountId> [geotab|netradyne]
//
// "set" also clears that provider's block, so polling resumes immediately.
import {
  listAccounts, getAccount, getAccountCredentials, updateAccount,
  listAuthFailures, clearAuthFailure, AUTH_FAIL_LIMIT,
} from "../db.mjs";

const [cmd, accountId, provider, password] = process.argv.slice(2);
const PROVIDERS = ["geotab", "netradyne"];

// The Geotab breaker is keyed by the credential triple, not the account id.
function geotabRef(c) {
  return `${c.geotab.server || "my.geotab.com"}|${c.geotab.database}|${c.geotab.username}`;
}

function usage(msg) {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error(`Usage:
  node scripts/provider-creds.mjs status
  node scripts/provider-creds.mjs set <accountId> <geotab|netradyne> <password>
  node scripts/provider-creds.mjs unblock <accountId> [geotab|netradyne]

Accounts: ${listAccounts().map((a) => a.id).join(", ") || "(none)"}`);
  process.exit(1);
}

function status() {
  const failures = listAuthFailures();
  for (const a of listAccounts()) {
    const c = getAccountCredentials(a.id);
    const gRef = geotabRef(c);
    const gFail = failures.find((f) => f.provider === "geotab" && f.ref === gRef);
    const nFail = failures.find((f) => f.provider === "netradyne" && f.ref === a.id);
    const line = (label, set, fail) => {
      const state = !set ? "not configured"
        : !fail ? "ok"
        : fail.fail_count >= AUTH_FAIL_LIMIT ? `BLOCKED (${fail.fail_count} rejected): ${fail.last_error}`
        : `${fail.fail_count}/${AUTH_FAIL_LIMIT} failed: ${fail.last_error}`;
      console.log(`   ${label.padEnd(10)} ${state}`);
    };
    console.log(`\n${a.name} (${a.id})`);
    console.log(`   geotab db  ${c.geotab.database || "-"} / user ${c.geotab.username || "-"}`);
    console.log(`   netradyne  ${c.netradyne.email || "-"}`);
    line("geotab", c.geotab.database && c.geotab.username && c.geotab.password, gFail);
    line("netradyne", c.netradyne.email && c.netradyne.password, nFail);
  }
  console.log(`\nBlock threshold: ${AUTH_FAIL_LIMIT} rejected login(s). Passwords are never printed.`);
}

if (!cmd || cmd === "status") { status(); process.exit(0); }

if (cmd === "set") {
  if (!accountId || !provider || !password) usage("set needs <accountId> <provider> <password>");
  if (!PROVIDERS.includes(provider)) usage(`provider must be one of: ${PROVIDERS.join(", ")}`);
  const account = getAccount(accountId);
  if (!account) usage(`no account with id "${accountId}"`);
  const before = getAccountCredentials(accountId);

  updateAccount(accountId, provider === "geotab" ? { geotabPassword: password } : { netradynePassword: password });
  clearAuthFailure(provider, provider === "geotab" ? geotabRef(before) : accountId);

  console.log(`${provider} password updated for ${account.name} (${accountId}); login block cleared.`);
  console.log("Polling retries on the next cycle. Verify with scripts/verify-geotab.mjs or verify-netradyne.mjs.");
  process.exit(0);
}

if (cmd === "unblock") {
  if (!accountId) usage("unblock needs <accountId>");
  const account = getAccount(accountId);
  if (!account) usage(`no account with id "${accountId}"`);
  const c = getAccountCredentials(accountId);
  const targets = provider ? [provider] : PROVIDERS;
  for (const p of targets) {
    if (!PROVIDERS.includes(p)) usage(`provider must be one of: ${PROVIDERS.join(", ")}`);
    clearAuthFailure(p, p === "geotab" ? geotabRef(c) : accountId);
    console.log(`${p} block cleared for ${account.name}.`);
  }
  console.log("NOTE: this only resets our counter. If the provider locked the account, unlock it there first,");
  console.log("or the next attempt fails again and re-blocks.");
  process.exit(0);
}

usage(`unknown command "${cmd}"`);
