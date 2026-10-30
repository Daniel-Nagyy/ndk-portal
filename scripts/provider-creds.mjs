// Inspect or update the Geotab / Netradyne credentials an account polls with,
// and see/clear the login-failure circuit breaker. Run ON the Railway container
// (railway ssh), where DB_PATH points at the production database.
//
//   node scripts/provider-creds.mjs status
//   node scripts/provider-creds.mjs set <accountId> geotab    <password> [--username=<user>]
//   node scripts/provider-creds.mjs set <accountId> netradyne <password> [--email=<login>]
//   node scripts/provider-creds.mjs unblock <accountId> [geotab|netradyne]
//
// "set" also clears that provider's block, so polling resumes immediately.
//
// The login identifier (--email / --username) only has to be given the first
// time an account's provider is configured, or when it changes; otherwise the
// stored one is kept. A password alone is not enough for an account that has
// never had a login set -- the poller needs both, so "set" refuses rather than
// storing half a credential that fails on the next cycle and trips the breaker.
import {
  listAccounts, getAccount, getAccountCredentials, updateAccount,
  listAuthFailures, clearAuthFailure, AUTH_FAIL_LIMIT,
} from "../db.mjs";

const argv = process.argv.slice(2);
// Pull the --flags out first so they can sit anywhere after the command.
const flags = {};
const positional = [];
for (const arg of argv) {
  const match = /^--([a-z]+)=(.*)$/.exec(arg);
  if (match) flags[match[1]] = match[2];
  else positional.push(arg);
}
const [cmd, accountId, provider, password] = positional;
const PROVIDERS = ["geotab", "netradyne"];

// The Geotab breaker is keyed by the credential triple, not the account id.
function geotabRef(c) {
  return `${c.geotab.server || "my.geotab.com"}|${c.geotab.database}|${c.geotab.username}`;
}

function usage(msg) {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error(`Usage:
  node scripts/provider-creds.mjs status
  node scripts/provider-creds.mjs set <accountId> geotab    <password> [--username=<user>]
  node scripts/provider-creds.mjs set <accountId> netradyne <password> [--email=<login>]
  node scripts/provider-creds.mjs unblock <accountId> [geotab|netradyne]

Quote the password in single quotes -- characters like < % $ ! are shell syntax
otherwise, and a mangled password counts as a rejected login.

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

  const isGeotab = provider === "geotab";
  const loginFlag = isGeotab ? "username" : "email";
  const login = flags[loginFlag];
  const storedLogin = isGeotab ? before.geotab.username : before.netradyne.email;

  if (flags[isGeotab ? "email" : "username"]) {
    usage(`${provider} takes --${loginFlag}=, not --${isGeotab ? "email" : "username"}=`);
  }
  // Refuse a password-only set on an account that has no login stored. Saving
  // one half of a credential leaves the poller guaranteed to fail, and two
  // failures trip the circuit breaker -- which is what locks a real account out.
  if (!login && !storedLogin) {
    usage(
      `${account.name} has no ${provider} ${loginFlag} stored, so a password alone cannot work.\n`
      + `  Pass it: node scripts/provider-creds.mjs set ${accountId} ${provider} '<password>' --${loginFlag}=<value>`
    );
  }

  const update = isGeotab ? { geotabPassword: password } : { netradynePassword: password };
  if (login) {
    if (isGeotab) update.geotabUsername = login;
    else update.netradyneEmail = login;
  }

  updateAccount(accountId, update);
  // Clear the breaker AFTER the write, and for geotab against the ref the
  // failures were recorded under (the pre-update triple), not the new one.
  clearAuthFailure(provider, isGeotab ? geotabRef(before) : accountId);
  if (isGeotab && login && login !== storedLogin) {
    // A changed username means a different breaker key; clear the new one too.
    clearAuthFailure(provider, geotabRef(getAccountCredentials(accountId)));
  }

  const changedLogin = login && login !== storedLogin;
  console.log(`${provider} password updated for ${account.name} (${accountId}); login block cleared.`);
  console.log(`   ${loginFlag}: ${login || storedLogin}${changedLogin ? " (changed)" : " (unchanged)"}`);
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
